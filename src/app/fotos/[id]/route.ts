import { getUser } from '@/lib/auth';
import { accessiblePhoto } from '@/lib/photos';

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getUser();
  const headers = {
    'Cache-Control': 'private, no-store',
    'X-Content-Type-Options': 'nosniff',
    'Content-Security-Policy': "default-src 'none'; sandbox",
  };
  let photo;
  try {
    photo = await accessiblePhoto(id, user?.id ?? null);
  } catch {
    return new Response(null, { status: 503, headers });
  }
  if (!photo) return new Response(null, { status: 404, headers });
  return new Response(new Uint8Array(photo.bytes), { headers: { ...headers, 'Content-Type': photo.mimeType } });
}
