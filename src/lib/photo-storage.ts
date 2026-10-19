import 'server-only';
import { mkdir, readFile, realpath, writeFile } from 'node:fs/promises';
import path from 'node:path';

/** Keys are opaque, server-generated identifiers, never user-supplied paths. */
export interface PhotoStorage {
  write(key: string, data: Uint8Array): Promise<void>;
  read(key: string): Promise<Buffer>;
}

function validKey(key: string): boolean {
  return /^[a-f0-9]{64}$/.test(key);
}

function isInside(parent: string, child: string): boolean {
  const relative = path.relative(parent, child);
  return relative === '' || (!relative.startsWith(`..${path.sep}`) && relative !== '..' && !path.isAbsolute(relative));
}

export class LocalPhotoStorage implements PhotoStorage {
  constructor(private readonly directory: string = process.env.PHOTO_STORAGE_DIR || path.join(process.cwd(), '.local-media')) {}

  private async filename(key: string): Promise<string> {
    if (!validKey(key) || !path.isAbsolute(this.directory)) throw new Error('Invalid photo storage configuration or key');
    await mkdir(this.directory, { recursive: true, mode: 0o700 });
    const root = await realpath(this.directory);
    const publicDirectory = await realpath(path.join(process.cwd(), 'public'));
    if (isInside(publicDirectory, root)) throw new Error('Private photo storage must be outside public');
    return path.join(root, key);
  }

  async write(key: string, data: Uint8Array): Promise<void> {
    await writeFile(await this.filename(key), data, { flag: 'wx', mode: 0o600 });
  }

  async read(key: string): Promise<Buffer> {
    return readFile(await this.filename(key));
  }
}

export const photoStorage: PhotoStorage = new LocalPhotoStorage();
