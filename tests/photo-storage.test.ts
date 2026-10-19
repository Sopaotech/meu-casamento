import { mkdtemp, mkdir, readFile, rmdir, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));
import { LocalPhotoStorage } from '../src/lib/photo-storage';

describe('armazenamento privado em disco', () => {
  let directory: string;
  const key = 'a'.repeat(64);
  beforeAll(async () => {
    await mkdir(path.join(process.cwd(), '.tmp'), { recursive: true });
    directory = await mkdtemp(path.join(process.cwd(), '.tmp', 'photo-storage-test-'));
  });
  afterAll(async () => {
    await unlink(path.join(directory, key)).catch(() => {});
    await unlink(path.join(directory, 'not-a-directory')).catch(() => {});
    await rmdir(directory);
  });

  it('grava e lê bytes no diretório privado e impede sobrescrita', async () => {
    const storage = new LocalPhotoStorage(directory);
    const bytes = Buffer.from('foto');
    await storage.write(key, bytes);
    expect(await readFile(path.join(directory, key))).toEqual(bytes);
    expect(await storage.read(key)).toEqual(bytes);
    await expect(storage.write(key, Buffer.from('outra'))).rejects.toMatchObject({ code: 'EEXIST' });
    expect(await storage.read(key)).toEqual(bytes);
  });

  it('rejeita traversal, diretório relativo e diretório público', async () => {
    await expect(new LocalPhotoStorage(directory).read('../private')).rejects.toThrow();
    await expect(new LocalPhotoStorage('relative').write(key, Buffer.from('x'))).rejects.toThrow();
    await expect(new LocalPhotoStorage(path.join(process.cwd(), 'public')).write(key, Buffer.from('x'))).rejects.toThrow();
  });

  it('propaga falhas de gravação sem declarar sucesso', async () => {
    const file = path.join(directory, 'not-a-directory');
    await writeFile(file, 'x');
    await expect(new LocalPhotoStorage(path.join(file, 'photos')).write(key, Buffer.from('x'))).rejects.toThrow();
  });
});
