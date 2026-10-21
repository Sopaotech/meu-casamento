import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireUser } from '@/lib/auth';
import { ownedWedding } from '@/lib/weddings';
import { listOwnedGifts } from '@/lib/gifts';
import { GiftList } from '@/components/gift-list';

export default async function GiftPreview({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;
  if (!await ownedWedding(user.id, id)) notFound();
  const gifts = (await listOwnedGifts(user.id, id)).filter(item => item.active).map(({ id: giftId, name, description, valueCents, imageId }) => ({ id: giftId, name, description, valueCents, imageId }));
  return <main><div className="container"><p className="notice">Prévia privada da lista salva. <Link href={`/painel/${encodeURIComponent(id)}/presentes`}>Voltar à lista</Link></p>{!gifts.length && <p>Nenhum presente ativo para exibir.</p>}</div><GiftList gifts={gifts} /></main>;
}
