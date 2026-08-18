import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { mkdtemp, rm, writeFile, mkdir, realpath } from 'node:fs/promises';
import { randomBytes } from 'node:crypto';
import type { AddressInfo } from 'node:net';
import WebSocket from 'ws';
import { createAppServer } from '../server.js';
import { setupWebSocketHandler } from '../ws-handler.js';
import { PTYManager } from '../pty-manager.js';
import { initDatabase } from '../db.js';
import { createSessionJWT } from '../auth.js';
import { listFanoutWorktrees, removeWorktree } from '../worktree.js';
import type { AgentConfig } from '../config.js';
import type { ServerMessage } from '../types.js';

const execFileAsync = promisify(execFile);

/**
 * End-to-end: a real WebSocket client asks to fan a prompt across worktrees,
 * and gets back real PTY sessions already cd'd into real git worktrees. New
 * sessions always spawn at the user's home directory (there's no per-session
 * cwd override in the public API), so this test points HOME at a scratch
 * git repo rather than trying to `cd` a live shell and race OSC7 detection.
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

// Real PTY spawns + real git worktree commands are comfortably fast
// locally but can be noticeably slower on a loaded, shared CI runner.
vi.setConfig({ testTimeout: 20_000, hookTimeout: 20_000 });

describe('worktree fan-out over a real WebSocket', () => {
  const dbPath = join(tmpdir(), `termora-fanout-${randomBytes(6).toString('hex')}.db`);
  const config = makeConfig(dbPath);
  const { db, statements } = initDatabase(dbPath);
  const { httpServer, wss } = createAppServer(config, statements);
  const ptyManager = new PTYManager({ tmuxEnabled: false, tmuxConfPath: null, dbStatements: statements });
  setupWebSocketHandler(wss, ptyManager, config.jwtSecret, statements);

  let wsUrl = '';
  let parentDir: string;
  let repoRoot: string;
  let originalHome: string | undefined;

  beforeAll(async () => {
    await new Promise<void>((resolve) => httpServer.listen(0, '127.0.0.1', resolve));
    const { port } = httpServer.address() as AddressInfo;
    wsUrl = `ws://127.0.0.1:${port}`;

    parentDir = await realpath(await mkdtemp(join(tmpdir(), 'termora-fanout-repo-')));
    repoRoot = join(parentDir, 'sample-repo');
    await mkdir(repoRoot);
    await execFileAsync('git', ['-C', repoRoot, 'init', '-q']);
    await execFileAsync('git', ['-C', repoRoot, 'config', 'user.email', 'test@example.com']);
    await execFileAsync('git', ['-C', repoRoot, 'config', 'user.name', 'Test']);
    await writeFile(join(repoRoot, 'README.md'), '# sample\n');
    await execFileAsync('git', ['-C', repoRoot, 'add', '.']);
    await execFileAsync('git', ['-C', repoRoot, 'commit', '-q', '-m', 'initial']);

    // New PTY sessions spawn at homedir() — point it at the scratch repo so
    // the fan-out source session's cwd is inside a real git repo.
    originalHome = process.env.HOME;
    process.env.HOME = repoRoot;
  }, 20_000);

  afterAll(async () => {
    if (originalHome !== undefined) process.env.HOME = originalHome;
    ptyManager.destroyAll();
    await new Promise<void>((resolve) => httpServer.close(() => resolve()));
    db.close();
    for (const suffix of ['', '-wal', '-shm']) rm(`${dbPath}${suffix}`, { force: true }).catch(() => {});
    await rm(parentDir, { recursive: true, force: true });
  });

  async function connectAuthenticated(): Promise<WebSocket> {
    const { token, jti } = await createSessionJWT({ authMethod: 'bootstrap' }, config.jwtSecret);
    statements.insertSession.run(jti, jti, 'Test device');
    const ws = new WebSocket(`${wsUrl}/?token=${token}`);
    await new Promise<void>((resolve, reject) => {
      ws.once('open', () => resolve());
      ws.once('error', reject);
    });
    return ws;
  }

  function waitFor(ws: WebSocket, predicate: (msg: ServerMessage) => boolean, timeoutMs = 8000): Promise<ServerMessage> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('timeout waiting for message')), timeoutMs);
      const onMessage = (raw: Buffer) => {
        const msg = JSON.parse(raw.toString('utf-8')) as ServerMessage;
        if (predicate(msg)) {
          clearTimeout(timer);
          ws.off('message', onMessage);
          resolve(msg);
        }
      };
      ws.on('message', onMessage);
    });
  }

  it('creates one worktree + one live session per fan-out slot', async () => {
    const ws = await connectAuthenticated();
    try {
      // Create the source session (spawns at HOME, which is repoRoot).
      ws.send(JSON.stringify({ type: 'session_create', shell: 'zsh' }));
      const created = await waitFor(ws, (m) => m.type === 'session');
      const sourceId = (created as { sessionId: string }).sessionId;

      ws.send(JSON.stringify({
        type: 'worktree_fanout',
        sessionId: sourceId,
        prompt: 'Fix the login bug',
        agentCommand: 'echo',
        count: 2,
      }));

      const result = await waitFor(ws, (m) => m.type === 'worktree_fanout_started') as
        { type: 'worktree_fanout_started'; count: number; branches: string[] };

      expect(result.count).toBe(2);
      expect(result.branches).toEqual([
        'fanout/fix-the-login-bug-1',
        'fanout/fix-the-login-bug-2',
      ]);

      const onDisk = await listFanoutWorktrees(repoRoot);
      expect(onDisk).toHaveLength(2);
      for (const w of onDisk) await removeWorktree(repoRoot, w.path, true);
    } finally {
      ws.close();
    }
  });

  it('ignores a stale session.cwd and uses the real process cwd instead', async () => {
    // Regression test for a bug caught live: session.cwd is tracked from
    // OSC 7 escape sequences, which a plain shell with no shell-integration
    // hook configured never emits — cd-ing a session leaves session.cwd
    // stuck at its spawn directory even though the real shell process moved.
    // Reproducing that staleness by actually cd-ing a live shell and waiting
    // for it turned out to be exactly the kind of timing-dependent thing
    // this fix exists to avoid trusting: a freshly-installed zsh's first
    // interactive startup was slow and inconsistent enough on a shared CI
    // runner to make that version of this test flaky. What actually needs
    // proving is narrower and fully deterministic: given a session whose
    // tracked cwd is wrong, fan-out must resolve the repo from the real
    // process cwd, not the stale field — so drive that directly.
    let sourceId = '';
    let ws: WebSocket | undefined;
    try {
      // Spawn at the real repo (same reliable path as the first test), then
      // deliberately corrupt the tracked field to something else entirely —
      // simulating exactly what a stale/never-updated OSC 7 value looks like.
      const originalHomeLocal = process.env.HOME;
      process.env.HOME = repoRoot;
      ws = await connectAuthenticated();
      ws.send(JSON.stringify({ type: 'session_create', shell: 'zsh' }));
      const created = await waitFor(ws, (m) => m.type === 'session');
      sourceId = (created as { sessionId: string }).sessionId;
      process.env.HOME = originalHomeLocal;

      const session = ptyManager.get(sourceId);
      if (!session) throw new Error('source session not found');
      session.cwd = '/definitely/not/a/git/repo';

      ws.send(JSON.stringify({
        type: 'worktree_fanout',
        sessionId: sourceId,
        prompt: 'osc7 staleness check',
        agentCommand: 'echo',
        count: 1,
      }));
      const result = await waitFor(ws, (m) => m.type === 'worktree_fanout_started' || m.type === 'error');
      expect(result.type).toBe('worktree_fanout_started');

      const onDisk = await listFanoutWorktrees(repoRoot);
      for (const w of onDisk) await removeWorktree(repoRoot, w.path, true);
    } finally {
      ws?.close();
      if (sourceId) ptyManager.destroy(sourceId);
    }
  });

  it('rejects a fan-out request from outside a git repo', async () => {
    const ws = await connectAuthenticated();

    const nonRepoDir = await mkdtemp(join(tmpdir(), 'termora-not-a-repo-'));
    const originalHomeLocal = process.env.HOME;
    process.env.HOME = nonRepoDir;
    try {
      ws.send(JSON.stringify({ type: 'session_create', shell: 'zsh' }));
      const created = await waitFor(ws, (m) => m.type === 'session');
      const sourceId = (created as { sessionId: string }).sessionId;

      ws.send(JSON.stringify({
        type: 'worktree_fanout',
        sessionId: sourceId,
        prompt: 'test',
        agentCommand: 'echo',
        count: 1,
      }));

      const err = await waitFor(ws, (m) => m.type === 'error') as { type: 'error'; message: string };
      expect(err.message).toMatch(/not a git repository/i);
    } finally {
      process.env.HOME = originalHomeLocal;
      ws.close();
      await rm(nonRepoDir, { recursive: true, force: true });
    }
  });

  it('rejects an out-of-range count without touching the filesystem', async () => {
    const ws = await connectAuthenticated();
    try {
      ws.send(JSON.stringify({ type: 'session_create', shell: 'zsh' }));
      const created = await waitFor(ws, (m) => m.type === 'session');
      const sourceId = (created as { sessionId: string }).sessionId;

      ws.send(JSON.stringify({
        type: 'worktree_fanout',
        sessionId: sourceId,
        prompt: 'test',
        agentCommand: 'echo',
        count: 99,
      }));

      const err = await waitFor(ws, (m) => m.type === 'error') as { type: 'error'; message: string };
      expect(err.message).toMatch(/count/i);
    } finally {
      ws.close();
    }
  });
});
