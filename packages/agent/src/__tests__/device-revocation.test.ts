import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { rmSync } from 'node:fs';
import { randomBytes } from 'node:crypto';
import type { AddressInfo } from 'node:net';
import WebSocket from 'ws';
import { createAppServer } from '../server.js';
import { setupWebSocketHandler } from '../ws-handler.js';
import { PTYManager } from '../pty-manager.js';
import { initDatabase } from '../db.js';
import { createSessionJWT } from '../auth.js';
import type { AgentConfig } from '../config.js';

/**
 * A device's JWT signature alone used to be sufficient for the life of the
 * token (7 days) — deleting its row from `sessions` (what "revoke device"
 * does) had no actual effect on the WebSocket, which only ever checked the
 * signature. These tests pin the fix end-to-end over a real socket.
 */

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

describe('WebSocket authorization respects device revocation', () => {
  const dbPath = join(tmpdir(), `termora-revoke-${randomBytes(6).toString('hex')}.db`);
  const config = makeConfig(dbPath);
  const { db, statements } = initDatabase(dbPath);
  const { httpServer, wss } = createAppServer(config, statements);
  const ptyManager = new PTYManager({ tmuxEnabled: false, tmuxConfPath: null, dbStatements: statements });
  setupWebSocketHandler(wss, ptyManager, config.jwtSecret, statements);
  let wsUrl = '';

  beforeAll(async () => {
    await new Promise<void>((resolve) => httpServer.listen(0, '127.0.0.1', resolve));
    const { port } = httpServer.address() as AddressInfo;
    wsUrl = `ws://127.0.0.1:${port}`;
  });

  afterAll(async () => {
    ptyManager.destroyAll();
    await new Promise<void>((resolve) => httpServer.close(() => resolve()));
    db.close();
    for (const suffix of ['', '-wal', '-shm']) rmSync(`${dbPath}${suffix}`, { force: true });
  });

  // The WS handshake completes (firing 'open') before the server's async
  // JWT + revocation check runs, so a rejection arrives as a 'close' shortly
  // *after* 'open' rather than instead of it. Wait a beat past 'open' to
  // catch that follow-up close before deciding the connection survived.
  function connect(token: string): Promise<{ ws: WebSocket; closeCode: number | null }> {
    return new Promise((resolve, reject) => {
      const ws = new WebSocket(`${wsUrl}/?token=${token}`);
      let closeCode: number | null = null;
      const timer = setTimeout(() => reject(new Error('connect timeout')), 3000);
      ws.once('close', (code) => { closeCode = code; });
      ws.once('open', () => {
        setTimeout(() => {
          clearTimeout(timer);
          resolve({ ws, closeCode });
        }, 200);
      });
      ws.once('error', () => { /* surfaced via close */ });
    });
  }

  it('accepts a token whose session row exists', async () => {
    const { token, jti } = await createSessionJWT({ authMethod: 'bootstrap' }, config.jwtSecret);
    statements.insertSession.run(jti, jti, 'Test device');

    const { ws, closeCode } = await connect(token);
    expect(closeCode).toBeNull();
    expect(ws.readyState).toBe(WebSocket.OPEN);
    ws.close();
  });

  it('rejects a structurally valid token whose session was revoked', async () => {
    const { token, jti } = await createSessionJWT({ authMethod: 'bootstrap' }, config.jwtSecret);
    statements.insertSession.run(jti, jti, 'Test device');
    statements.deleteSession.run(jti); // "Revoke" from Settings > Devices

    const { closeCode } = await connect(token);
    expect(closeCode).toBe(4001);
  });

  it('rejects a token whose session was never recorded at all', async () => {
    // A JWT that never went through bootstrap's insertSession — should not
    // slip through just because the signature is valid.
    const { token } = await createSessionJWT({ authMethod: 'bootstrap' }, config.jwtSecret);

    const { closeCode } = await connect(token);
    expect(closeCode).toBe(4001);
  });

  it('updates last_seen when the session connects', async () => {
    const { token, jti } = await createSessionJWT({ authMethod: 'bootstrap' }, config.jwtSecret);
    statements.insertSession.run(jti, jti, 'Test device');
    const before = statements.getSession.get(jti)?.last_seen;

    await new Promise((r) => setTimeout(r, 1100)); // SQLite datetime() has 1s resolution
    const { ws } = await connect(token);
    const after = statements.getSession.get(jti)?.last_seen;

    expect(after).not.toBe(before);
    ws.close();
  });
});
