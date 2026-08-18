import { describe, it, expect } from 'vitest';
import { createServer as createNetServer } from 'node:net';
import type { AddressInfo } from 'node:net';
import { resolveAgentPort, DEFAULT_PORT } from '../config.js';
import { resolveTunnelPort } from '../server.js';

/**
 * README and .env.example document the agent port as TERMORA_PORT, but the
 * loader only read PORT — so a documented .env silently fell back to 4030 while
 * WEB_PORT was still honoured, publishing a tunnel to a port nothing served.
 */

describe('resolveAgentPort', () => {
  it('honours TERMORA_PORT, the documented variable', () => {
    expect(resolveAgentPort({ TERMORA_PORT: '4055' })).toBe(4055);
  });

  it('still honours PORT for backwards compatibility', () => {
    expect(resolveAgentPort({ PORT: '4066' })).toBe(4066);
  });

  it('prefers TERMORA_PORT when both are set', () => {
    expect(resolveAgentPort({ TERMORA_PORT: '4055', PORT: '4066' })).toBe(4055);
  });

  it('falls back to the default when unset or unparseable', () => {
    expect(resolveAgentPort({})).toBe(DEFAULT_PORT);
    expect(resolveAgentPort({ TERMORA_PORT: 'nonsense' })).toBe(DEFAULT_PORT);
  });
});

describe('resolveTunnelPort', () => {
  it('returns the agent port when no separate web port is configured', async () => {
    await expect(resolveTunnelPort(4030, 4030)).resolves.toBe(4030);
  });

  it('returns the web port when a dev server is actually listening on it', async () => {
    const devServer = createNetServer();
    await new Promise<void>((resolve) => devServer.listen(0, '127.0.0.1', resolve));
    const devPort = (devServer.address() as AddressInfo).port;

    try {
      await expect(resolveTunnelPort(devPort, 4030)).resolves.toBe(devPort);
    } finally {
      await new Promise<void>((resolve) => devServer.close(() => resolve()));
    }
  });

  it('falls back to the agent port when nothing serves the web port', async () => {
    // Production case: WEB_PORT left over from a dev .env, no Vite running.
    const idleServer = createNetServer();
    await new Promise<void>((resolve) => idleServer.listen(0, '127.0.0.1', resolve));
    const idlePort = (idleServer.address() as AddressInfo).port;
    await new Promise<void>((resolve) => idleServer.close(() => resolve()));

    await expect(resolveTunnelPort(idlePort, 4030)).resolves.toBe(4030);
  });
});
