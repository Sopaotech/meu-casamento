import { formatGiftAmount, type PublicGift } from '@/lib/gift-content';
import styles from './gift-list.module.css';

export function GiftList({ gifts }: { gifts: PublicGift[] }) {
  if (!gifts.length) return null;
  return <section className={styles.section} id="presentes" aria-labelledby="wedding-gifts-title">
    <p className={styles.eyebrow}>COM CARINHO</p><h2 id="wedding-gifts-title">Lista de presentes</h2>
    <p className={styles.intro}>A presença de vocês já torna nossa celebração especial. Para quem deseja nos presentear, reunimos algumas ideias que fazem parte da nossa história.</p>
    <p className={styles.note}>Os presentes são contribuições simbólicas. Não há compra ou entrega de produtos pelo Meu Casamento.</p>
    <div className={styles.grid}>{gifts.map(gift => <article className={styles.card} key={gift.id}>
      <div className={styles.image}>{gift.imageId ? /* eslint-disable-next-line @next/next/no-img-element */ <img src={`/imagens-presente/${gift.imageId}`} alt="" loading="lazy" /> : <div className={styles.placeholder} aria-hidden="true">✧</div>}</div>
      <div className={styles.body}><h3>{gift.name}</h3>{gift.description && <p className={styles.description}>{gift.description}</p>}
        <p className={styles.amount}>{gift.valueCents === null ? 'Contribuição livre' : formatGiftAmount(gift.valueCents)}{gift.valueCents !== null && <small>valor sugerido</small>}</p>
        <p className={styles.availability}>Pagamento em desenvolvimento</p>
        <details><summary>Ver contribuição</summary><p>Ainda não é possível contribuir ou realizar pagamentos pela plataforma.</p></details>
      </div>
    </article>)}</div>
  </section>;
}
