import sharp from 'sharp';

export function smallPhoto(format: 'jpeg' | 'png' | 'webp'): Promise<Buffer> {
  return sharp({ create: { width: 8, height: 8, channels: 3, background: '#cc8844' } })
    .toFormat(format).toBuffer();
}
