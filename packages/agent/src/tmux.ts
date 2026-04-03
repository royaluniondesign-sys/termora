import { execFileSync } from 'node:child_process';
import { writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';

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
    ], { encoding: 'utf-8' });
    // capture-pane outputs \n line endings, but xterm.js needs \r\n —
    // without \r the cursor doesn't return to column 0, causing text to cascade right.
    // Also trim trailing blank lines (empty terminal rows below content).
    return content.replace(/\n+$/, '\n').replace(/\n/g, '\r\n');
  } catch {
    return '';
  }
}
