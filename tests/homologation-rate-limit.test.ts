import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  chmodSync, closeSync, existsSync, linkSync, mkdirSync, mkdtempSync, openSync,
  readFileSync, realpathSync, rmSync, symlinkSync, unlinkSync, writeFileSync,
} from 'node:fs';
import { execFile } from 'node:child_process';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { pathToFileURL } from 'node:url';
import { promisify } from 'node:util';
import { limitHomologationBasic } from '../src/lib/homologation-rate-limit';

const execFileAsync = promisify(execFile);
const databaseName = '.noivara-homologation-basic-rate-v1.sqlite';
const markerName = '.noivara-homologation-basic-rate-v1.initialized';
const markerText = 'noivara-homologation-basic-rate-limit-v1\n';
const tempParent = path.resolve(process.cwd(), '.tmp');
let temporaryDirectory = '';

function database(): string { return path.join(temporaryDirectory, databaseName); }
function marker(): string { return path.join(temporaryDirectory, markerName); }

function subprocess(denied: boolean): Promise<{ state: string; retryAfterSeconds?: number }> {
  const moduleUrl = pathToFileURL(path.resolve(process.cwd(), 'src/lib/homologation-rate-limit.ts')).href;
  const code = `import { limitHomologationBasic } from ${JSON.stringify(moduleUrl)};
    let result;
    for (let i = 0; i < 120; i++) {
      result = limitHomologationBasic(${denied});
      if (result.state !== 'unavailable') break;
      Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 25);
    }
    process.stdout.write(JSON.stringify(result));`;
  return execFileAsync(process.execPath,
    ['--disable-warning=ExperimentalWarning', '--input-type=module', '-e', code],
    {
      cwd: process.cwd(),
      env: {
        PATH: process.env.PATH, SystemRoot: process.env.SystemRoot, WINDIR: process.env.WINDIR,
        NODE_ENV: 'test', PHOTO_STORAGE_DIR: '', NOIVARA_HOMOLOG_RATE_LIMIT_DIR: temporaryDirectory,
      },
      timeout: 15_000,
    }).then(result => JSON.parse(result.stdout));
}

beforeEach(() => {
  mkdirSync(tempParent, { recursive: true });
  temporaryDirectory = mkdtempSync(path.join(tempParent, 'c013b1-rate-test-'));
  vi.stubEnv('NODE_ENV', 'test');
  vi.stubEnv('PHOTO_STORAGE_DIR', '');
  vi.stubEnv('NOIVARA_HOMOLOG_RATE_LIMIT_DIR', temporaryDirectory);
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllEnvs();
  const workspaceReal = realpathSync(process.cwd());
  const parentReal = realpathSync(tempParent);
  const fixtureReal = realpathSync(temporaryDirectory);
  const relative = path.relative(parentReal, fixtureReal);
  if (path.relative(workspaceReal, parentReal) === '.tmp'
    && relative.startsWith('c013b1-rate-test-') && !relative.includes(path.sep)
    && path.dirname(fixtureReal) === parentReal) {
    rmSync(fixtureReal, { recursive: true, force: true });
  } else {
    throw new Error('Refusing to remove a directory outside this test fixture');
  }
});

describe('limitação global do Basic de homologação', () => {
  it('aplica janela deslizante de oito falhas e o sucesso não limpa falhas', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2031-01-01T12:00:00.000Z'));
    for (let i = 0; i < 7; i++) expect(limitHomologationBasic(true)).toEqual({ state: 'ok' });
    expect(limitHomologationBasic(false)).toEqual({ state: 'ok' });
    vi.advanceTimersByTime(14 * 60 * 1000);
    expect(limitHomologationBasic(true)).toEqual({ state: 'blocked', retryAfterSeconds: 60 });
    expect(limitHomologationBasic(false)).toEqual({ state: 'blocked', retryAfterSeconds: 60 });
    vi.advanceTimersByTime(60 * 1000);
    expect(limitHomologationBasic(false)).toEqual({ state: 'ok' });
    for (let i = 0; i < 6; i++) expect(limitHomologationBasic(true)).toEqual({ state: 'ok' });
    expect(limitHomologationBasic(true).state).toBe('blocked');
  });

  it('conserva falhas e bloqueio em outro processo', async () => {
    for (let i = 0; i < 7; i++) expect(limitHomologationBasic(true).state).toBe('ok');
    expect((await subprocess(true)).state).toBe('blocked');
    expect((await subprocess(false)).state).toBe('blocked');
  }, 20_000);

  it('serializa falhas simultâneas de processos diferentes', async () => {
    expect(limitHomologationBasic(false)).toEqual({ state: 'ok' });
    const results = await Promise.all(Array.from({ length: 10 }, () => subprocess(true)));
    expect(results.filter(result => result.state === 'ok')).toHaveLength(7);
    expect(results.filter(result => result.state === 'blocked')).toHaveLength(3);
    const db = new DatabaseSync(database(), { readOnly: true });
    try {
      expect(db.prepare('SELECT count(*) AS total FROM noivara_basic_failures').get()?.total).toBe(8);
    } finally { db.close(); }
  }, 25_000);

  it('reverte transação interrompida e não mantém bloqueios indevidos', () => {
    expect(limitHomologationBasic(false)).toEqual({ state: 'ok' });
    const original = DatabaseSync.prototype.exec;
    let failCommit = true;
    const spy = vi.spyOn(DatabaseSync.prototype, 'exec').mockImplementation(function (this: DatabaseSync, sql: string) {
      if (sql === 'COMMIT' && failCommit) {
        failCommit = false;
        throw new Error('synthetic commit failure');
      }
      return original.call(this, sql);
    });
    try {
      expect(limitHomologationBasic(true)).toEqual({ state: 'unavailable' });
    } finally { spy.mockRestore(); }
    expect(limitHomologationBasic(false)).toEqual({ state: 'ok' });
    const db = new DatabaseSync(database(), { readOnly: true });
    try {
      expect(db.prepare('SELECT count(*) AS total FROM noivara_basic_failures').get()?.total).toBe(0);
    } finally { db.close(); }
  });

  it('aceita somente diretório dedicado, existente e absoluto, fora da mídia e public', () => {
    vi.stubEnv('NOIVARA_HOMOLOG_RATE_LIMIT_DIR', 'relative');
    expect(limitHomologationBasic(true)).toEqual({ state: 'unavailable' });
    const missing = path.join(temporaryDirectory, 'missing');
    vi.stubEnv('NOIVARA_HOMOLOG_RATE_LIMIT_DIR', missing);
    expect(limitHomologationBasic(true)).toEqual({ state: 'unavailable' });
    expect(existsSync(missing)).toBe(false);
    vi.stubEnv('NOIVARA_HOMOLOG_RATE_LIMIT_DIR', process.cwd());
    expect(limitHomologationBasic(true)).toEqual({ state: 'unavailable' });
    vi.stubEnv('NOIVARA_HOMOLOG_RATE_LIMIT_DIR', temporaryDirectory);
    vi.stubEnv('PHOTO_STORAGE_DIR', temporaryDirectory);
    expect(limitHomologationBasic(true)).toEqual({ state: 'unavailable' });
    vi.stubEnv('PHOTO_STORAGE_DIR', path.join(temporaryDirectory, 'photo-child'));
    expect(limitHomologationBasic(true)).toEqual({ state: 'unavailable' });
    expect(existsSync(database())).toBe(false);
  });

  it('recusa diretório ligado por symlink ou junction', () => {
    const target = path.join(temporaryDirectory, 'target');
    const alias = path.join(temporaryDirectory, 'alias');
    mkdirSync(target, { mode: 0o700 });
    symlinkSync(target, alias, process.platform === 'win32' ? 'junction' : 'dir');
    vi.stubEnv('NOIVARA_HOMOLOG_RATE_LIMIT_DIR', alias);
    expect(limitHomologationBasic(true)).toEqual({ state: 'unavailable' });
    expect(existsSync(path.join(target, databaseName))).toBe(false);
  });

  it.skipIf(process.platform === 'win32')('recusa diretório não privado em sistemas POSIX', () => {
    chmodSync(temporaryDirectory, 0o755);
    try {
      expect(limitHomologationBasic(true)).toEqual({ state: 'unavailable' });
      expect(existsSync(database())).toBe(false);
    } finally { chmodSync(temporaryDirectory, 0o700); }
  });

  it('não recria silenciosamente um estado parcialmente perdido', () => {
    expect(limitHomologationBasic(true).state).toBe('ok');
    unlinkSync(database());
    expect(limitHomologationBasic(true)).toEqual({ state: 'unavailable' });
    expect(existsSync(database())).toBe(false);
    expect(existsSync(marker())).toBe(true);
  });

  it('recusa banco sem marcador e preserva seus bytes', () => {
    expect(limitHomologationBasic(true).state).toBe('ok');
    unlinkSync(marker());
    const before = readFileSync(database());
    expect(limitHomologationBasic(true)).toEqual({ state: 'unavailable' });
    expect(readFileSync(database()).equals(before)).toBe(true);
    expect(existsSync(marker())).toBe(false);
  });

  it('não modifica banco SQLite estrangeiro, mesmo com identificadores iguais', () => {
    writeFileSync(marker(), markerText, { flag: 'wx', mode: 0o600 });
    closeSync(openSync(database(), 'wx', 0o600));
    const foreign = new DatabaseSync(database());
    try {
      foreign.exec('PRAGMA application_id = 1314280012; PRAGMA user_version = 1; CREATE TABLE foreign_data (value TEXT NOT NULL); INSERT INTO foreign_data VALUES (\'SYNTHETIC-foreign-data\')');
    } finally { foreign.close(); }
    const before = readFileSync(database());
    expect(limitHomologationBasic(true)).toEqual({ state: 'unavailable' });
    expect(readFileSync(database()).equals(before)).toBe(true);
  });

  it('recusa corrupção, inicialização interrompida e sidecar desconhecido sem alterá-los', () => {
    writeFileSync(marker(), markerText, { flag: 'wx', mode: 0o600 });
    writeFileSync(database(), 'SYNTHETIC-incomplete-database', { flag: 'wx', mode: 0o600 });
    const before = readFileSync(database());
    expect(limitHomologationBasic(true)).toEqual({ state: 'unavailable' });
    expect(readFileSync(database()).equals(before)).toBe(true);
    unlinkSync(database());
    unlinkSync(marker());
    expect(limitHomologationBasic(true).state).toBe('ok');
    const wal = `${database()}-wal`;
    writeFileSync(wal, 'SYNTHETIC-foreign-sidecar', { flag: 'wx', mode: 0o600 });
    const validBefore = readFileSync(database());
    expect(limitHomologationBasic(true)).toEqual({ state: 'unavailable' });
    expect(readFileSync(database()).equals(validBefore)).toBe(true);
    expect(readFileSync(wal, 'utf8')).toBe('SYNTHETIC-foreign-sidecar');
  });

  it('recusa hardlink do banco sem tocar o arquivo original', () => {
    writeFileSync(marker(), markerText, { flag: 'wx', mode: 0o600 });
    const original = path.join(temporaryDirectory, 'foreign-original');
    writeFileSync(original, 'SYNTHETIC-foreign-data', { flag: 'wx', mode: 0o600 });
    linkSync(original, database());
    expect(limitHomologationBasic(true)).toEqual({ state: 'unavailable' });
    expect(readFileSync(original, 'utf8')).toBe('SYNTHETIC-foreign-data');
  });

  it('armazena somente instantes, sem credenciais', () => {
    const secret = 'SYNTHETIC-perimeter-secret-never-written';
    vi.stubEnv('NOIVARA_HOMOLOG_SENHA', secret);
    expect(limitHomologationBasic(true)).toEqual({ state: 'ok' });
    const raw = readFileSync(database());
    expect(raw.includes(Buffer.from(secret))).toBe(false);
    const db = new DatabaseSync(database(), { readOnly: true });
    try {
      const rows = db.prepare('SELECT * FROM noivara_basic_failures').all();
      expect(rows).toHaveLength(1);
      expect(Object.keys(rows[0])).toEqual(['occurred_at_ms']);
      expect(typeof rows[0].occurred_at_ms).toBe('number');
    } finally { db.close(); }
  });
});
