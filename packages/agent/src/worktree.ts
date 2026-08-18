import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { dirname, join, basename } from 'node:path';

const execFileAsync = promisify(execFile);

export interface FanoutWorktree {
  index: number;
  path: string;
  branch: string;
}

/** Prefix used for every branch/worktree this module creates, so cleanup
 *  can find its own worktrees without touching anything the user made by
 *  hand with `git worktree add`. */
const FANOUT_BRANCH_PREFIX = 'fanout/';

async function git(repoRoot: string, args: string[]): Promise<string> {
  const { stdout } = await execFileAsync('git', ['-C', repoRoot, ...args]);
  return stdout.trim();
}

/** True if `cwd` is inside a git working tree (any subdirectory, not just the root). */
export async function isGitRepo(cwd: string): Promise<boolean> {
  try {
    const out = await git(cwd, ['rev-parse', '--is-inside-work-tree']);
    return out === 'true';
  } catch {
    return false;
  }
}

/** Absolute path to the repository root, given any directory inside it. */
export async function getRepoRoot(cwd: string): Promise<string> {
  return git(cwd, ['rev-parse', '--show-toplevel']);
}

/**
 * Turns a free-text prompt into a short, branch-name-safe slug.
 * "Fix the login bug!!" -> "fix-the-login-bug"
 */
export function slugify(text: string, maxWords = 5): string {
  const slug = text
    .toLowerCase()
    .split(/\s+/)
    .slice(0, maxWords)
    .join(' ')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-');
  return slug || 'fanout';
}

/**
 * Creates `count` sibling worktrees, each on its own new branch off the
 * current HEAD, named `<repo>-fanout-<slug>-<n>` next to the repo itself
 * (git worktrees cannot live inside the main repo's own working directory).
 * Fans a single prompt across isolated worktrees so parallel agent runs
 * cannot step on each other's files or git state.
 */
export async function createFanoutWorktrees(
  repoRoot: string,
  count: number,
  promptSlug: string,
): Promise<FanoutWorktree[]> {
  if (count < 1 || count > 8) {
    throw new Error('count must be between 1 and 8');
  }

  const parent = dirname(repoRoot);
  const repoName = basename(repoRoot);
  const created: FanoutWorktree[] = [];

  try {
    for (let i = 1; i <= count; i++) {
      const branch = `${FANOUT_BRANCH_PREFIX}${promptSlug}-${String(i)}`;
      const path = join(parent, `${repoName}-fanout-${promptSlug}-${String(i)}`);
      await git(repoRoot, ['worktree', 'add', '-b', branch, path, 'HEAD']);
      created.push({ index: i, path, branch });
    }
  } catch (err) {
    // Partial failure — roll back whatever we already created rather than
    // leaving the repo half fanned-out.
    await Promise.allSettled(created.map((w) => removeWorktree(repoRoot, w.path, true)));
    throw err;
  }

  return created;
}

/** Removes one worktree. `force` discards uncommitted changes in it. */
export async function removeWorktree(
  repoRoot: string,
  worktreePath: string,
  force = false,
): Promise<void> {
  const args = ['worktree', 'remove', worktreePath];
  if (force) args.push('--force');
  await git(repoRoot, args);
}

interface PorcelainEntry {
  worktree?: string;
  branch?: string;
}

/** Lists worktrees created by createFanoutWorktrees (branch under fanout/). */
export async function listFanoutWorktrees(repoRoot: string): Promise<FanoutWorktree[]> {
  const out = await git(repoRoot, ['worktree', 'list', '--porcelain']);
  const entries: PorcelainEntry[] = [];
  let current: PorcelainEntry = {};

  for (const line of out.split('\n')) {
    if (line.startsWith('worktree ')) {
      if (current.worktree) entries.push(current);
      current = { worktree: line.slice('worktree '.length) };
    } else if (line.startsWith('branch ')) {
      current.branch = line.slice('branch '.length);
    } else if (line === '' && current.worktree) {
      entries.push(current);
      current = {};
    }
  }
  if (current.worktree) entries.push(current);

  return entries
    .filter((e) => e.branch?.startsWith(`refs/heads/${FANOUT_BRANCH_PREFIX}`))
    .map((e, i) => ({
      index: i + 1,
      path: e.worktree as string,
      branch: (e.branch as string).replace('refs/heads/', ''),
    }));
}
