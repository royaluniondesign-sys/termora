import { WebSocketServer, WebSocket } from 'ws';
import type { IncomingMessage } from 'node:http';
import { URL } from 'node:url';
import { verifyJWT } from './auth.js';
import type { DbStatements } from './db.js';
import { PTYManager, type PTYSession } from './pty-manager.js';
import type { ClientMessage, ServerMessage, ShellType } from './types.js';
import {
  isGitRepo,
  getRepoRoot,
  slugify,
  createFanoutWorktrees,
  listFanoutWorktrees,
  removeWorktree,
} from './worktree.js';
import { getTmuxPaneCwd } from './tmux.js';
import { getProcessCwd } from './process-cwd.js';

/** WebSocket close codes. */
const WS_CLOSE_UNAUTHORIZED = 4001;
const WS_CLOSE_NORMAL = 1000;

/** Backpressure threshold — drop messages if WS buffer exceeds this (bytes). */
const BACKPRESSURE_HIGH = 64 * 1024;

/** Max payload size for incoming WebSocket messages (1 MB). */
const MAX_PAYLOAD = 1024 * 1024;

/** Subscriptions map: which sessions each WebSocket client is subscribed to. */
type SubscriptionMap = Map<WebSocket, Set<string>>;

/**
 * Sends a message to a WebSocket client with backpressure awareness.
 * Returns false if the message was dropped due to backpressure.
 */
function send(ws: WebSocket, message: ServerMessage): boolean {
  if (ws.readyState !== WebSocket.OPEN) return false;
  if (ws.bufferedAmount > BACKPRESSURE_HIGH) return false;
  ws.send(JSON.stringify(message));
  return true;
}

function sendError(ws: WebSocket, message: string): void {
  send(ws, { type: 'error', message });
}

function isValidShell(shell: unknown): shell is ShellType {
  return shell === 'zsh' || shell === 'tmux' || shell === 'claude';
}

function parseClientMessage(raw: string): ClientMessage | null {
  try {
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null || !('type' in parsed)) {
      return null;
    }
    return parsed as ClientMessage;
  } catch {
    return null;
  }
}

/**
 * Sets up the WebSocket handler on the given WebSocketServer.
 * Authenticates connections via JWT in the query string, then routes
 * messages to the PTY manager.
 */
export function setupWebSocketHandler(
  wss: WebSocketServer,
  ptyManager: PTYManager,
  jwtSecret: string,
  statements: DbStatements,
): void {
  const subscriptions: SubscriptionMap = new Map();

  wss.on('connection', (ws: WebSocket, req: IncomingMessage) => {
    void handleConnection(ws, req, ptyManager, jwtSecret, statements, subscriptions);
  });
}

async function handleConnection(
  ws: WebSocket,
  req: IncomingMessage,
  ptyManager: PTYManager,
  jwtSecret: string,
  statements: DbStatements,
  subscriptions: SubscriptionMap,
): Promise<void> {
  // Extract JWT from query parameter
  const url = new URL(req.url ?? '/', `http://${req.headers.host ?? 'localhost'}`);
  const token = url.searchParams.get('token');

  if (!token) {
    ws.close(WS_CLOSE_UNAUTHORIZED, 'Missing authentication token');
    return;
  }

  let jti: string | undefined;
  try {
    const { payload } = await verifyJWT(token, jwtSecret);
    jti = payload.jti;
  } catch {
    ws.close(WS_CLOSE_UNAUTHORIZED, 'Invalid or expired token');
    return;
  }

  // The JWT signature alone only proves we issued it, not that the device
  // session hasn't since been revoked from Settings > Devices — that state
  // lives in the sessions table, not in the (unrevocable) token itself.
  if (jti && !statements.getSession.get(jti)) {
    ws.close(WS_CLOSE_UNAUTHORIZED, 'Session revoked');
    return;
  }
  if (jti) statements.updateSessionLastSeen.run(jti);

  // Authentication succeeded -- set up message handling
  (ws as unknown as { isAlive: boolean }).isAlive = true;
  ws.on('pong', () => {
    (ws as unknown as { isAlive: boolean }).isAlive = true;
    if (jti) statements.updateSessionLastSeen.run(jti);
  });
  subscriptions.set(ws, new Set());

  ws.on('message', (rawData: Buffer | string) => {
    const data = typeof rawData === 'string' ? rawData : rawData.toString('utf-8');
    const message = parseClientMessage(data);

    if (!message) {
      sendError(ws, 'Invalid message format');
      return;
    }

    handleMessage(ws, message, ptyManager, subscriptions);
  });

  ws.on('close', () => {
    // Clear subscriptions but do NOT destroy sessions (allow reconnection)
    subscriptions.delete(ws);
  });

  ws.on('error', () => {
    subscriptions.delete(ws);
  });
}

function handleMessage(
  ws: WebSocket,
  message: ClientMessage,
  ptyManager: PTYManager,
  subscriptions: SubscriptionMap,
): void {
  switch (message.type) {
    case 'ping':
      send(ws, { type: 'pong' });
      break;

    case 'session_create':
      handleSessionCreate(ws, message.shell, message.name, ptyManager, subscriptions);
      break;

    case 'session_subscribe':
      handleSessionSubscribe(ws, message.sessionId, ptyManager, subscriptions);
      break;

    case 'session_close':
      handleSessionClose(ws, message.sessionId, ptyManager, subscriptions);
      break;

    case 'session_rename':
      handleSessionRename(ws, message.sessionId, message.name, ptyManager);
      break;

    case 'session_list':
      handleSessionList(ws, ptyManager);
      break;

    case 'worktree_fanout':
      void handleWorktreeFanout(
        ws, message.sessionId, message.prompt, message.agentCommand, message.count,
        ptyManager, subscriptions,
      );
      break;

    case 'worktree_cleanup':
      void handleWorktreeCleanup(ws, message.sessionId, ptyManager);
      break;

    case 'stdin':
      handleStdin(ws, message.sessionId, message.data, ptyManager);
      break;

    case 'resize':
      handleResize(ws, message.sessionId, message.cols, message.rows, ptyManager);
      break;
  }
}

function handleSessionCreate(
  ws: WebSocket,
  shell: ShellType | unknown,
  name: string | undefined,
  ptyManager: PTYManager,
  subscriptions: SubscriptionMap,
): void {
  if (!isValidShell(shell)) {
    sendError(ws, `Invalid shell type: ${String(shell)}`);
    return;
  }

  let session: PTYSession;
  try {
    session = ptyManager.create(shell, 80, 24, name);
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : 'Failed to create session';
    sendError(ws, errMsg);
    return;
  }

  wireSessionToClient(ws, session, subscriptions);
}

/**
 * Subscribes `ws` to a session's output/metadata/exit events and sends the
 * initial `session` message + buffer replay. Shared by session_create and
 * worktree_fanout — both need every newly created session to behave
 * identically from the client's point of view.
 */
function wireSessionToClient(
  ws: WebSocket,
  session: PTYSession,
  subscriptions: SubscriptionMap,
): void {
  const clientSubs = subscriptions.get(ws);
  if (clientSubs) {
    clientSubs.add(session.id);
  }

  send(ws, {
    type: 'session',
    sessionId: session.id,
    shell: session.shell,
    pid: session.pty.pid,
    name: session.name,
    cwd: session.cwd,
    status: session.status,
  });

  for (const chunk of session.buffer) {
    send(ws, { type: 'stdout', sessionId: session.id, data: chunk });
  }

  session.onData((data: string) => {
    const subs = subscriptions.get(ws);
    if (subs?.has(session.id)) {
      send(ws, { type: 'stdout', sessionId: session.id, data });
    }
  });

  session.onUpdate((meta) => {
    const subs = subscriptions.get(ws);
    if (subs?.has(session.id)) {
      send(ws, { type: 'session_update', sessionId: session.id, ...meta });
    }
  });

  session.onExit((event) => {
    send(ws, {
      type: 'exit',
      sessionId: session.id,
      exitCode: event.exitCode,
      signal: event.signal,
    });

    const subs = subscriptions.get(ws);
    if (subs) {
      subs.delete(session.id);
    }
  });
}

function handleSessionSubscribe(
  ws: WebSocket,
  sessionId: string,
  ptyManager: PTYManager,
  subscriptions: SubscriptionMap,
): void {
  const session = ptyManager.get(sessionId);
  if (!session) {
    sendError(ws, `Session not found: ${sessionId}`);
    return;
  }

  // Subscribe this client
  const clientSubs = subscriptions.get(ws);
  if (clientSubs) {
    if (clientSubs.has(sessionId)) return; // already subscribed
    clientSubs.add(sessionId);
  }

  // Send session info
  send(ws, {
    type: 'session',
    sessionId: session.id,
    shell: session.shell,
    pid: session.pty.pid,
    name: session.name,
    cwd: session.cwd,
    status: session.status,
  });

  // Replay buffer
  for (const chunk of session.buffer) {
    send(ws, { type: 'stdout', sessionId: session.id, data: chunk });
  }

  // Wire up live streaming
  session.onData((data: string) => {
    const subs = subscriptions.get(ws);
    if (subs?.has(session.id)) {
      send(ws, { type: 'stdout', sessionId: session.id, data });
    }
  });

  session.onUpdate((meta) => {
    const subs = subscriptions.get(ws);
    if (subs?.has(session.id)) {
      send(ws, { type: 'session_update', sessionId: session.id, ...meta });
    }
  });

  session.onExit((event) => {
    send(ws, {
      type: 'exit',
      sessionId: session.id,
      exitCode: event.exitCode,
      signal: event.signal,
    });
    const subs = subscriptions.get(ws);
    if (subs) {
      subs.delete(session.id);
    }
  });
}

function handleSessionClose(
  ws: WebSocket,
  sessionId: string,
  ptyManager: PTYManager,
  subscriptions: SubscriptionMap,
): void {
  ptyManager.destroy(sessionId);
  const subs = subscriptions.get(ws);
  if (subs) {
    subs.delete(sessionId);
  }
  send(ws, { type: 'exit', sessionId, exitCode: 0 });
}

function handleSessionList(ws: WebSocket, ptyManager: PTYManager): void {
  const sessions = ptyManager.list().map((s) => ({
    id: s.id,
    shell: s.shell,
    pid: s.pty.pid,
    name: s.name,
    cwd: s.cwd,
    status: s.status,
  }));

  send(ws, { type: 'session_list', sessions });
}

function handleSessionRename(
  ws: WebSocket,
  sessionId: string,
  name: string,
  ptyManager: PTYManager,
): void {
  try {
    ptyManager.rename(sessionId, name);
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : 'Rename failed';
    sendError(ws, errMsg);
  }
}

function handleStdin(
  ws: WebSocket,
  sessionId: string,
  data: string,
  ptyManager: PTYManager,
): void {
  // Input validation: reject oversized payloads
  if (typeof data !== 'string' || data.length > MAX_PAYLOAD) {
    sendError(ws, 'Input too large');
    return;
  }
  try {
    ptyManager.write(sessionId, data);
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : 'Write failed';
    sendError(ws, errMsg);
  }
}

function handleResize(
  ws: WebSocket,
  sessionId: string,
  cols: number,
  rows: number,
  ptyManager: PTYManager,
): void {
  // Input validation: reasonable terminal dimensions
  if (typeof cols !== 'number' || typeof rows !== 'number'
    || cols < 1 || cols > 500 || rows < 1 || rows > 500
    || !Number.isInteger(cols) || !Number.isInteger(rows)) {
    sendError(ws, 'Invalid dimensions');
    return;
  }
  try {
    ptyManager.resize(sessionId, cols, rows);
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : 'Resize failed';
    sendError(ws, errMsg);
  }
}

/** Upper bound on how many worktrees one fan-out request can create. */
const MAX_FANOUT_COUNT = 8;

/** Upper bound on prompt length — this becomes a shell argument and a git
 *  branch name component; a very long prompt is almost certainly a mistake
 *  or abuse, not a real request. */
const MAX_FANOUT_PROMPT_LENGTH = 2000;

/**
 * Wraps a value in single quotes for safe use as one shell word, escaping
 * any embedded single quotes. The prompt/agent command/path here all come
 * from the session's own owner (already authenticated), so this isn't a
 * trust boundary — it's about not letting a prompt containing `'` or `&&`
 * silently corrupt the command line it's spliced into.
 */
function shellQuote(value: string): string {
  return `'${value.replace(/'/g, String.raw`'\''`)}'`;
}

/**
 * Resolves a session's actual current directory by asking the OS/tmux
 * directly, rather than trusting session.cwd (OSC 7 tracking, which stays
 * stale on a shell with no shell-integration hook configured). Falls back
 * to session.cwd only if the live lookup itself fails.
 */
async function resolveSessionCwd(session: PTYSession): Promise<string> {
  const live = session.tmuxName
    ? await getTmuxPaneCwd(session.tmuxName)
    : await getProcessCwd(session.pty.pid);
  return live ?? session.cwd;
}

/** Upper bound on the command template — a full invocation with flags, not just a bare name. */
const MAX_AGENT_COMMAND_LENGTH = 300;

/**
 * Builds the shell line that starts one fanned-out agent, substituting the
 * `{prompt}` placeholder in the user's command template with the
 * shell-quoted prompt. Termora has no idea how any given CLI wants its
 * prompt passed — `claude -p {prompt}`, `opencode run {prompt}`,
 * `aider --message {prompt}`, `codex exec {prompt}`, or a tool that just
 * takes it as a bare trailing argument — so the user's template is taken
 * literally rather than Termora guessing a flag. If the template doesn't
 * mention `{prompt}` at all, it's appended as a final argument, matching
 * the common "just takes the prompt positionally" case.
 */
function buildAgentCommandLine(template: string, prompt: string): string {
  const quotedPrompt = shellQuote(prompt);
  return template.includes('{prompt}')
    ? template.replaceAll('{prompt}', quotedPrompt)
    : `${template} ${quotedPrompt}`;
}

/**
 * Fans one prompt across `count` new sessions, each in its own git worktree
 * (sibling branches off the fan-out session's current HEAD), each already
 * running the user's own command template against that prompt. Every new
 * session is wired to this client exactly like a normal session_create, so
 * they show up in the existing Terminals list immediately — no separate
 * "fan-out view" needed.
 *
 * Termora targets any CLI agent, not a specific brand — Claude Code,
 * OpenCode, Codex, aider, Cline, Hermes, whatever the user actually runs —
 * so it never assumes a particular invocation flag; see
 * buildAgentCommandLine.
 *
 * Whether the template runs interactively or non-interactively is entirely
 * up to what the user puts in it. Non-interactive (print/run/exec-style)
 * flags are recommended for unattended fan-out: driving N interactive TUIs
 * through their own first-run prompts unattended is fragile in exactly the
 * way a human at the keyboard is not.
 */
async function handleWorktreeFanout(
  ws: WebSocket,
  sessionId: string,
  prompt: unknown,
  agentCommand: unknown,
  count: unknown,
  ptyManager: PTYManager,
  subscriptions: SubscriptionMap,
): Promise<void> {
  const source = ptyManager.get(sessionId);
  if (!source) {
    sendError(ws, `Session not found: ${sessionId}`);
    return;
  }
  if (typeof prompt !== 'string' || !prompt.trim()) {
    sendError(ws, 'Prompt is required');
    return;
  }
  if (prompt.length > MAX_FANOUT_PROMPT_LENGTH) {
    sendError(ws, `Prompt too long (max ${String(MAX_FANOUT_PROMPT_LENGTH)} characters)`);
    return;
  }
  if (typeof agentCommand !== 'string' || !agentCommand.trim() || agentCommand.includes('\n')) {
    sendError(ws, 'Invalid agent command');
    return;
  }
  if (agentCommand.length > MAX_AGENT_COMMAND_LENGTH) {
    sendError(ws, `Agent command too long (max ${String(MAX_AGENT_COMMAND_LENGTH)} characters)`);
    return;
  }
  if (typeof count !== 'number' || !Number.isInteger(count) || count < 1 || count > MAX_FANOUT_COUNT) {
    sendError(ws, `count must be an integer between 1 and ${String(MAX_FANOUT_COUNT)}`);
    return;
  }

  let repoRoot: string;
  try {
    const cwd = await resolveSessionCwd(source);
    if (!(await isGitRepo(cwd))) {
      sendError(ws, `Not a git repository: ${cwd}`);
      return;
    }
    repoRoot = await getRepoRoot(cwd);
  } catch (err) {
    sendError(ws, err instanceof Error ? err.message : 'Failed to resolve git repository');
    return;
  }

  const slug = slugify(prompt);

  let worktrees;
  try {
    worktrees = await createFanoutWorktrees(repoRoot, count, slug);
  } catch (err) {
    sendError(ws, err instanceof Error ? `Failed to create worktrees: ${err.message}` : 'Failed to create worktrees');
    return;
  }

  for (const w of worktrees) {
    let session: PTYSession;
    try {
      session = ptyManager.create(source.shell, 80, 24, `fanout-${String(w.index)}`);
    } catch {
      continue; // best-effort: skip a slot that failed to spawn, keep the rest going
    }
    wireSessionToClient(ws, session, subscriptions);

    ptyManager.write(session.id, `cd ${shellQuote(w.path)} && clear\n`);
    ptyManager.write(session.id, `${buildAgentCommandLine(agentCommand, prompt)}\n`);
  }

  send(ws, {
    type: 'worktree_fanout_started',
    count: worktrees.length,
    branches: worktrees.map((w) => w.branch),
  });
}

/**
 * Removes every fan-out worktree (branch under `fanout/`) for the repo the
 * given session is inside — the cleanup step once you've picked a winner
 * and no longer need the losing runs' isolated directories.
 */
async function handleWorktreeCleanup(
  ws: WebSocket,
  sessionId: string,
  ptyManager: PTYManager,
): Promise<void> {
  const source = ptyManager.get(sessionId);
  if (!source) {
    sendError(ws, `Session not found: ${sessionId}`);
    return;
  }

  let repoRoot: string;
  try {
    const cwd = await resolveSessionCwd(source);
    if (!(await isGitRepo(cwd))) {
      sendError(ws, `Not a git repository: ${cwd}`);
      return;
    }
    repoRoot = await getRepoRoot(cwd);
  } catch (err) {
    sendError(ws, err instanceof Error ? err.message : 'Failed to resolve git repository');
    return;
  }

  let removed = 0;
  try {
    const worktrees = await listFanoutWorktrees(repoRoot);
    for (const w of worktrees) {
      try {
        await removeWorktree(repoRoot, w.path, true);
        removed++;
      } catch {
        // Left in place — surfaced only via a short final count. A worktree
        // that fails to remove (e.g. a process still using it) shouldn't
        // block cleaning up the rest.
      }
    }
  } catch (err) {
    sendError(ws, err instanceof Error ? err.message : 'Failed to list worktrees');
    return;
  }

  send(ws, { type: 'worktree_cleanup_done', removed });
}

export { WS_CLOSE_UNAUTHORIZED, WS_CLOSE_NORMAL };
