#!/usr/bin/env node
/**
 * Fixes node-pty spawn-helper execute permissions on macOS/Linux.
 *
 * npm does not preserve execute bits on binaries inside packages.
 * node-pty's spawn-helper must be executable or PTY creation fails with
 * "posix_spawnp failed." — a silent error that makes "New Session" do nothing.
 */
import { chmodSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');

const platform = process.platform;
if (platform === 'win32') process.exit(0); // Windows uses conpty, not spawn-helper

const arch = process.arch;
const spawnHelper = join(root, 'node_modules', 'node-pty', 'prebuilds', `${platform}-${arch}`, 'spawn-helper');

if (existsSync(spawnHelper)) {
  chmodSync(spawnHelper, 0o755);
  console.log(`  node-pty: fixed spawn-helper permissions (${platform}-${arch})`);
} else {
  // Not a fatal error — may use a locally compiled build instead
  console.log(`  node-pty: spawn-helper not found at prebuilds/${platform}-${arch}/ (skipping)`);
}
