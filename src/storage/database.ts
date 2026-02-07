import Database, { type Database as DatabaseType } from 'better-sqlite3';
import { join } from 'path';
import { homedir } from 'os';
import { mkdirSync, existsSync } from 'fs';

const storageDir = join(homedir(), 'mcp-servers', 'calendar', 'storage');
if (!existsSync(storageDir)) {
  mkdirSync(storageDir, { recursive: true });
}

const dbPath = join(storageDir, 'calendar.db');
export const db: DatabaseType = new Database(dbPath);

// Enable foreign keys
db.pragma('foreign_keys = ON');

// Templates table
db.exec(`
  CREATE TABLE IF NOT EXISTS templates (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE NOT NULL,
    summary TEXT NOT NULL,
    duration INTEGER NOT NULL,
    location TEXT,
    description TEXT,
    alarm_offset INTEGER,
    calendar TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

// History for undo operations
db.exec(`
  CREATE TABLE IF NOT EXISTS history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    action_type TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id TEXT,
    previous_state TEXT,
    new_state TEXT,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

// Settings/preferences
db.exec(`
  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

// Initialize default settings
const initSettings = db.prepare(`
  INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)
`);

initSettings.run('default_calendar', 'life');
initSettings.run('default_event_duration', '3600000'); // 1 hour in ms
initSettings.run('business_hours_start', '9');
initSettings.run('business_hours_end', '17');

/**
 * Get a setting value
 */
export function getSetting(key: string): string | null {
  const stmt = db.prepare('SELECT value FROM settings WHERE key = ?');
  const row = stmt.get(key) as { value: string } | undefined;
  return row?.value || null;
}

/**
 * Set a setting value
 */
export function setSetting(key: string, value: string): void {
  const stmt = db.prepare(`
    INSERT INTO settings (key, value, updated_at)
    VALUES (?, ?, CURRENT_TIMESTAMP)
    ON CONFLICT(key) DO UPDATE SET
      value = excluded.value,
      updated_at = CURRENT_TIMESTAMP
  `);
  stmt.run(key, value);
}

/**
 * Record an action in history for undo
 */
export function recordHistory(
  actionType: string,
  entityType: string,
  entityId: string,
  previousState: any,
  newState: any
): void {
  const stmt = db.prepare(`
    INSERT INTO history (action_type, entity_type, entity_id, previous_state, new_state)
    VALUES (?, ?, ?, ?, ?)
  `);
  stmt.run(
    actionType,
    entityType,
    entityId,
    JSON.stringify(previousState),
    JSON.stringify(newState)
  );
}

/**
 * Get the most recent history entry
 */
export function getLastHistory(): any {
  const stmt = db.prepare(`
    SELECT * FROM history
    ORDER BY timestamp DESC
    LIMIT 1
  `);
  return stmt.get();
}

/**
 * Clean up old history (keep last 100 entries)
 */
export function cleanupHistory(): void {
  db.exec(`
    DELETE FROM history
    WHERE id NOT IN (
      SELECT id FROM history
      ORDER BY timestamp DESC
      LIMIT 100
    )
  `);
}

// Close database on process exit
process.on('exit', () => {
  db.close();
});
