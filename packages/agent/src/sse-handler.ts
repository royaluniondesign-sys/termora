import type { Request, Response, Router } from 'express';
import { Router as createRouter } from 'express';

/**
 * Stored completed auth events, keyed by pendingId.
 * This solves the race condition where auth completes before
 * the client starts listening for SSE events.
 */
const completedAuths = new Map<string, string>();

/** Active SSE connections waiting for auth completion, keyed by pendingId. */
const pendingListeners = new Map<string, Response>();

/** Heartbeat interval in milliseconds. */
const HEARTBEAT_INTERVAL_MS = 30_000;

/**
 * Emits an auth-complete event for a given pendingId.
 * If a client is already listening via SSE, the JWT is sent immediately.
 * Otherwise, the JWT is stored for later retrieval (stored-event pattern).
 */
export function emitAuthComplete(pendingId: string, jwt: string): void {
  const res = pendingListeners.get(pendingId);

  if (res) {
    // Client is already listening -- send the JWT immediately
    res.write(`event: auth-complete\ndata: ${JSON.stringify({ token: jwt })}\n\n`);
    res.end();
    pendingListeners.delete(pendingId);
  } else {
    // Client not yet listening -- store for later retrieval
    completedAuths.set(pendingId, jwt);

    // Auto-expire stored events after 5 minutes to prevent memory leaks
    setTimeout(() => {
      completedAuths.delete(pendingId);
    }, 5 * 60 * 1000);
  }
}

/**
 * Creates the SSE router with a single endpoint: GET /events/:pendingId.
 * The client opens this connection and waits for an auth-complete event.
 */
export function createSSERouter(): Router {
  const router = createRouter();

  router.get('/events/:pendingId', (req: Request, res: Response) => {
    const rawPendingId = req.params['pendingId'];
    const pendingId = Array.isArray(rawPendingId) ? rawPendingId[0] : rawPendingId;

    if (!pendingId) {
      res.status(400).json({ error: 'Missing pendingId' });
      return;
    }

    // Set SSE headers
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    });

    // Race condition fix: check if auth already completed before we started listening
    const storedJwt = completedAuths.get(pendingId);
    if (storedJwt) {
      completedAuths.delete(pendingId);
      res.write(`event: auth-complete\ndata: ${JSON.stringify({ token: storedJwt })}\n\n`);
      res.end();
      return;
    }

    // Register this connection as a pending listener
    pendingListeners.set(pendingId, res);

    // Heartbeat to keep the connection alive through proxies
    const heartbeat = setInterval(() => {
      res.write(': heartbeat\n\n');
    }, HEARTBEAT_INTERVAL_MS);

    // Clean up on client disconnect
    req.on('close', () => {
      clearInterval(heartbeat);
      pendingListeners.delete(pendingId);
    });
  });

  return router;
}
