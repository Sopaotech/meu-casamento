import {
  closeSync, constants, fsyncSync, lstatSync, openSync, readFileSync, readSync,
  realpathSync, writeFileSync, type Stats,
} from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';

type LimitResult =
  | { state: 'ok' }
  | { state: 'blocked'; retryAfterSeconds: number }
  | { state: 'unavailable' };

const WINDOW_MS = 15 * 60 * 1000;
const MAX_FAILURES = 8;
const BUSY_TIMEOUT_MS = 250;
const APPLICATION_ID = 0x4e56524c;
const VERSION = 1;
const BASE_NAME = '.noivara-homologation-basic-rate-v1';
const DATABASE_NAME = `${BASE_NAME}.sqlite`;
const MARKER_NAME = `${BASE_NAME}.initialized`;
const MARKER = 'noivara-homologation-basic-rate-limit-v1\n';
const TABLE = 'noivara_basic_failures';
const SCHEMA = `CREATE TABLE ${TABLE} (occurred_at_ms INTEGER NOT NULL CHECK (typeof(occurred_at_ms) = 'integer' AND occurred_at_ms >= 0)) STRICT`;

function inside(parent: string, child: string): boolean {
  const relative = path.relative(parent, child);
  return relative === '' || (relative !== '..' && !relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative));
}

function overlaps(first: string, second: string): boolean {
  return inside(first, second) || inside(second, first);
}

function optionalStat(filename: string): Stats | null {
  try {
    return lstatSync(filename);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return null;
    throw error;
  }
}

// Resolve any existing symlink in a configured photo path, even if its last
// component has not been created yet. The limiter's own path rejects symlinks.
function projectedRealPath(filename: string): string {
  let current = path.resolve(filename);
  const remaining: string[] = [];
  while (true) {
    try {
      return path.resolve(realpathSync(current), ...remaining);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
      const parent = path.dirname(current);
      if (parent === current) throw error;
      remaining.unshift(path.basename(current));
      current = parent;
    }
  }
}

function privateOwnerAndMode(stat: Stats, mode: number): boolean {
  // Windows does not expose NTFS ACLs through stat(). Local synthetic tests are
  // allowed there, but production must use Linux, where ownership is verifiable.
  if (process.platform === 'win32') return process.env.NODE_ENV !== 'production';
  return typeof process.getuid === 'function' && stat.uid === process.getuid()
    && (stat.mode & 0o777) === mode;
}

function safeDirectory(): string {
  const configured = process.env.NOIVARA_HOMOLOG_RATE_LIMIT_DIR;
  if (!configured || !path.isAbsolute(configured) || configured.includes('\0')) throw new Error();
  if (process.platform === 'win32' && configured.startsWith('\\\\')) throw new Error();
  const directory = path.resolve(configured);
  const root = path.parse(directory).root;
  if (directory === root) throw new Error();

  // Reject symlinks/junctions in every component, not just in the final name.
  let current = root;
  for (const component of path.relative(root, directory).split(path.sep).filter(Boolean)) {
    current = path.join(current, component);
    const stat = lstatSync(current);
    if (stat.isSymbolicLink() || !stat.isDirectory()) throw new Error();
  }
  const stat = lstatSync(directory);
  if (!privateOwnerAndMode(stat, 0o700)) throw new Error();

  const project = projectedRealPath(process.cwd());
  const publicDir = projectedRealPath(path.join(process.cwd(), 'public'));
  const defaultMediaDir = projectedRealPath(path.join(process.cwd(), '.local-media'));
  const actual = realpathSync(directory);
  if (overlaps(actual, publicDir) || overlaps(actual, defaultMediaDir)) throw new Error();
  if (process.env.NODE_ENV === 'production' && inside(project, actual)) throw new Error();
  const photo = process.env.PHOTO_STORAGE_DIR;
  if (photo) {
    if (!path.isAbsolute(photo)) throw new Error();
    if (overlaps(actual, projectedRealPath(photo))) throw new Error();
  }
  return actual;
}

function safeFile(filename: string): Stats | null {
  const stat = optionalStat(filename);
  if (stat && (!stat.isFile() || stat.isSymbolicLink() || stat.nlink !== 1
    || !privateOwnerAndMode(stat, 0o600))) throw new Error();
  return stat;
}

function noUnexpectedSidecars(filename: string): void {
  // WAL was never configured for this database; do not touch unknown sidecars.
  if (optionalStat(`${filename}-wal`) || optionalStat(`${filename}-shm`)) throw new Error();
  safeFile(`${filename}-journal`);
}

function createPrivateFile(filename: string): number {
  return openSync(filename, constants.O_CREAT | constants.O_EXCL | constants.O_WRONLY
    | (constants.O_NOFOLLOW ?? 0), 0o600);
}

function createState(databaseName: string, markerName: string): void {
  if (optionalStat(`${databaseName}-journal`) || optionalStat(`${databaseName}-wal`)
    || optionalStat(`${databaseName}-shm`)) throw new Error();

  // Create the marker first. Interrupted initialization remains unavailable
  // until an operator investigates; a missing database is never silently reset.
  const markerFd = createPrivateFile(markerName);
  try {
    writeFileSync(markerFd, MARKER, 'utf8');
    fsyncSync(markerFd);
  } finally {
    closeSync(markerFd);
  }
  const databaseFd = createPrivateFile(databaseName);
  closeSync(databaseFd);
  const db = new DatabaseSync(databaseName, { timeout: BUSY_TIMEOUT_MS });
  let transaction = false;
  try {
    db.exec('BEGIN IMMEDIATE');
    transaction = true;
    db.exec(`PRAGMA application_id = ${APPLICATION_ID}; PRAGMA user_version = ${VERSION}; ${SCHEMA}`);
    db.exec('COMMIT');
    transaction = false;
  } catch (error) {
    try { if (transaction) db.exec('ROLLBACK'); } catch { /* Leave interrupted state unavailable. */ }
    throw error;
  } finally {
    try { db.close(); } catch { /* Fail closed; the caller never logs filesystem details. */ }
  }
}

function verifyHeader(filename: string, stat: Stats): void {
  if (stat.size < 100 || stat.size > 16 * 1024 * 1024) throw new Error();
  const fd = openSync(filename, constants.O_RDONLY | (constants.O_NOFOLLOW ?? 0));
  try {
    const header = Buffer.alloc(100);
    if (readSync(fd, header, 0, header.length, 0) !== header.length
      || header.subarray(0, 16).toString('binary') !== 'SQLite format 3\0'
      || header[18] !== 1 || header[19] !== 1
      || header.readUInt32BE(60) !== VERSION || header.readUInt32BE(68) !== APPLICATION_ID) throw new Error();
  } finally {
    closeSync(fd);
  }
}

function verifySchema(db: DatabaseSync): void {
  const schema = db.prepare('SELECT type, name, tbl_name, sql FROM sqlite_schema').all();
  if (schema.length !== 1 || schema[0].type !== 'table' || schema[0].name !== TABLE
    || schema[0].tbl_name !== TABLE || schema[0].sql !== SCHEMA) throw new Error();
}

function stateFile(): string {
  const directory = safeDirectory();
  const marker = path.join(directory, MARKER_NAME);
  const database = path.join(directory, DATABASE_NAME);
  let markerStat = safeFile(marker);
  let databaseStat = safeFile(database);
  if (!markerStat && !databaseStat) {
    createState(database, marker);
    markerStat = safeFile(marker);
    databaseStat = safeFile(database);
  }
  if (!markerStat || !databaseStat || markerStat.size !== Buffer.byteLength(MARKER)
    || readFileSync(marker, 'utf8') !== MARKER) throw new Error();
  noUnexpectedSidecars(database);
  verifyHeader(database, databaseStat);

  // Inspect an existing database read-only before opening it for writing. A
  // foreign schema or interrupted/hot journal must never be repaired here.
  const readOnly = new DatabaseSync(database, { readOnly: true, timeout: BUSY_TIMEOUT_MS });
  try {
    verifySchema(readOnly);
  } finally {
    readOnly.close();
  }
  return database;
}

/**
 * Global sliding window for the Basic perimeter. No credentials or request
 * headers reach this module. Persistent storage is required; there is no
 * process-local fallback. Every error intentionally fails closed without logs.
 */
export function limitHomologationBasic(denied: boolean): LimitResult {
  let db: DatabaseSync | undefined;
  let transaction = false;
  try {
    if (typeof denied !== 'boolean') throw new Error();
    const filename = stateFile();
    db = new DatabaseSync(filename, { timeout: BUSY_TIMEOUT_MS });
    db.exec('BEGIN IMMEDIATE');
    transaction = true;
    verifySchema(db);
    const now = Date.now();
    if (!Number.isSafeInteger(now) || now < 0) throw new Error();
    const rows = db.prepare(`SELECT occurred_at_ms FROM ${TABLE} ORDER BY occurred_at_ms LIMIT ?`).all(MAX_FAILURES + 1);
    if (rows.length > MAX_FAILURES) throw new Error();
    const timestamps = rows.map(row => row.occurred_at_ms);
    if (timestamps.some(value => typeof value !== 'number' || !Number.isSafeInteger(value) || value < 0)) throw new Error();
    const active = (timestamps as number[]).filter(value => value > now - WINDOW_MS);
    if (active.length < MAX_FAILURES && denied) {
      db.prepare(`DELETE FROM ${TABLE} WHERE occurred_at_ms <= ?`).run(now - WINDOW_MS);
      db.prepare(`INSERT INTO ${TABLE} (occurred_at_ms) VALUES (?)`).run(now);
      active.push(now);
      active.sort((a, b) => a - b);
    }
    const result: LimitResult = active.length >= MAX_FAILURES
      ? { state: 'blocked', retryAfterSeconds: Math.max(1, Math.ceil((active[0] + WINDOW_MS - now) / 1000)) }
      : { state: 'ok' };
    db.exec('COMMIT');
    transaction = false;
    return result;
  } catch {
    try { if (db && transaction) db.exec('ROLLBACK'); } catch { /* Remain unavailable. */ }
    return { state: 'unavailable' };
  } finally {
    try { db?.close(); } catch { /* No filesystem or credential details in logs. */ }
  }
}
