import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireUser } from '@/lib/auth';
import { validateContent } from '@/lib/content';
import { ownedWedding } from '@/lib/weddings';
import { EditorForm } from '@/components/editor-form';

const messages: Record<string, string> = {
  criado: 'Casamento criado. Personalize e salve o rascunho.',
  salvo: 'Rascunho salvo. A publicação existente não foi alterada.',
  publicado: 'Site publicado com o conteúdo salvo.',
  despublicado: 'Site despublicado.',
  invalido: 'Confira os campos e seus limites antes de salvar.',
  conflito: 'O conteúdo mudou em outra sessão. Atualize esta página e revise antes de tentar novamente.',
  erro: 'Não foi possível concluir a operação. Tente novamente.',
  'foto-adicionada': 'Foto adicionada ao rascunho. Publique novamente para atualizar o site.',
  'foto-removida': 'Foto removida do rascunho. A publicação existente não foi alterada.',
};

export default async function Editor({ params, searchParams }: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ estado?: string }>;
}) {
  const user = await requireUser();
  const { id } = await params;
  const { estado } = await searchParams;
  const wedding = await ownedWedding(user.id, id);
  if (!wedding) notFound();
  const result = validateContent(wedding.draft);
  if (!result.ok) return <main className="container narrow stack"><Link href="/painel">← Painel</Link><p className="error">Este rascunho não pôde ser carregado.</p></main>;
  const content = result.content;
  return <main className="container narrow stack">
    <Link href="/painel">← Voltar ao painel</Link>
    <div><p className="text-muted">Editor do site</p><h1>{content.coupleNames}</h1>
      <p>Endereço: /s/{wedding.slug} · {wedding.publishedRevisionId ? 'Publicado' : 'Não publicado'}</p></div>
    {estado && messages[estado] && <p className={['invalido', 'conflito', 'erro'].includes(estado) ? 'error' : 'notice'} role="status">{messages[estado]}</p>}
    <EditorForm key={`${id}:${wedding.draftVersion}:${wedding.publishedRevisionId ?? ''}`} id={id} version={wedding.draftVersion} initial={content} slug={wedding.slug} published={Boolean(wedding.publishedRevisionId)} />
  </main>;
}
