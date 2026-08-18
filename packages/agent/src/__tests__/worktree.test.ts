import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { mkdtemp, rm, writeFile, mkdir, realpath } from 'node:fs/promises';
import {
  isGitRepo,
  getRepoRoot,
  slugify,
  createFanoutWorktrees,
  removeWorktree,
  listFanoutWorktrees,
} from '../worktree.js';

const execFileAsync = promisify(execFile);

/**
 * Fans one prompt across several git worktrees, each on its own branch, so
 * parallel agent runs get isolated working directories instead of racing
 * over the same files. Tested against a real git repo — worktree semantics
 * (sibling-directory placement, branch refs, porcelain parsing) are exactly
 * the kind of thing that looks right in review and breaks on a real repo.
 */

describe('slugify', () => {
  it('lowercases, dashes, and trims to a handful of words', () => {
    expect(slugify('Fix the login bug!!')).toBe('fix-the-login-bug');
  });

  it('falls back to a default for input with no usable characters', () => {
    expect(slugify('!!!')).toBe('fanout');
  });

  it('truncates long prompts to maxWords', () => {
    expect(slugify('one two three four five six seven', 3)).toBe('one-two-three');
  });
});

describe('git worktree operations', () => {
  let repoRoot: string;
  let parentDir: string;

  beforeAll(async () => {
    // macOS symlinks /var -> /private/var; git resolves the canonical path,
    // so tests need to compare against that same canonical form too.
    parentDir = await realpath(await mkdtemp(join(tmpdir(), 'termora-worktree-')));
    repoRoot = join(parentDir, 'sample-repo');
    await mkdir(repoRoot);
    await execFileAsync('git', ['-C', repoRoot, 'init', '-q']);
    await execFileAsync('git', ['-C', repoRoot, 'config', 'user.email', 'test@example.com']);
    await execFileAsync('git', ['-C', repoRoot, 'config', 'user.name', 'Test']);
    await writeFile(join(repoRoot, 'README.md'), '# sample\n');
    await execFileAsync('git', ['-C', repoRoot, 'add', '.']);
    await execFileAsync('git', ['-C', repoRoot, 'commit', '-q', '-m', 'initial']);
  });

  afterAll(async () => {
    await rm(parentDir, { recursive: true, force: true });
  });

  it('recognizes a real git repo and a plain directory', async () => {
    await expect(isGitRepo(repoRoot)).resolves.toBe(true);
    await expect(isGitRepo(tmpdir())).resolves.toBe(false);
  });

  it('resolves the repo root from a subdirectory', async () => {
    await expect(getRepoRoot(repoRoot)).resolves.toBe(repoRoot);
  });

  it('creates N sibling worktrees, each on its own fanout branch', async () => {
    const worktrees = await createFanoutWorktrees(repoRoot, 3, 'test-run');
    try {
      expect(worktrees).toHaveLength(3);
      for (const [i, w] of worktrees.entries()) {
        expect(w.index).toBe(i + 1);
        expect(w.branch).toBe(`fanout/test-run-${String(i + 1)}`);
        // Worktrees live next to the repo, not nested inside it (a plain
        // string-prefix check would false-positive here: the sibling name
        // "sample-repo-fanout-..." itself starts with "sample-repo").
        expect(w.path.startsWith(`${repoRoot}/`)).toBe(false);
        expect(dirname(w.path)).toBe(parentDir);
      }
      const listed = await listFanoutWorktrees(repoRoot);
      expect(listed.map((w) => w.branch).sort()).toEqual(
        worktrees.map((w) => w.branch).sort(),
      );
    } finally {
      for (const w of worktrees) await removeWorktree(repoRoot, w.path, true);
    }
  });

  it('rejects a fan-out count outside 1..8', async () => {
    await expect(createFanoutWorktrees(repoRoot, 0, 'x')).rejects.toThrow();
    await expect(createFanoutWorktrees(repoRoot, 9, 'x')).rejects.toThrow();
  });

  it('rolls back already-created worktrees if one fails partway through', async () => {
    // Force a collision: pre-create the second worktree's target directory
    // with a file already in it (an empty dir wouldn't stop `git worktree
    // add`), then confirm the first worktree this call made was cleaned up
    // rather than left behind.
    const slug = 'collision-run';
    const collidingPath = join(parentDir, `sample-repo-fanout-${slug}-2`);
    await mkdir(collidingPath);
    await writeFile(join(collidingPath, 'occupied.txt'), 'not empty');

    try {
      await expect(createFanoutWorktrees(repoRoot, 2, slug)).rejects.toThrow();
      const remaining = await listFanoutWorktrees(repoRoot);
      expect(remaining.some((w) => w.branch.includes(slug))).toBe(false);
    } finally {
      await rm(collidingPath, { recursive: true, force: true });
    }
  });

  it('removes a worktree, force-discarding uncommitted changes', async () => {
    const [w] = await createFanoutWorktrees(repoRoot, 1, 'to-remove');
    await writeFile(join(w.path, 'scratch.txt'), 'uncommitted');

    await removeWorktree(repoRoot, w.path, true);

    const remaining = await listFanoutWorktrees(repoRoot);
    expect(remaining.some((r) => r.path === w.path)).toBe(false);
  });
});
