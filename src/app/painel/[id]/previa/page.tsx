import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireUser } from '@/lib/auth';
import { validateContent } from '@/lib/content';
import { ownedWedding } from '@/lib/weddings';
import { WeddingPage } from '@/components/wedding-page';
import { listOwnedGifts } from '@/lib/gifts';

export default async function Preview({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;
  const wedding = await ownedWedding(user.id, id);
  if (!wedding) notFound();
  const content = validateContent(wedding.draft);
  if (!content.ok) notFound();
  const gifts = (await listOwnedGifts(user.id, id)).filter(item => item.active).map(({ id: giftId, name, description, valueCents, imageId }) => ({ id: giftId, name, description, valueCents, imageId }));
  return <main><div className="container"><p className="notice">Prévia privada do último rascunho salvo. <Link href={`/painel/${encodeURIComponent(id)}`}>Voltar ao editor</Link></p></div>
    <WeddingPage content={content.content} gifts={gifts} />
  </main>;
}
