import Link from 'next/link';
import { requireUser } from '@/lib/auth';
import { validateContent } from '@/lib/content';
import { listWeddings } from '@/lib/weddings';

export default async function Dashboard() {
  const user = await requireUser();
  const weddings = await listWeddings(user.id);
  return <main className="container stack">
    <div><p className="text-muted">Seu painel</p><h1>Seus casamentos</h1>
      <p>Crie seu site e publique quando estiver pronto.</p></div>
    <form action="/sair" method="post"><button className="button button-ghost" type="submit">Sair da conta</button></form>
    <div><Link className="button" href="/painel/novo">Criar casamento</Link></div>
    {weddings.length === 0 ? <p className="notice">Você ainda não criou um casamento.</p> :
      <div className="stack">{weddings.map((wedding) => {
        const content = validateContent(wedding.draft);
        return <article className="card stack" key={wedding.id}>
          <h2>{content.ok ? content.content.coupleNames : 'Casamento'}</h2>
          <p className="text-muted">{wedding.publishedRevisionId ? 'Site publicado' : 'Rascunho privado'} · /s/{wedding.slug}</p>
          <div><Link className="button button-secondary" href={`/painel/${encodeURIComponent(wedding.id)}`}>Abrir editor</Link></div>
        </article>;
      })}</div>}
  </main>;
}
