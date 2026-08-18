import { describe, it, expect } from 'vitest';
import { formatRelativeTime } from '../format-relative-time.js';

describe('formatRelativeTime', () => {
  it('formats a timestamp from a few seconds ago as "just now"', () => {
    const now = new Date(Date.now() - 5_000).toISOString().replace('Z', '');
    expect(formatRelativeTime(now)).toBe('just now');
  });

  it('formats a timestamp from a few minutes ago', () => {
    const fiveMinAgo = new Date(Date.now() - 5 * 60_000).toISOString().replace('Z', '');
    expect(formatRelativeTime(fiveMinAgo)).toBe('5m ago');
  });

  it('formats a timestamp from a few hours ago', () => {
    const threeHoursAgo = new Date(Date.now() - 3 * 60 * 60_000).toISOString().replace('Z', '');
    expect(formatRelativeTime(threeHoursAgo)).toBe('3h ago');
  });

  it('formats a timestamp from a few days ago', () => {
    const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60_000).toISOString().replace('Z', '');
    expect(formatRelativeTime(twoDaysAgo)).toBe('2d ago');
  });

  it('treats a naive SQLite timestamp (no Z) as UTC, not local time', () => {
    const nowUtcNoZ = new Date().toISOString().replace('Z', '');
    expect(formatRelativeTime(nowUtcNoZ)).toBe('just now');
  });
});
