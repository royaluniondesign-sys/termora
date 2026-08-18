import express, { type Express } from 'express';
import rateLimit from 'express-rate-limit';
import { createServer as createNetServer, createConnection } from 'node:net';
import { createServer, type Server as HttpServer } from 'node:http';
import { WebSocketServer } from 'ws';
import { join } from 'node:path';
import { existsSync } from 'node:fs';
import { hostname } from 'node:os';
import {
  generateBootstrapToken,
  verifyBootstrapToken,
  verifyStaticToken,
  createSessionJWT,
} from './auth.js';
import { createSSERouter } from './sse-handler.js';
import { getTunnelInfo } from './tunnel.js';
import type { DbStatements } from './db.js';
import type { AgentConfig } from './config.js';

export interface ServerContext {
  app: Express;
  httpServer: HttpServer;
  wss: WebSocketServer;
}

/**
 * Creates and configures the Express app, HTTP server, and WebSocketServer.
 * Mounts auth routes, SSE routes, health check, and static file serving.
 */
export function createAppServer(
  config: AgentConfig,
  statements: DbStatements,
): ServerContext {
  const app = express();

  // Trust proxy headers only from the local tunnel process (cloudflared, ngrok,
  // SSH) — it connects over loopback and appends the real client IP to
  // X-Forwarded-For. Trusting the whole chain would let a remote client send an
  // arbitrary X-Forwarded-For and rotate it to bypass the auth rate limit.
  app.set('trust proxy', 'loopback');

  // Middleware — CORS for development
  app.use((_req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    if (_req.method === 'OPTIONS') {
      res.sendStatus(204);
      return;
    }
    next();
  });
  app.use(express.json());

  // Health check
  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // Connection info — returns tunnel URL/method and auth URL for sharing.
  // The static token is already visible in the QR/terminal output; returning it
  // here allows authenticated clients to copy and share the one-click auth URL.
  app.get('/api/info', (_req, res) => {
    const tunnel = getTunnelInfo();
    const authUrl = tunnel?.url
      ? `${tunnel.url}/?token=${config.staticToken}`
      : null;
    res.json({
      tunnelUrl: tunnel?.url ?? null,
      tunnelMethod: tunnel?.method ?? null,
      authUrl,
      machineName: hostname(),
      version: '0.1.0',
    });
  });

  // Rate limiting on auth endpoints (10 attempts per 15 min per IP)
  const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 10,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    message: { error: 'Too many authentication attempts, try again later' },
  });

  // Auth routes
  mountAuthRoutes(app, config, statements, authLimiter);

  // SSE routes
  const sseRouter = createSSERouter();
  app.use('/api/sse', sseRouter);

  // Static file serving (web dist)
  const webDistPath = join(import.meta.dirname, '..', '..', 'web', 'dist');
  if (existsSync(webDistPath)) {
    app.use(express.static(webDistPath));
    // SPA fallback: serve index.html for non-API routes
    app.get('*', (req, res, next) => {
      if (req.path.startsWith('/api')) {
        next();
        return;
      }
      const indexPath = join(webDistPath, 'index.html');
      if (existsSync(indexPath)) {
        res.sendFile(indexPath);
      } else {
        next();
      }
    });
  }

  // Create HTTP server
  const httpServer = createServer(app);

  // Create WebSocket server with native ping to detect dead connections.
  // Clients that don't respond to a ping within 30s are terminated.
  const wss = new WebSocketServer({ server: httpServer });

  const WS_PING_INTERVAL = 30_000;
  const pingInterval = setInterval(() => {
    for (const ws of wss.clients) {
      if ((ws as unknown as { isAlive?: boolean }).isAlive === false) {
        ws.terminate();
        continue;
      }
      (ws as unknown as { isAlive: boolean }).isAlive = false;
      ws.ping();
    }
  }, WS_PING_INTERVAL);

  wss.on('close', () => clearInterval(pingInterval));

  return { app, httpServer, wss };
}

function mountAuthRoutes(
  app: Express,
  config: AgentConfig,
  statements: DbStatements,
  limiter: ReturnType<typeof rateLimit>,
): void {
  // POST /api/auth/bootstrap — exchange a bootstrap token for a JWT
  app.post('/api/auth/bootstrap', limiter, async (req, res) => {
    try {
      const { token } = req.body as { token?: string };

      if (!token || typeof token !== 'string') {
        res.status(400).json({ error: 'Missing or invalid token' });
        return;
      }

      // Accept either the persistent static token (no expiry) or a bootstrap token (5-min TTL)
      const valid = verifyStaticToken(token, config.staticToken)
        || verifyBootstrapToken(statements, token);
      if (!valid) {
        res.status(401).json({ error: 'Invalid or expired bootstrap token' });
        return;
      }

      const jwt = await createSessionJWT(
        { authMethod: 'bootstrap' },
        config.jwtSecret,
      );

      res.json({ token: jwt });
    } catch (err) {
      console.error('Bootstrap auth error:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

}

/**
 * Picks the port the tunnel should forward to.
 *
 * WEB_PORT exists for dev, where the tunnel must hit the Vite dev server rather
 * than the agent. In production nothing listens there, so a WEB_PORT left over
 * in .env would publish a tunnel to a dead port. Fall back to the agent port
 * unless something is genuinely serving the web port.
 */
export async function resolveTunnelPort(
  webPort: number,
  agentPort: number,
): Promise<number> {
  if (webPort === agentPort) return agentPort;
  return (await isPortServing(webPort)) ? webPort : agentPort;
}

/**
 * Checks whether something actually accepts connections on a local port.
 * Unlike a bind probe, this sees servers bound only to loopback.
 */
function isPortServing(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = createConnection({ port, host: '127.0.0.1' });
    const done = (serving: boolean) => {
      socket.destroy();
      resolve(serving);
    };
    socket.setTimeout(500);
    socket.once('connect', () => done(true));
    socket.once('timeout', () => done(false));
    socket.once('error', () => done(false));
  });
}

/**
 * Checks if a port is available by briefly binding a TCP server to it.
 */
function isPortFree(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const srv = createNetServer();
    srv.once('error', () => resolve(false));
    srv.listen(port, () => {
      srv.close(() => resolve(true));
    });
  });
}

/**
 * Finds the first free port starting from `port`, trying up to 10 consecutive ports.
 */
async function findFreePort(port: number): Promise<number> {
  for (let p = port; p < port + 10; p++) {
    if (await isPortFree(p)) return p;
    console.log(`  Port ${String(p)} in use, trying ${String(p + 1)}...`);
  }
  throw new Error(`No free port found in range ${String(port)}-${String(port + 9)}`);
}

/**
 * Starts the HTTP server on the configured port.
 * If the port is busy, tries up to 10 consecutive ports.
 * Returns the actual port the server is listening on.
 */
export async function startServer(
  httpServer: HttpServer,
  port: number,
): Promise<number> {
  const freePort = await findFreePort(port);
  return new Promise((resolve) => {
    httpServer.listen(freePort, () => {
      resolve(freePort);
    });
  });
}

export { generateBootstrapToken };
