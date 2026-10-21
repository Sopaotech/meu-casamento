import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import path from 'node:path';

vi.mock('server-only', () => ({}));
import { LocalPhotoStorage } from '../src/lib/photo-storage';

const key = 'a'.repeat(64);
describe('configuração de mídia da homologação', () => {
  beforeEach(() => {
    vi.stubEnv('NODE_ENV', 'test');
    vi.stubEnv('APP_URL', 'http://127.0.0.1:3000');
    vi.stubEnv('NOIVARA_HOMOLOGACAO', '1');
    vi.stubEnv('NOIVARA_HOMOLOG_USUARIO', 'viewer');
    vi.stubEnv('NOIVARA_HOMOLOG_SENHA', 'SYNTHETIC-test-password-0123456789');
    vi.stubEnv('NOIVARA_HOMOLOG_CONTA_ID', 'demo_account');
  });
  afterEach(() => vi.unstubAllEnvs());

  it('recusa o fallback, um diretório relativo e o padrão .local-media', async () => {
    vi.stubEnv('PHOTO_STORAGE_DIR', '');
    await expect(new LocalPhotoStorage().write(key, Buffer.from('x'))).rejects.toThrow();
    vi.stubEnv('PHOTO_STORAGE_DIR', 'relative');
    await expect(new LocalPhotoStorage().write(key, Buffer.from('x'))).rejects.toThrow();
    vi.stubEnv('PHOTO_STORAGE_DIR', path.join(process.cwd(), '.local-media'));
    await expect(new LocalPhotoStorage().write(key, Buffer.from('x'))).rejects.toThrow();
    vi.stubEnv('PHOTO_STORAGE_DIR', path.join(process.cwd(), '.local-media', 'nested'));
    await expect(new LocalPhotoStorage().write(key, Buffer.from('x'))).rejects.toThrow();
  });

  it('recusa um armazenamento cujo caminho difere do configurado', async () => {
    vi.stubEnv('PHOTO_STORAGE_DIR', path.join(process.cwd(), '.tmp', 'configured-media'));
    const storage = new LocalPhotoStorage(path.join(process.cwd(), '.tmp', 'different-media'));
    await expect(storage.write(key, Buffer.from('x'))).rejects.toThrow();
  });
});
