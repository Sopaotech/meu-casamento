import { notFound } from 'next/navigation';
import { normalizeSlug } from '@/lib/content';
import { publicPage } from '@/lib/weddings';
import { WeddingPage } from '@/components/wedding-page';
import { assertHomologationPerimeter } from '@/lib/security';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function PublishedSite({ params }: { params: Promise<{ slug: string }> }) {
  await assertHomologationPerimeter();
  const { slug } = await params;
  if (normalizeSlug(slug) !== slug) notFound();
  const page = await publicPage(slug);
  if (!page) notFound();
  return <main><WeddingPage content={page.content} gifts={page.gifts} /></main>;
}
