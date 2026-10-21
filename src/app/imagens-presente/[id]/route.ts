import { getUser } from '@/lib/auth';
import { accessibleGiftImage } from '@/lib/gifts';

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getUser();
  const { id } = await params;
  const headers = { 'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff', 'Content-Security-Policy': "default-src 'none'; sandbox" };
  try {
    const image = await accessibleGiftImage(id, user?.id ?? null);
    if (!image) return new Response(null, { status: 404, headers });
    return new Response(new Uint8Array(image.bytes), { headers: { ...headers, 'Content-Type': image.mimeType } });
  } catch { return new Response(null, { status: 503, headers }); }
}
