import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireUser } from '@/lib/auth';
import { ownedWedding } from '@/lib/weddings';
import { formatGiftAmount, GIFT_IDEAS } from '@/lib/gift-content';
import { listOwnedGifts } from '@/lib/gifts';
import { archiveGiftAction, createGiftAction, updateGiftAction, uploadGiftImageAction } from './actions';
import styles from './presentes.module.css';

const messages: Record<string, string> = {
  created: 'Presente adicionado ao rascunho. Você já pode adicionar uma fotografia ao card.', updated: 'Presente atualizado no rascunho.',
  archived: 'Presente arquivado; seu histórico foi preservado.', image: 'Imagem adicionada ao rascunho.',
  invalid: 'Confira o nome, o valor e os campos informados.', 'invalid-image': 'Escolha uma imagem JPEG, PNG ou WebP válida, sem animação e com até 5 MB e 20 megapixels.',
  conflict: 'O rascunho mudou em outra sessão. Atualize a página e revise antes de tentar novamente.',
  limit: 'O limite de presentes ou imagens preservadas foi atingido.', 'storage-error': 'Não foi possível armazenar a imagem.', error: 'Não foi possível concluir a operação.',
};

function amountInput(value: number | null) { return value === null ? '' : `${Math.floor(value / 100)},${String(value % 100).padStart(2, '0')}`; }
function Hidden({ weddingId, version, giftId }: { weddingId: string; version: number; giftId?: string }) {
  return <><input type="hidden" name="weddingId" value={weddingId} /><input type="hidden" name="version" value={version} />{giftId && <input type="hidden" name="giftId" value={giftId} />}</>;
}

export default async function GiftsEditor({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ estado?: string; ideia?: string }> }) {
  const user = await requireUser();
  const { id } = await params;
  const { estado, ideia } = await searchParams;
  const wedding = await ownedWedding(user.id, id);
  if (!wedding) notFound();
  const gifts = await listOwnedGifts(user.id, id);
  const version = wedding.draftVersion;
  const path = `/painel/${encodeURIComponent(id)}`;
  const selectedIdea = GIFT_IDEAS.find(item => item === ideia) ?? '';
  return <main className={`container ${styles.page}`}>
    <Link className={styles.back} href={path}>← Voltar ao casamento</Link>
    <header className={styles.heading}>
      <div><p className={styles.eyebrow}>UMA LISTA COM A CARA DE VOCÊS</p><h1>Lista de presentes</h1><p>Reúnam aqui ideias especiais para quem deseja celebrar esta nova etapa com vocês.</p></div>
      <div className={styles.links}><Link className="button button-secondary" href={`${path}/presentes/previa`}>Ver prévia da lista</Link><a className="button" href="#novo-presente">+ Adicionar presente</a></div>
    </header>
    <p className={styles.disclaimer}><strong>Contribuições simbólicas.</strong> O Meu Casamento não vende nem entrega produtos. O pagamento está em desenvolvimento e ainda não é possível contribuir pela plataforma.</p>
    {estado && messages[estado] && <p className={['invalid', 'invalid-image', 'conflict', 'limit', 'storage-error', 'error'].includes(estado) ? 'error' : 'notice'} role="status">{messages[estado]}</p>}

    <section className={styles.catalog} aria-labelledby="list-heading">
      <div className={styles.sectionHeading}><div><p className={styles.eyebrow}>DO JEITO DE VOCÊS</p><h2 id="list-heading">Seus presentes</h2><p>Editem os detalhes, organizem a ordem e escolham o que ficará visível para os convidados.</p></div><span className={styles.count}>{gifts.length} {gifts.length === 1 ? 'presente' : 'presentes'}</span></div>
      {!gifts.length ? <div className={styles.empty}><span aria-hidden="true">✧</span><h3>Uma lista para começar a sonhar</h3><p>Adicionem o primeiro presente e criem uma lista que conte um pouco da história de vocês.</p><a className="button" href="#novo-presente">Adicionar presente</a></div> : <div className={styles.grid}>{gifts.map(gift => <article className={styles.item} key={gift.id}>
        <div className={styles.image}>{gift.imageId ? /* eslint-disable-next-line @next/next/no-img-element */ <img src={`/imagens-presente/${gift.imageId}`} alt={`Imagem de ${gift.name}`} loading="lazy" /> : <div className={styles.imagePlaceholder} aria-label="Presente sem fotografia"><span aria-hidden="true">✧</span><small>Adicione uma fotografia</small></div>}<span className={gift.active ? styles.active : styles.hidden}>{gift.active ? 'Ativo' : 'Oculto'}</span></div>
        <div className={styles.itemBody}><h3>{gift.name}</h3><p className={styles.description}>{gift.description || 'Adicione uma descrição para contar mais sobre este presente.'}</p><p className={styles.price}>{gift.valueCents === null ? 'Contribuição livre' : formatGiftAmount(gift.valueCents)}{gift.valueCents !== null && <small>valor sugerido</small>}</p>
          <details className={styles.edit}><summary>Editar e organizar</summary>
            <form action={updateGiftAction} className={styles.form}><Hidden weddingId={id} version={version} giftId={gift.id} />
              <div className="field"><label htmlFor={`name-${gift.id}`}>Nome</label><input id={`name-${gift.id}`} name="name" defaultValue={gift.name} maxLength={100} required /></div>
              <div className="field"><label htmlFor={`description-${gift.id}`}>Descrição</label><textarea id={`description-${gift.id}`} name="description" defaultValue={gift.description} maxLength={500} /></div>
              <div className="field"><label htmlFor={`amount-${gift.id}`}>Valor sugerido em reais</label><input id={`amount-${gift.id}`} name="amount" inputMode="decimal" defaultValue={amountInput(gift.valueCents)} maxLength={10} /><small>Deixe vazio para contribuição livre.</small></div>
              <div className={styles.row}><div className="field"><label htmlFor={`position-${gift.id}`}>Ordem</label><input id={`position-${gift.id}`} name="position" type="number" min="0" max="1000000" defaultValue={gift.position} required /><small>Menores aparecem primeiro.</small></div>
                <div className="field"><label htmlFor={`active-${gift.id}`}>Visibilidade</label><select id={`active-${gift.id}`} name="active" defaultValue={String(gift.active)}><option value="true">Ativo</option><option value="false">Oculto</option></select></div></div>
              <button className="button" type="submit">Salvar alterações</button>
            </form>
            <form action={uploadGiftImageAction} className={styles.imageForm}><Hidden weddingId={id} version={version} giftId={gift.id} /><label htmlFor={`image-${gift.id}`}>Fotografia do presente</label><input id={`image-${gift.id}`} type="file" name="image" accept="image/jpeg,image/png,image/webp" required /><small>JPEG, PNG ou WebP, até 5 MB.</small><button className="button button-secondary" type="submit">{gift.imageId ? 'Trocar fotografia' : 'Adicionar fotografia'}</button></form>
          </details>
          <details className={styles.archive}><summary>Arquivar presente</summary><p>O presente sairá da lista do rascunho. Para atualizar o site, publiquem novamente.</p><form action={archiveGiftAction}><Hidden weddingId={id} version={version} giftId={gift.id} /><button className="button button-secondary" type="submit">Confirmar arquivamento</button></form></details>
        </div>
      </article>)}</div>}
      <p className={styles.publishNote}>As alterações aparecem no site depois de publicar ou republicar. <Link href={`${path}/presentes/previa`}>Confira a prévia</Link>.</p>
    </section>

    <section className={styles.create} id="novo-presente" aria-labelledby="new-gift"><div><p className={styles.eyebrow}>CRIEM COM CARINHO</p><h2 id="new-gift">Adicionar presente</h2><p>Escolham uma sugestão ou criem um presente personalizado. O valor pode ser livre.</p>
      <p className={styles.ideasLabel}>Ideias para começar</p><div className={styles.ideas}>{GIFT_IDEAS.map(idea => <Link href={`${path}/presentes?ideia=${encodeURIComponent(idea)}#novo-presente`} key={idea}>{idea}</Link>)}<Link href={`${path}/presentes#novo-presente`}>Presente personalizado</Link></div></div>
      <form action={createGiftAction} className={styles.form}><Hidden weddingId={id} version={version} />
        <div className="field"><label htmlFor="new-name">Nome do presente</label><input id="new-name" name="name" list="gift-ideas" maxLength={100} defaultValue={selectedIdea} placeholder="Ex.: Jogo de jantar" required /><datalist id="gift-ideas">{GIFT_IDEAS.map(idea => <option value={idea} key={idea} />)}</datalist></div>
        <div className="field"><label htmlFor="new-description">Descrição</label><textarea id="new-description" name="description" maxLength={500} placeholder="Conte por que esta ideia é especial para vocês" /></div>
        <div className="field"><label htmlFor="new-amount">Valor sugerido em reais</label><input id="new-amount" name="amount" inputMode="decimal" placeholder="Ex.: 120,00" maxLength={10} /><small>De R$ 0,01 a R$ 1.000.000,00; deixe vazio para valor livre.</small></div>
        <button className="button" type="submit">Adicionar presente</button><small>Depois de adicionar, vocês podem incluir uma fotografia.</small>
      </form>
    </section>
    <Link className={styles.financeLink} href={`${path}/recebimentos`}>Acompanhar presentes e recebimentos →</Link>
  </main>;
}
