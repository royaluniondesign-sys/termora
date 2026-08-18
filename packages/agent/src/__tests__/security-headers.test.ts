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
 * The agent has no legitimate cross-origin use case: the SPA is always served
 * same-origin (by the agent itself in production, by Vite's server-side proxy
 * in dev). A blanket `Access-Control-Allow-Origin: *` on every response,
 * including /api/auth/bootstrap and /api/info (which returns the persistent
 * auth token embedded in the one-click URL), let any third-party page that
 * knows or guesses the tunnel URL read the response via a cross-origin fetch.
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

describe('response headers', () => {
  const dbPath = join(tmpdir(), `termora-headers-${randomBytes(6).toString('hex')}.db`);
  const { db, statements } = initDatabase(dbPath);
  const { httpServer } = createAppServer(makeConfig(dbPath), statements);
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

  it('does not grant cross-origin read access to any response', async () => {
    const res = await fetch(`${baseUrl}/api/info`, {
      headers: { Origin: 'https://evil.example' },
    });
    expect(res.headers.get('access-control-allow-origin')).toBeNull();
  });

  it('still answers same-origin-style requests (no Origin header) normally', async () => {
    const res = await fetch(`${baseUrl}/api/health`);
    expect(res.status).toBe(200);
  });

  it('sets baseline hardening headers', async () => {
    const res = await fetch(`${baseUrl}/api/health`);
    expect(res.headers.get('x-content-type-options')).toBe('nosniff');
    expect(res.headers.get('x-frame-options')).toBe('DENY');
    expect(res.headers.get('referrer-policy')).toBe('no-referrer');
  });
});
