import fs from 'node:fs';
import path from 'node:path';
import Database from 'better-sqlite3';

export type Db = Database.Database;

const SCHEMA = `
CREATE TABLE IF NOT EXISTS users (
  id            TEXT PRIMARY KEY,
  username      TEXT NOT NULL COLLATE NOCASE UNIQUE,
  password_hash TEXT NOT NULL,
  created_at    INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS sessions (
  token_hash TEXT PRIMARY KEY,
  user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at INTEGER NOT NULL,
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS user_stats (
  user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  wins    INTEGER NOT NULL DEFAULT 0,
  losses  INTEGER NOT NULL DEFAULT 0,
  draws   INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS matches (
  id           TEXT PRIMARY KEY,
  room_id      TEXT NOT NULL UNIQUE,
  p0_user_id   TEXT NOT NULL,
  p1_user_id   TEXT NOT NULL,
  winner       TEXT,
  outcome      TEXT NOT NULL,
  finished_at  INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_stats_wins ON user_stats(wins DESC);
`;

export function openDb(dbPath: string): Db {
  fs.mkdirSync(path.dirname(dbPath), { recursive: true });
  const db = new Database(dbPath);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  db.exec(SCHEMA);
  return db;
}
