import Link from 'next/link';
import { requireUser } from '@/lib/auth';
import { validateContent } from '@/lib/content';
import { countdownToWedding } from '@/lib/dashboard';
import { listWeddings } from '@/lib/weddings';
import styles from './dashboard.module.css';

const templateNames = { classico: 'Clássico', romantico: 'Romântico', moderno: 'Moderno' } as const;

function formatDate(value: string) {
  return new Intl.DateTimeFormat('pt-BR', {
    day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC',
  }).format(new Date(`${value}T12:00:00Z`));
}

export default async function Dashboard() {
  const user = await requireUser();
  const weddings = await listWeddings(user.id);

  return <main className={`container ${styles.dashboard}`}>
    <header className={styles.header}>
      <div>
        <p className={styles.eyebrow}>BEM-VINDOS AO MEU CASAMENTO</p>
        <h1>Olá, {user.name}!</h1>
        <p>Seu espaço para cuidar dos detalhes e celebrar a história de vocês.</p>
      </div>
      <form action="/sair" method="post"><button className="button button-ghost" type="submit">Sair da conta</button></form>
    </header>

    <section aria-labelledby="weddings-heading">
      <div className={styles.sectionHeading}>
        <div>
          <p className={styles.eyebrow}>SEU ESPAÇO</p>
          <h2 id="weddings-heading">Seus casamentos</h2>
          <p>O grande dia começa com os pequenos detalhes.</p>
        </div>
        <Link className="button button-secondary" href="/painel/novo">Criar novo casamento</Link>
      </div>

      {weddings.length === 0 ? <div className={styles.empty}>
        <span className={styles.emptyOrnament} aria-hidden="true">✳</span>
        <h3>Seu primeiro site começa aqui</h3>
        <p>Crie um casamento para escolher um modelo, contar a história de vocês e preparar sua lista de presentes.</p>
        <Link className="button" href="/painel/novo">Criar meu primeiro casamento</Link>
      </div> : <div className={styles.grid}>
        {weddings.map((wedding) => {
          const result = validateContent(wedding.draft);
          const content = result.ok ? result.content : null;
          const names = content?.coupleNames ?? 'Casamento';
          const firstPhoto = content?.photoIds[0];
          const editorUrl = `/painel/${encodeURIComponent(wedding.id)}`;
          const giftCount = wedding._count.giftItems;

          return <article className={styles.card} key={wedding.id}>
            <div className={styles.cover}>
              {firstPhoto ? <>
                {/* The private photo route must not use the shared image optimizer cache. */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={`/fotos/${firstPhoto}`} alt={`Foto de ${names}`} loading="lazy" />
              </> : <div className={styles.coverEmpty} aria-hidden="true"><span>✳</span><span>Uma história para celebrar</span></div>}
              <span className={`${styles.status} ${wedding.publishedRevisionId ? styles.published : styles.draft}`}>
                {wedding.publishedRevisionId ? 'Publicado' : 'Rascunho privado'}
              </span>
            </div>
            <div className={styles.cardBody}>
              <p className={styles.template}>{content ? `MODELO ${templateNames[content.template].toUpperCase()}` : 'SEU CASAMENTO'}</p>
              <h3>Olá, {names}!</h3>
              <p className={styles.intro}>Tudo para o dia de vocês, em um só lugar.</p>
              <div className={styles.facts}>
                <div><span>O GRANDE DIA</span><strong>{content?.eventDate ? <time dateTime={content.eventDate}>{formatDate(content.eventDate)}</time> : 'Data a definir'}</strong><small>{content?.eventDate ? countdownToWedding(content.eventDate) : 'Adicionem a data no editor'}</small></div>
                <div><span>LISTA DE PRESENTES</span><strong>{giftCount} {giftCount === 1 ? 'presente cadastrado' : 'presentes cadastrados'}</strong><small>{giftCount ? 'Ativos e ocultos' : 'Comecem a montar sua lista'}</small></div>
              </div>
              {wedding.publishedRevisionId && <p className={styles.publicationNote}>Alterações no rascunho aparecem no site após republicar.</p>}
              <nav className={styles.cardActions} aria-label={`Ações para ${names}`}>
                <Link className={styles.action} href={`${editorUrl}/presentes`}><span aria-hidden="true">✧</span><span><strong>Gerenciar presentes</strong><small>Montem a lista de vocês</small></span><b aria-hidden="true">→</b></Link>
                <Link className={styles.action} href={editorUrl}><span aria-hidden="true">✎</span><span><strong>Editar o site</strong><small>Personalizem cada detalhe</small></span><b aria-hidden="true">→</b></Link>
                <Link className={styles.action} href={`${editorUrl}/recebimentos`}><span aria-hidden="true">◇</span><span><strong>Consultar recebimentos</strong><small>Acompanhem a situação financeira</small></span><b aria-hidden="true">→</b></Link>
              </nav>
              <div className={styles.previewLinks}>
                <Link href={`${editorUrl}/previa`}>Ver prévia do site <span aria-hidden="true">→</span></Link>
                {wedding.publishedRevisionId && <Link href={`/s/${encodeURIComponent(wedding.slug)}`}>Abrir site publicado <span aria-hidden="true">↗</span></Link>}
              </div>
            </div>
          </article>;
        })}
      </div>}
    </section>
  </main>;
}
