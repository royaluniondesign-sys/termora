import { describe, it, expect } from 'vitest';
import { realpath } from 'node:fs/promises';
import { getProcessCwd } from '../process-cwd.js';

describe('getProcessCwd', () => {
  it("resolves the current process's own real cwd", async () => {
    const expected = await realpath(process.cwd());
    const result = await getProcessCwd(process.pid);
    expect(result).not.toBeNull();
    expect(await realpath(result as string)).toBe(expected);
  });

  it('returns null for a pid that does not exist', async () => {
    // PID 1 is always init/systemd on Linux and launchd on macOS — never
    // this test process, and (on Linux) not readable via /proc as this
    // user, which is exactly the "can't resolve it" case being tested.
    // A definitely-nonexistent PID is more portable across both platforms.
    const nonExistentPid = 999_999;
    await expect(getProcessCwd(nonExistentPid)).resolves.toBeNull();
  });
});
