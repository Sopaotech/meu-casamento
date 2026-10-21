import Link from 'next/link';
import { requireUser } from '@/lib/auth';
import { createWeddingAction } from '../actions';
import styles from '../dashboard.module.css';

const messages: Record<string, string> = {
  invalido: 'Informe os nomes e um endereço válido com 3 a 60 caracteres.',
  'endereco-ocupado': 'Este endereço já está em uso. Escolha outro.',
  erro: 'Não foi possível criar o casamento. Tente novamente.',
};

export default async function NewWedding({ searchParams }: { searchParams: Promise<{ estado?: string }> }) {
  await requireUser();
  const { estado } = await searchParams;
  return <main className={`container narrow stack ${styles.newWedding}`}>
    <Link className={styles.back} href="/painel">← Voltar ao painel</Link>
    <div><p className={styles.eyebrow}>O COMEÇO DA HISTÓRIA</p><h1>Criar casamento</h1><p>Um espaço de vocês, feito para celebrar e compartilhar cada detalhe.</p></div>
    {estado && messages[estado] && <p className="error" role="alert">{messages[estado]}</p>}
    <form action={createWeddingAction} className={`card stack ${styles.newForm}`}>
      <div><h2>Como podemos chamar vocês?</h2><p>Os nomes aparecerão no painel e no site do casal. Vocês poderão editá-los depois.</p></div>
      <div className={styles.nameFields}>
        <label className="field">Nome da primeira pessoa
          <input name="firstName" required maxLength={58} autoComplete="given-name" placeholder="Ex.: Ana" />
        </label>
        <label className="field">Nome da segunda pessoa
          <input name="secondName" required maxLength={58} placeholder="Ex.: João" />
        </label>
      </div>
      <label className="field">Endereço do site
        <input name="slug" required maxLength={160} placeholder="ana-e-joao" />
        <span className="text-muted">Escolham um endereço para compartilhar. O site começa privado.</span>
      </label>
      <div><button className="button" type="submit">Criar e editar</button></div>
    </form>
  </main>;
}
