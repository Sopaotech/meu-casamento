import Link from "next/link";

export default function HomePage() {
  return (
    <div className="nv-home">
      <main>
      <section className="nv-hero" aria-labelledby="hero-title">
        <div className="nv-hero-photo" aria-hidden="true" />
        <div className="nv-hero-shade" aria-hidden="true" />

        <header className="nv-header container">
          <Link className="nv-logo" href="/" aria-label="Noivara, início">noivara<span>.</span></Link>
          <nav className="nv-nav" aria-label="Navegação principal">
            <a href="#como-funciona">Como funciona</a>
            <a href="#possibilidades">O que vem por aí</a>
            <Link href="/entrar">Entrar</Link>
            <Link className="nv-nav-cta" href="/cadastro">Criar meu site <span aria-hidden="true">↗</span></Link>
          </nav>
        </header>

        <div className="nv-hero-main container">
          <div className="nv-hero-copy">
            <p className="nv-kicker nv-kicker-light"><span aria-hidden="true">✳</span> PARA HISTÓRIAS QUE MERECEM SER CELEBRADAS</p>
            <h1 id="hero-title">O seu amor tem uma história.<br /><em>Conte a sua.</em></h1>
            <p className="nv-hero-lead">A Noivara é o espaço para criar um site de casamento com a cara de vocês e reunir os detalhes de um dia inesquecível.</p>
            <div className="nv-hero-actions">
              <Link className="nv-button nv-button-light" href="/cadastro">Começar meu site <span aria-hidden="true">↗</span></Link>
              <a className="nv-hero-link" href="#como-funciona">Conheça a Noivara <span aria-hidden="true">↓</span></a>
            </div>
          </div>
          <div className="nv-hero-bottom" aria-hidden="true">
            <span>UM LUGAR PARA O SEU SIM</span>
            <span>UM DIA, MUITAS MEMÓRIAS</span>
          </div>
        </div>
      </section>

      <section className="nv-intro" id="como-funciona" aria-labelledby="intro-title">
        <div className="container">
          <div className="nv-intro-heading">
            <div>
              <p className="nv-kicker">UM SITE PARA CHAMAR DE NOSSO</p>
              <h2 id="intro-title">Tudo começa com<br /><em>a história de vocês.</em></h2>
            </div>
            <div className="nv-intro-copy">
              <span className="nv-flower" aria-hidden="true">✳</span>
              <p>Da primeira informação ao último detalhe, a Noivara ajuda vocês a criar um cantinho especial para compartilhar o casamento com quem faz parte dessa história.</p>
            </div>
          </div>
          <div className="nv-steps">
            <article><span className="nv-step-number">01 /</span><h3>Comecem por vocês</h3><p>Criem uma conta, cadastrem o casamento e contem quem vocês são.</p></article>
            <article><span className="nv-step-number">02 /</span><h3>Deixem com a sua cara</h3><p>Escolham um modelo e personalizem textos, data e local do grande dia.</p></article>
            <article><span className="nv-step-number">03 /</span><h3>Compartilhem o amor</h3><p>Visualizem o site, publiquem quando estiver pronto e compartilhem o endereço.</p></article>
          </div>
        </div>
      </section>

      <section className="nv-details" aria-labelledby="details-title">
        <div className="container nv-details-grid">
          <div className="nv-editorial-card" aria-hidden="true">
            <p>UM DIA, UMA HISTÓRIA</p>
            <span className="nv-card-star">✳</span>
            <div className="nv-card-names">Ana <i>&amp;</i><br />Pedro</div>
            <span className="nv-card-line" />
            <p>O NOSSO PARA SEMPRE COMEÇA AQUI</p>
          </div>
          <div className="nv-details-copy">
            <p className="nv-kicker">FEITO PARA SER DE VOCÊS</p>
            <h2 id="details-title">Cada detalhe conta.<br /><em>Cada história é única.</em></h2>
            <p>Reúnam a história do casal, uma mensagem de boas-vindas e as informações de data e local do casamento em um só lugar.</p>
            <ul>
              <li><span aria-hidden="true">✦</span><div><strong>Um modelo para o seu estilo</strong><br />Escolham entre Clássico, Moderno e Romântico.</div></li>
              <li><span aria-hidden="true">✦</span><div><strong>Seu ritmo, suas escolhas</strong><br />Editem, visualizem e publiquem quando fizer sentido.</div></li>
              <li><span aria-hidden="true">✦</span><div><strong>Fácil de compartilhar</strong><br />Enviem o endereço do site para seus convidados.</div></li>
            </ul>
            <Link className="nv-text-link" href="/cadastro">Criar meu site <span aria-hidden="true">↗</span></Link>
          </div>
        </div>
      </section>

      <section className="nv-future" id="possibilidades" aria-labelledby="future-title">
        <div className="container nv-future-grid">
          <div>
            <p className="nv-kicker">PENSANDO NO FUTURO</p>
            <h2 id="future-title">Ainda tem muito<br /><em>amor por vir.</em></h2>
          </div>
          <div>
            <p>Estamos construindo a Noivara passo a passo. Fotos, confirmação de presença e lista de presentes estão nos nossos planos para tornar a experiência ainda mais completa.</p>
            <p className="nv-future-note">Nossa proposta para presentes é não cobrar comissão sobre o valor recebido. A disponibilidade e as tarifas financeiras dependerão da validação e das condições do provedor de pagamento.</p>
          </div>
        </div>
      </section>

      <section className="nv-final-cta" aria-labelledby="cta-title">
        <div className="container">
          <p className="nv-kicker nv-kicker-light">O PRÓXIMO CAPÍTULO COMEÇA AQUI</p>
          <h2 id="cta-title">Vamos contar essa<br /><em>história juntos?</em></h2>
          <p>Um espaço só de vocês, para um dia que é de todos.</p>
          <Link className="nv-button nv-button-light" href="/cadastro">Começar meu site <span aria-hidden="true">↗</span></Link>
        </div>
      </section>
      </main>

      <footer className="nv-footer">
        <div className="container nv-footer-inner">
          <Link className="nv-logo nv-logo-dark" href="/" aria-label="Noivara, início">noivara<span>.</span></Link>
          <p>Um espaço para celebrar o amor.</p>
          <Link href="/entrar">Já tenho uma conta <span aria-hidden="true">↗</span></Link>
        </div>
      </footer>
    </div>
  );
}
