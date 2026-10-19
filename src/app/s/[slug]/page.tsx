import { notFound } from 'next/navigation';
import { normalizeSlug } from '@/lib/content';
import { publicContent } from '@/lib/weddings';
import { WeddingPage } from '@/components/wedding-page';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function PublishedSite({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  if (normalizeSlug(slug) !== slug) notFound();
  const content = await publicContent(slug);
  if (!content) notFound();
  return <main><WeddingPage content={content} /></main>;
}
