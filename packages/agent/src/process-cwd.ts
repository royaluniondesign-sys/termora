import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { readlink } from 'node:fs/promises';

const execFileAsync = promisify(execFile);

/**
 * Asks the OS for a process's actual current working directory.
 *
 * session.cwd (tracked from OSC 7 escape sequences) is the display-only cwd
 * shown in the UI, and only updates if the shell itself is configured to
 * emit OSC 7 — plain zsh/bash out of the box does not. The real PTY process
 * is always in the right directory regardless; this asks the OS directly
 * instead of trusting shell cooperation, for anything that needs to be
 * actually correct (like resolving which git repo to fan out from).
 *
 * Linux exposes this directly via /proc — cheap and exact, no subprocess.
 * Everywhere else (macOS has no /proc) falls back to lsof, which reports it
 * as one of its open file descriptors.
 */
export async function getProcessCwd(pid: number): Promise<string | null> {
  if (process.platform === 'linux') {
    try {
      return await readlink(`/proc/${String(pid)}/cwd`);
    } catch {
      return null;
    }
  }

  try {
    const { stdout } = await execFileAsync('lsof', ['-a', '-p', String(pid), '-d', 'cwd', '-Fn']);
    const line = stdout.split('\n').find((l) => l.startsWith('n'));
    return line ? line.slice(1).trim() : null;
  } catch {
    return null;
  }
}
