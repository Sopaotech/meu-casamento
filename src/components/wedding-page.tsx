import type { WeddingContent } from "@/lib/content";

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
export function WeddingPage({ content }: { content: WeddingContent }) {
  return (
    <article className={`wedding-page wedding-page--${content.template}`}>
      <div className="wedding-frame">
        <p className="wedding-kicker">UMA CELEBRAÇÃO DE AMOR</p>
        <div className="wedding-ornament" aria-hidden="true">✳</div>
        <h1>{content.coupleNames}</h1>
        <div className="wedding-divider" aria-hidden="true" />
        {content.welcomeMessage && <p className="wedding-welcome">{content.welcomeMessage}</p>}
        {(content.eventDate || content.eventLocation) && (
          <section className="wedding-details" aria-label="Detalhes da celebração">
            {content.eventDate && <p><span>QUANDO</span><time dateTime={content.eventDate}>{formatDate(content.eventDate)}</time></p>}
            {content.eventLocation && <p><span>ONDE</span>{content.eventLocation}</p>}
          </section>
        )}
        {content.story && (
          <section className="wedding-story">
            <p className="wedding-kicker">NOSSA HISTÓRIA</p>
            <h2>Um pouco sobre nós</h2>
            <p>{content.story}</p>
          </section>
        )}
        {content.photoIds.length > 0 && (
          <section className="wedding-gallery" aria-label="Galeria de fotos">
            <p className="wedding-kicker">NOSSOS MOMENTOS</p>
            <h2>Galeria de fotos</h2>
            <div className="wedding-gallery-grid">
              {content.photoIds.map((photoId, index) => (
                // Images are served directly by an access-controlled route, avoiding the shared optimizer cache.
                // eslint-disable-next-line @next/next/no-img-element
                <img key={photoId} src={`/fotos/${photoId}`} alt={`Foto ${index + 1} de ${content.coupleNames}`} loading="lazy" />
              ))}
            </div>
          </section>
        )}
        <p className="wedding-end" aria-hidden="true">✳</p>
      </div>
    </article>
  );
}
