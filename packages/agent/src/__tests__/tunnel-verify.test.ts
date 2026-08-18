import { describe, it, expect, afterEach } from 'vitest';
import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { verifyTunnelUrl } from '../tunnel.js';

/**
 * A tunnel process can report a URL it never actually serves — cloudflared
 * quick tunnels print a hostname and register a connection while the edge
 * still 404s every request. createTunnel used to accept any URL that did not
 * throw, so the agent published a dead URL and never fell back.
 */

let server: Server | undefined;

afterEach(async () => {
  if (server) {
    await new Promise<void>((resolve) => server?.close(() => resolve()));
    server = undefined;
  }
});

async function serve(handler: (path: string) => number): Promise<string> {
  server = createServer((req, res) => {
    res.statusCode = handler(req.url ?? '');
    res.end();
  });
  await new Promise<void>((resolve) => server?.listen(0, '127.0.0.1', resolve));
  const { port } = server.address() as AddressInfo;
  return `http://127.0.0.1:${port}`;
}

describe('verifyTunnelUrl', () => {
  it('accepts a URL whose health endpoint answers 200', async () => {
    const url = await serve(() => 200);
    await expect(verifyTunnelUrl(url)).resolves.toBe(true);
  });

  it('rejects a URL that answers 404 — reported but not routed', async () => {
    const url = await serve(() => 404);
    await expect(verifyTunnelUrl(url)).resolves.toBe(false);
  });

  it('rejects a URL that only serves paths other than the health check', async () => {
    const url = await serve((path) => (path === '/api/health' ? 502 : 200));
    await expect(verifyTunnelUrl(url)).resolves.toBe(false);
  });

  it('rejects an unreachable URL without throwing', async () => {
    // Port that nothing is bound to.
    const dead = await serve(() => 200);
    await new Promise<void>((resolve) => server?.close(() => resolve()));
    server = undefined;
    await expect(verifyTunnelUrl(dead)).resolves.toBe(false);
  });

  it('gives up after the timeout instead of hanging', async () => {
    server = createServer(() => { /* never responds */ });
    await new Promise<void>((resolve) => server?.listen(0, '127.0.0.1', resolve));
    const { port } = server.address() as AddressInfo;
    await expect(verifyTunnelUrl(`http://127.0.0.1:${port}`, 300)).resolves.toBe(false);
  });
});
