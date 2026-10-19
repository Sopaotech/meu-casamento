import Link from 'next/link';
import { requireUser } from '@/lib/auth';
import { createWeddingAction } from '../actions';

const messages: Record<string, string> = {
  invalido: 'Informe os nomes e um endereço válido com 3 a 60 caracteres.',
  'endereco-ocupado': 'Este endereço já está em uso. Escolha outro.',
  erro: 'Não foi possível criar o casamento. Tente novamente.',
};

export default async function NewWedding({ searchParams }: { searchParams: Promise<{ estado?: string }> }) {
  await requireUser();
  const { estado } = await searchParams;
  return <main className="container narrow stack">
    <Link href="/painel">← Voltar ao painel</Link>
    <div><h1>Criar casamento</h1><p>Comece com os nomes do casal e o endereço do site.</p></div>
    {estado && messages[estado] && <p className="error" role="alert">{messages[estado]}</p>}
    <form action={createWeddingAction} className="card stack">
      <label className="field">Nomes do casal
        <input name="coupleNames" required maxLength={120} placeholder="Ex.: Ana e João" />
      </label>
      <label className="field">Endereço do site
        <input name="slug" required maxLength={160} placeholder="ana-e-joao" />
        <span className="text-muted">Será normalizado para letras, números e hífens. O site começa privado.</span>
      </label>
      <div><button className="button" type="submit">Criar e editar</button></div>
    </form>
  </main>;
}
