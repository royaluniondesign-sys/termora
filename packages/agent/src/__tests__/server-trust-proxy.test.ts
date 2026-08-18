import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { rmSync } from 'node:fs';
import { randomBytes } from 'node:crypto';
import type { AddressInfo } from 'node:net';
import { createAppServer } from '../server.js';
import { initDatabase } from '../db.js';
import type { AgentConfig } from '../config.js';

/**
 * The agent sits behind a local tunnel (cloudflared/ngrok/ssh) that appends the
 * real client IP to X-Forwarded-For. A permissive `trust proxy` makes Express
 * pick the left-most (client-supplied) entry, letting anyone rotate that value
 * and bypass the auth rate limit. These tests pin the trusted-hop behaviour.
 */

const TUNNEL_APPENDED_IP = '203.0.113.9';
const AUTH_LIMIT = 10;

function makeConfig(dbPath: string): AgentConfig {
  return {
    port: 0,
    webPort: 0,
    jwtSecret: randomBytes(32).toString('hex'),
    staticToken: randomBytes(32).toString('base64url'),
    ngrokAuthtoken: undefined,
    ngrokStaticDomain: undefined,
    tunnelMethod: 'local',
    resendApiKey: undefined,
    dbPath,
    tmuxDisabled: true,
  };
}

describe('auth rate limiting behind a tunnel', () => {
  const dbPath = join(tmpdir(), `termora-trust-proxy-${randomBytes(6).toString('hex')}.db`);
  const { db, statements } = initDatabase(dbPath);
  const { app, httpServer } = createAppServer(makeConfig(dbPath), statements);
  let baseUrl = '';

  beforeAll(async () => {
    await new Promise<void>((resolve) => httpServer.listen(0, '127.0.0.1', resolve));
    const { port } = httpServer.address() as AddressInfo;
    baseUrl = `http://127.0.0.1:${port}`;
  });

  afterAll(async () => {
    await new Promise<void>((resolve) => httpServer.close(() => resolve()));
    db.close();
    rmSync(dbPath, { force: true });
    rmSync(`${dbPath}-wal`, { force: true });
    rmSync(`${dbPath}-shm`, { force: true });
  });

  it('does not trust the whole X-Forwarded-For chain', () => {
    expect(app.get('trust proxy fn')).toBeTypeOf('function');
    expect(app.get('trust proxy')).not.toBe(true);
  });

  it('rate limits a client that rotates the spoofable part of X-Forwarded-For', async () => {
    const attempt = (spoofed: string) =>
      fetch(`${baseUrl}/api/auth/bootstrap`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // Client-supplied value first, real IP appended by the tunnel.
          'X-Forwarded-For': `${spoofed}, ${TUNNEL_APPENDED_IP}`,
        },
        body: JSON.stringify({ token: 'wrong-token' }),
      });

    const statuses: number[] = [];
    for (let i = 0; i <= AUTH_LIMIT; i++) {
      const res = await attempt(`198.51.100.${i}`);
      statuses.push(res.status);
    }

    // First 10 attempts are rejected as bad credentials, the 11th is throttled.
    expect(statuses.slice(0, AUTH_LIMIT)).toEqual(Array(AUTH_LIMIT).fill(401));
    expect(statuses[AUTH_LIMIT]).toBe(429);
  });
});
