import { describe, expect, it, vi } from 'vitest';
import sharp from 'sharp';
vi.mock('server-only', () => ({}));
import { MAX_PHOTO_BYTES, photoMimeType, processPhoto, uploadPhoto, validatePhoto } from '../src/lib/photos';
import { smallPhoto } from './photo-fixtures';

describe('assinaturas de fotos', () => {
  it('reconhece JPEG, PNG e WebP pelos bytes, não pelo nome', () => {
    expect(photoMimeType(Uint8Array.from([0xff, 0xd8, 0xff, 0xe0]))).toBe('image/jpeg');
    expect(photoMimeType(Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))).toBe('image/png');
    expect(photoMimeType(Uint8Array.from([0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50]))).toBe('image/webp');
    expect(photoMimeType(new TextEncoder().encode('<svg onload=alert(1)>'))).toBeNull();
    expect(photoMimeType(Uint8Array.from([0x89, 0x50, 0x4e, 0x47]))).toBeNull();
  });

  it('recusa um arquivo excessivo e um formato não permitido antes de gravar', async () => {
    await expect(uploadPhoto('user', 'site', 1, new Uint8Array(MAX_PHOTO_BYTES + 1))).rejects.toMatchObject({ code: 'too-large' });
    await expect(uploadPhoto('user', 'site', 1, new TextEncoder().encode('<svg/>'))).rejects.toMatchObject({ code: 'invalid-format' });
  });

  it.each(['jpeg', 'png', 'webp'] as const)('decodifica %s e rejeita uma imagem truncada', async (format) => {
    const bytes = await smallPhoto(format);
    await expect(validatePhoto(bytes)).resolves.toBe(`image/${format}`);
    await expect(validatePhoto(bytes.subarray(0, Math.floor(bytes.length / 2)))).rejects.toMatchObject({ code: 'invalid-format' });
  });

  it('recusa uma imagem válida com mais de 20 milhões de pixels', async () => {
    const bytes = await sharp({ create: { width: 5001, height: 4000, channels: 3, background: '#ffffff' } }).png().toBuffer();
    expect(bytes.length).toBeLessThan(MAX_PHOTO_BYTES);
    await expect(validatePhoto(bytes)).rejects.toMatchObject({ code: 'invalid-format' });
  });

  it('recusa WebP animado', async () => {
    const pixels = Buffer.alloc(8 * 16 * 3);
    pixels.fill(255, 8 * 8 * 3);
    const bytes = await sharp(pixels, { raw: { width: 8, height: 16, channels: 3, pageHeight: 8 } })
      .webp({ delay: [100, 100] }).toBuffer();
    expect((await sharp(bytes).metadata()).pages).toBe(2);
    await expect(validatePhoto(bytes)).rejects.toMatchObject({ code: 'invalid-format' });
  });

  it('recusa PNG com bloco de controle de animação mesmo se o decodificador ignorar quadros', async () => {
    const png = await smallPhoto('png');
    const animationControl = Buffer.alloc(20);
    animationControl.writeUInt32BE(8, 0);
    animationControl.write('acTL', 4, 'ascii');
    animationControl.writeUInt32BE(2, 8);
    const animated = Buffer.concat([png.subarray(0, 33), animationControl, png.subarray(33)]);
    await expect(processPhoto(animated)).rejects.toMatchObject({ code: 'invalid-format' });
  });

  it('remove metadados e aplica a orientação EXIF aos pixels', async () => {
    const input = await sharp({ create: { width: 8, height: 16, channels: 3, background: '#cc8844' } })
      .jpeg().withMetadata({ orientation: 6 }).toBuffer();
    expect((await sharp(input).metadata()).exif).toBeDefined();
    const output = await processPhoto(input);
    const metadata = await sharp(output.bytes).metadata();
    expect(metadata.width).toBe(16);
    expect(metadata.height).toBe(8);
    expect(metadata.orientation).toBeUndefined();
    expect(metadata.exif).toBeUndefined();
    expect(metadata.icc).toBeUndefined();
    expect(metadata.xmp).toBeUndefined();
  });
});
