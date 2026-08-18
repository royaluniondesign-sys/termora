/**
 * Formats an ISO-ish timestamp as a short relative label ("just now", "5m ago",
 * "3h ago", "2d ago"). SQLite's `datetime('now')` omits the trailing 'Z', so
 * this always appends one before parsing — without it Date treats the string
 * as local time and the "just now" device would show as hours off.
 */
export function formatRelativeTime(sqliteTimestamp: string): string {
  const iso = sqliteTimestamp.endsWith('Z') ? sqliteTimestamp : `${sqliteTimestamp}Z`;
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return sqliteTimestamp;

  const seconds = Math.max(0, Math.floor((Date.now() - then) / 1000));
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${String(minutes)}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${String(hours)}h ago`;
  const days = Math.floor(hours / 24);
  return `${String(days)}d ago`;
}
