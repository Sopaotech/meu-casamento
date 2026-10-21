import type { WeddingContent } from "@/lib/content";
import type { PublicGift } from "@/lib/gift-content";
import { GiftList } from "@/components/gift-list";

function formatDate(value: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  const date = new Date(`${value}T12:00:00Z`);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("pt-BR", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}

/** Shared presentation for authenticated previews and published snapshots. */
export function WeddingPage({ content, gifts = [] }: { content: WeddingContent; gifts?: PublicGift[] }) {
  const heroPhoto = content.photoIds[0];

  return (
    <article className={`wedding-page wedding-page--${content.template}`}>
      <div className="wedding-frame">
        <header className="wedding-hero">
          <div className="wedding-hero-copy">
            <p className="wedding-kicker">UMA CELEBRAÇÃO DE AMOR</p>
            <span className="wedding-ornament" aria-hidden="true">✳</span>
            <h1>{content.coupleNames}</h1>
            <span className="wedding-divider" aria-hidden="true" />
            {content.eventDate && (
              <time className="wedding-hero-date" dateTime={content.eventDate}>
                {formatDate(content.eventDate)}
              </time>
            )}
          </div>
          <div className={`wedding-hero-portrait${heroPhoto ? "" : " wedding-hero-portrait--empty"}`}>
            {heroPhoto ? (
              // The access-controlled route must be used directly, without the shared optimizer cache.
              // eslint-disable-next-line @next/next/no-img-element
              <img src={`/fotos/${heroPhoto}`} alt={`Foto de ${content.coupleNames}`} fetchPriority="high" />
            ) : <span className="wedding-empty-ornament" aria-hidden="true">✳</span>}
          </div>
        </header>

        {content.welcomeMessage && (
          <section className="wedding-welcome" aria-label="Mensagem de boas-vindas">
            <span className="wedding-welcome-mark" aria-hidden="true">✳</span>
            <p>{content.welcomeMessage}</p>
          </section>
        )}

        {(content.eventDate || content.eventLocation) && (
          <section className="wedding-details" aria-label="Detalhes da celebração">
            <div className="wedding-section-heading">
              <p className="wedding-kicker">O GRANDE DIA</p>
              <h2>Vamos celebrar</h2>
            </div>
            <div className="wedding-details-list">
              {content.eventDate && <p><span>QUANDO</span><time dateTime={content.eventDate}>{formatDate(content.eventDate)}</time></p>}
              {content.eventLocation && <p><span>ONDE</span>{content.eventLocation}</p>}
            </div>
          </section>
        )}

        {content.story && (
          <section className="wedding-story">
            <div className="wedding-section-heading">
              <p className="wedding-kicker">NOSSA HISTÓRIA</p>
              <h2>Um pouco sobre nós</h2>
            </div>
            <p className="wedding-story-copy">{content.story}</p>
          </section>
        )}

        {content.photoIds.length > 0 && (
          <section className="wedding-gallery" aria-label="Galeria de fotos">
            <div className="wedding-section-heading">
              <p className="wedding-kicker">NOSSOS MOMENTOS</p>
              <h2>Galeria de fotos</h2>
            </div>
            <div className="wedding-gallery-grid">
              {content.photoIds.map((photoId, index) => (
                // Images are served directly by an access-controlled route, avoiding the shared optimizer cache.
                // eslint-disable-next-line @next/next/no-img-element
                <img key={photoId} src={`/fotos/${photoId}`} alt={`Foto ${index + 1} de ${content.coupleNames}`} loading="lazy" />
              ))}
            </div>
          </section>
        )}

        <GiftList gifts={gifts} />
        <footer className="wedding-footer">
          <span className="wedding-footer-ornament" aria-hidden="true">✳</span>
          <p>{content.coupleNames}</p>
          {content.eventDate && <time dateTime={content.eventDate}>{formatDate(content.eventDate)}</time>}
        </footer>
      </div>
    </article>
  );
}
