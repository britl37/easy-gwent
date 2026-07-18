#!/usr/bin/env node
/**
 * WAL-safe online backup of the gwent SQLite DB using better-sqlite3's
 * backup API (safe while the server is running). Writes gzipped,
 * timestamped copies and prunes old ones.
 *
 * Usage: node packages/server/scripts/backup-db.mjs [--keep N]
 * Env:   GWENT_DB (default packages/server/data/gwent.sqlite)
 *        GWENT_BACKUP_DIR (default ~/gwent-backups)
 */
import Database from 'better-sqlite3';
import { createReadStream, createWriteStream } from 'node:fs';
import { mkdir, readdir, unlink, stat } from 'node:fs/promises';
import { homedir } from 'node:os';
import path from 'node:path';
import { pipeline } from 'node:stream/promises';
import { fileURLToPath } from 'node:url';
import { createGzip } from 'node:zlib';

const here = path.dirname(fileURLToPath(import.meta.url));
const dbPath = process.env.GWENT_DB ?? path.resolve(here, '../data/gwent.sqlite');
const outDir = process.env.GWENT_BACKUP_DIR ?? path.join(homedir(), 'gwent-backups');
const keepIdx = process.argv.indexOf('--keep');
const keep = keepIdx > -1 ? Math.max(1, Number(process.argv[keepIdx + 1]) || 14) : 14;

await mkdir(outDir, { recursive: true });

const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
const rawPath = path.join(outDir, `gwent-${stamp}.sqlite`);
const gzPath = `${rawPath}.gz`;

// Online backup (checkpoints WAL into the copy; source stays live).
const db = new Database(dbPath, { readonly: true });
try {
  await db.backup(rawPath);
} finally {
  db.close();
}

// Verify the copy opens and passes a quick integrity check, then gzip it.
const check = new Database(rawPath, { readonly: true });
const result = check.pragma('integrity_check', { simple: true });
check.close();
if (result !== 'ok') {
  console.error(`integrity_check failed on backup: ${result}`);
  process.exit(1);
}

await pipeline(createReadStream(rawPath), createGzip({ level: 9 }), createWriteStream(gzPath));
await unlink(rawPath);
// Remove WAL sidecars created by opening the copy for the integrity check.
for (const suffix of ['-shm', '-wal']) {
  await unlink(`${rawPath}${suffix}`).catch(() => {});
}
const { size } = await stat(gzPath);
console.log(`backup ok: ${gzPath} (${(size / 1024).toFixed(1)} kB)`);

// Prune: keep the newest `keep` backups.
const files = (await readdir(outDir))
  .filter((f) => /^gwent-.*\.sqlite\.gz$/.test(f))
  .sort()
  .reverse();
for (const f of files.slice(keep)) {
  await unlink(path.join(outDir, f));
  console.log(`pruned: ${f}`);
}
