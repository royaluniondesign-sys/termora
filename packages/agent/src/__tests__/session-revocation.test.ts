import { describe, it, expect, afterEach } from 'vitest';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { rmSync } from 'node:fs';
import { randomBytes } from 'node:crypto';
import Database from 'better-sqlite3';
import { initDatabase } from '../db.js';

/**
 * Sessions were tracked in the database (id, jwt_id, created_at, last_seen)
 * but nothing ever wrote to that table, and JWT verification never checked
 * it — a JWT stayed valid for its full 7-day life with no way to revoke a
 * single device's access short of rotating the shared secret (which logs
 * out every device at once). listSessions/deleteSession close that gap.
 */

function tempDbPath(): string {
  return join(tmpdir(), `termora-sessions-${randomBytes(6).toString('hex')}.db`);
}

describe('session tracking', () => {
  const dbPath = tempDbPath();
  const cleanupPaths = [dbPath, `${dbPath}-wal`, `${dbPath}-shm`];

  afterEach(() => {
    for (const p of cleanupPaths) rmSync(p, { force: true });
  });

  it('records a device session and lists it', () => {
    const { statements } = initDatabase(dbPath);
    statements.insertSession.run('jti-1', 'jti-1', 'iPhone · Safari');

    const rows = statements.listSessions.all();
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ id: 'jti-1', device_name: 'iPhone · Safari' });
  });

  it('deleting a session removes it from the list', () => {
    const { statements } = initDatabase(dbPath);
    statements.insertSession.run('jti-1', 'jti-1', 'iPhone');
    statements.insertSession.run('jti-2', 'jti-2', 'iPad');

    statements.deleteSession.run('jti-1');

    const rows = statements.listSessions.all();
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ id: 'jti-2' });
  });

  it('getSession returns null for a revoked (deleted) session', () => {
    const { statements } = initDatabase(dbPath);
    statements.insertSession.run('jti-1', 'jti-1', 'iPhone');
    statements.deleteSession.run('jti-1');

    expect(statements.getSession.get('jti-1')).toBeUndefined();
  });

  it('migrates an older database that still has the `email` column', () => {
    // Simulate a pre-migration database: create the old schema by hand,
    // insert a row under the old column name, then open it through
    // initDatabase and confirm the data survives under device_name.
    const db = new Database(dbPath);
    db.exec(`
      CREATE TABLE sessions (
        id TEXT PRIMARY KEY,
        jwt_id TEXT NOT NULL,
        email TEXT NOT NULL DEFAULT '',
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        last_seen TEXT NOT NULL DEFAULT (datetime('now'))
      );
    `);
    db.prepare('INSERT INTO sessions (id, jwt_id, email) VALUES (?, ?, ?)').run('old-jti', 'old-jti', 'legacy-label');
    db.close();

    const { statements } = initDatabase(dbPath);
    const rows = statements.listSessions.all();
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ id: 'old-jti', device_name: 'legacy-label' });
  });
});
