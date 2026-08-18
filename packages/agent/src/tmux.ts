import { execFileSync, execFile } from 'node:child_process';
import { writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';

/** Default timeout for async tmux operations (ms). */
const TMUX_TIMEOUT = 5_000;

/**
 * Promisified execFile with timeout for non-blocking tmux operations.
 */
function execTmuxAsync(args: string[], encoding: 'utf-8'): Promise<string>;
function execTmuxAsync(args: string[]): Promise<void>;
function execTmuxAsync(args: string[], encoding?: 'utf-8'): Promise<string | void> {
  return new Promise((resolve, reject) => {
    execFile('tmux', args, {
      encoding: encoding ?? 'utf-8',
      timeout: TMUX_TIMEOUT,
    }, (err: Error | null, stdout: string) => {
      if (err) {
        reject(err);
      } else {
        resolve(encoding ? stdout : undefined);
      }
    });
  });
}

/** Socket name for termora's isolated tmux server (avoids conflicts with user's tmux). */
export const TMUX_SOCKET = 'termora';

/** Invisible tmux config — no status bar, no prefix, passthrough for OSC 7. */
const TMUX_CONF = `set -g status off
set -g prefix None
unbind-key C-b
set -g allow-passthrough on
set -g default-terminal "xterm-256color"
set -g mouse off
set -g history-limit 5000
set -g escape-time 0
set -ga terminal-overrides ",xterm-256color:Tc"
`;

/** Prefix used for all termora-managed tmux sessions. */
const SESSION_PREFIX = 'termora-';

/**
 * Checks if tmux is available on the system.
 */
export function isTmuxAvailable(): boolean {
  try {
    execFileSync('tmux', ['-V'], { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

/**
 * Writes the invisible tmux config to ~/.termora/tmux.conf and returns its path.
 */
export function ensureTmuxConfig(): string {
  const termoraDir = join(homedir(), '.termora');
  const confPath = join(termoraDir, 'tmux.conf');
  mkdirSync(termoraDir, { recursive: true });
  writeFileSync(confPath, TMUX_CONF, { mode: 0o644 });
  return confPath;
}

/**
 * Lists all tmux sessions matching the termora- prefix.
 * Returns an array of session names (e.g. ["termora-abc123", "termora-def456"]).
 */
export function listTermoraTmuxSessions(): string[] {
  try {
    const output = execFileSync('tmux', ['-L', TMUX_SOCKET, 'list-sessions', '-F', '#{session_name}'], {
      encoding: 'utf-8',
      stdio: ['ignore', 'pipe', 'ignore'],
    });
    return output
      .trim()
      .split('\n')
      .filter((name) => name.startsWith(SESSION_PREFIX));
  } catch {
    // tmux server not running or no sessions — both fine
    return [];
  }
}

/**
 * Checks if a specific tmux session exists.
 */
export function tmuxSessionExists(name: string): boolean {
  try {
    execFileSync('tmux', ['-L', TMUX_SOCKET, 'has-session', '-t', name], { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

/**
 * Kills a single tmux session by name.
 */
export function killTmuxSession(name: string): void {
  try {
    execFileSync('tmux', ['-L', TMUX_SOCKET, 'kill-session', '-t', name], { stdio: 'ignore' });
  } catch {
    // Session already gone — fine
  }
}

/**
 * Kills all termora-prefixed tmux sessions.
 */
export function killAllTermoraTmuxSessions(): void {
  for (const name of listTermoraTmuxSessions()) {
    killTmuxSession(name);
  }
}

/**
 * Captures the full scrollback + visible screen of a tmux pane.
 * Returns the content as text with ANSI escape sequences preserved.
 * Used to bootstrap the buffer on reattach after server restart.
 */
export function capturePaneContent(tmuxName: string): string {
  try {
    const content = execFileSync('tmux', [
      '-L', TMUX_SOCKET,
      'capture-pane', '-t', tmuxName,
      '-p', '-S', '-', '-e',
    ], { encoding: 'utf-8', timeout: TMUX_TIMEOUT });
    return content.replace(/\n+$/, '\n').replace(/\n/g, '\r\n');
  } catch {
    return '';
  }
}

// ---- Async versions (non-blocking) ----

/**
 * Async version of listTermoraTmuxSessions. Does not block the event loop.
 */
export async function listTermoraTmuxSessionsAsync(): Promise<string[]> {
  try {
    const output = await execTmuxAsync(
      ['-L', TMUX_SOCKET, 'list-sessions', '-F', '#{session_name}'],
      'utf-8',
    );
    return output
      .trim()
      .split('\n')
      .filter((name) => name.startsWith(SESSION_PREFIX));
  } catch {
    return [];
  }
}

/**
 * Async version of killTmuxSession. Does not block the event loop.
 */
export async function killTmuxSessionAsync(name: string): Promise<void> {
  try {
    await execTmuxAsync(['-L', TMUX_SOCKET, 'kill-session', '-t', name]);
  } catch {
    // Session already gone
  }
}

/**
 * Async version of capturePaneContent. Does not block the event loop.
 */
export async function capturePaneContentAsync(tmuxName: string): Promise<string> {
  try {
    const content = await execTmuxAsync(
      ['-L', TMUX_SOCKET, 'capture-pane', '-t', tmuxName, '-p', '-S', '-', '-e'],
      'utf-8',
    );
    return content.replace(/\n+$/, '\n').replace(/\n/g, '\r\n');
  } catch {
    return '';
  }
}

/**
 * Asks tmux for a pane's actual current working directory. tmux tracks this
 * itself at the OS level — unlike the OSC 7 tracking used for the session's
 * display cwd, it does not depend on the shell being configured to report
 * its own location, so this stays correct even in a bare zsh with no shell
 * integration.
 */
export async function getTmuxPaneCwd(tmuxName: string): Promise<string | null> {
  try {
    const path = await execTmuxAsync(
      ['-L', TMUX_SOCKET, 'display-message', '-p', '-t', tmuxName, '-F', '#{pane_current_path}'],
      'utf-8',
    );
    return path.trim() || null;
  } catch {
    return null;
  }
}
