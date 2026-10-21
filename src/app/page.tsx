import Link from "next/link";
import styles from "./home.module.css";

const benefits = [
  { title: "Um lugar para chamar de nosso", text: "Criem um site de casamento exclusivo para celebrar o que faz a história de vocês única." },
  { title: "Com a cara de vocês", text: "Escolham entre três modelos e personalizem o conteúdo para contar essa história do seu jeito." },
  { title: "Memórias que ficam", text: "Reúnam fotografias, compartilhem a história dos noivos e recebam seus convidados com uma mensagem especial." },
  { title: "Tudo para compartilhar", text: "Publiquem o site e enviem aos convidados um endereço com as informações da celebração." },
  { title: "Cada detalhe no seu tempo", text: "Vocês podem editar textos, fotografias e informações do casamento pelo painel sempre que precisarem." },
  { title: "Presentes com significado", text: "Criem uma lista de presentes simbólicos para compartilhar. O pagamento ainda não está disponível." },
];

const templates = [
  { name: "Clássico", description: "Elegância atemporal e uma composição editorial para celebrar cada detalhe.", art: "classicArt" },
  { name: "Romântico", description: "Formas suaves e uma atmosfera acolhedora, inspirada na natureza.", art: "romanticArt" },
  { name: "Moderno", description: "Contraste, linhas marcantes e uma apresentação contemporânea.", art: "modernArt" },
] as const;

const steps = [
  { title: "Criem sua conta", text: "Comecem com um cadastro para acessar o espaço de vocês." },
  { title: "Configurem o casamento", text: "Adicionem as primeiras informações sobre o casal e a celebração." },
  { title: "Escolham um modelo", text: "Encontrem o estilo que combina com vocês e personalizem o site." },
  { title: "Contem sua história", text: "Acrescentem textos e fotografias para tornar cada detalhe pessoal." },
  { title: "Publiquem e compartilhem", text: "Confiram a prévia, publiquem e enviem o endereço aos convidados." },
];

const questions = [
  { question: "Como criamos nosso site de casamento?", answer: "Criem uma conta, cadastrem o casamento e acessem o editor pelo painel. Vocês poderão adicionar as informações aos poucos e conferir uma prévia antes de publicar." },
  { question: "O que podemos personalizar?", answer: "Vocês podem escolher entre os modelos Clássico, Romântico e Moderno, além de editar nomes, data, local, mensagem de boas-vindas, história e fotografias." },
  { question: "Como publicamos e compartilhamos o site?", answer: "Depois de revisar a prévia, publiquem pelo painel e compartilhem o endereço do site com os convidados. Para que alterações posteriores apareçam no site publicado, publiquem novamente." },
  { question: "Como funcionarão os pacotes?", answer: "Estamos estudando pacotes de 6 e 12 meses. Valores e demais condições ainda serão definidos; a contratação ainda não está disponível." },
  { question: "Como funciona a lista de presentes?", answer: "Vocês já podem criar e publicar uma lista de contribuições simbólicas. Os pagamentos ainda estão em desenvolvimento." },
  { question: "Como funcionarão os pagamentos?", answer: "A integração financeira ainda está em desenvolvimento. O parceiro financeiro e as condições do serviço ainda não foram definidos." },
];

export default function HomePage() {
  return (
    <div className={styles.home}>
      <main>
        <section className={styles.hero} aria-labelledby="hero-title">
          <div className={styles.heroPhoto} aria-hidden="true">
            {/* A fotografia já está otimizada em WebP e é servida como ativo estático. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img className={styles.heroPhotoImage} src="/images/noivara-casal.webp" alt="" fetchPriority="high" />
          </div>
          <header className={`${styles.header} ${styles.container}`}>
            <Link className={styles.logo} href="/" aria-label="Meu Casamento, início">Meu <span>Casamento</span></Link>
            <nav className={styles.nav} aria-label="Navegação principal">
              <a href="#modelos">Modelos</a>
              <a href="#como-funciona">Como funciona</a>
              <a href="#planos">Planos</a>
              <Link href="/entrar">Entrar</Link>
              <Link className={styles.navCta} href="/cadastro">Criar meu site <span aria-hidden="true">↗</span></Link>
            </nav>
          </header>

          <div className={`${styles.heroGrid} ${styles.container}`}>
            <div className={styles.heroCopy}>
              <h1 id="hero-title">O seu amor tem uma história.<br /><em>Conte a sua.</em></h1>
              <p className={styles.heroLead}>Um site de casamento para reunir a história, as fotografias e os detalhes do grande dia em um só lugar.</p>
              <div className={styles.heroActions}>
                <Link className={`${styles.button} ${styles.buttonLight}`} href="/cadastro">Começar meu site <span aria-hidden="true">↗</span></Link>
                <a className={styles.heroLink} href="#beneficios">Conheça o Meu Casamento <span aria-hidden="true">↓</span></a>
              </div>
            </div>
          </div>
        </section>

        <section className={`${styles.section} ${styles.benefits}`} id="beneficios" aria-labelledby="benefits-title">
          <div className={styles.container}>
            <div className={styles.sectionHeading}>
              <div><p className={styles.kicker}>FEITO PARA VOCÊS</p><h2 id="benefits-title">Cada detalhe tem<br /><em>um lugar especial.</em></h2></div>
              <p className={styles.sectionLead}>Um espaço para contar a história de vocês, guardar memórias e reunir quem amam em torno do grande dia.</p>
            </div>
            <div className={styles.benefitsGrid}>
              {benefits.map((benefit, index) => <article className={styles.benefit} key={benefit.title}>
                <span className={styles.benefitNumber} aria-hidden="true">0{index + 1}</span><h3>{benefit.title}</h3><p>{benefit.text}</p>
              </article>)}
            </div>
          </div>
        </section>

        <section className={`${styles.section} ${styles.templates}`} id="modelos" aria-labelledby="templates-title">
          <div className={styles.container}>
            <div className={styles.sectionHeading}>
              <div><p className={styles.kicker}>TRÊS JEITOS DE CELEBRAR</p><h2 id="templates-title">Um estilo para<br /><em>cada história.</em></h2></div>
              <p className={styles.sectionLead}>Escolham o modelo que mais combina com vocês. Estas composições representam a identidade de cada estilo.</p>
            </div>
            <div className={styles.templateGrid}>
              {templates.map((template) => <article className={styles.templateCard} key={template.name}>
                <div className={`${styles.templateArt} ${styles[template.art]}`} aria-hidden="true"><div className={styles.templateArtInner}><span>✳</span><p>A &amp; B</p><small>UMA HISTÓRIA DE AMOR</small></div></div>
                <div className={styles.templateBody}><h3>{template.name}</h3><p>{template.description}</p></div>
              </article>)}
            </div>
          </div>
        </section>

        <section className={`${styles.section} ${styles.process}`} id="como-funciona" aria-labelledby="process-title">
          <div className={styles.container}>
            <div className={styles.sectionHeading}>
              <div><p className={styles.kicker}>COMO FUNCIONA</p><h2 id="process-title">Seu site, do início<br /><em>ao grande dia.</em></h2></div>
              <p className={styles.sectionLead}>Criar um espaço para celebrar pode ser simples. Sigam cada etapa no ritmo de vocês.</p>
            </div>
            <div className={styles.stepsGrid}>
              {steps.map((step, index) => <article className={styles.step} key={step.title}><span className={styles.stepNumber}>0{index + 1}</span><h3>{step.title}</h3><p>{step.text}</p></article>)}
            </div>
          </div>
        </section>

        <section className={`${styles.section} ${styles.gifts}`} id="presentes" aria-labelledby="gifts-title">
          <div className={`${styles.container} ${styles.giftsGrid}`}>
            <div className={styles.giftsCopy}>
              <p className={styles.kicker}>OLHANDO PARA O FUTURO</p>
              <h2 id="gifts-title">Mais formas de<br /><em>celebrar juntos.</em></h2>
              <p>Vocês já podem criar uma lista de presentes simbólicos. Estamos preparando a integração para pagamentos, que ainda não estão disponíveis.</p>
              <p>O parceiro financeiro e as condições do serviço ainda estão em definição.</p>
            </div>
            <div className={styles.giftsPanel}>
              <p className={styles.status}>PAGAMENTOS EM DESENVOLVIMENTO</p>
              <h3>O que estamos preparando</h3>
              <p>Checkout integrado, confirmação automática dos pagamentos e confirmação de presença (RSVP) ainda não estão disponíveis.</p>
            </div>
          </div>
        </section>

        <section className={`${styles.section} ${styles.plans}`} id="planos" aria-labelledby="plans-title">
          <div className={styles.container}>
            <div className={styles.sectionHeading}>
              <div><p className={styles.kicker}>PLANOS EM ESTUDO</p><h2 id="plans-title">Uma proposta para<br /><em>o seu momento.</em></h2></div>
              <p className={styles.sectionLead}>Estamos definindo os pacotes de 6 e 12 meses do Meu Casamento. Valores e demais condições ainda estão em estudo.</p>
            </div>
            <div className={styles.planGrid}>
              <article className={styles.planCard}><p className={styles.status}>EM ESTUDO</p><h3>Pacote de 6 meses</h3><p className={styles.price}>A definir</p><p>Valor e demais condições comerciais em estudo.</p></article>
              <article className={styles.planCard}><p className={styles.status}>EM ESTUDO</p><h3>Pacote de 12 meses</h3><p className={styles.price}>A definir</p><p>Valor e demais condições comerciais em estudo.</p></article>
            </div>
            <p className={styles.planNote}>Os pacotes e a contratação ainda não estão disponíveis. Valores e demais condições dependem de definição comercial.</p>
          </div>
        </section>

        <section className={`${styles.section} ${styles.faq}`} id="perguntas" aria-labelledby="faq-title">
          <div className={`${styles.container} ${styles.faqGrid}`}>
            <div><p className={styles.kicker}>PERGUNTAS FREQUENTES</p><h2 id="faq-title">Tudo o que vocês<br /><em>querem saber.</em></h2></div>
            <div className={styles.faqList}>{questions.map((item) => <details key={item.question}><summary>{item.question}</summary><p>{item.answer}</p></details>)}</div>
          </div>
        </section>

        <section className={styles.finalCta} aria-labelledby="final-title">
          <div className={styles.container}><h2 id="final-title">Vamos contar essa<br /><em>história juntos?</em></h2><p>O primeiro passo para um espaço com a cara de vocês.</p><Link className={`${styles.button} ${styles.buttonLight}`} href="/cadastro">Começar meu site <span aria-hidden="true">↗</span></Link></div>
        </section>
      </main>

      <footer className={styles.footer}><div className={`${styles.container} ${styles.footerInner}`}><Link className={styles.logo} href="/" aria-label="Meu Casamento, início">Meu <span>Casamento</span></Link><p>Um espaço para celebrar o amor.</p><Link href="/entrar">Já tenho uma conta <span aria-hidden="true">↗</span></Link></div></footer>
    </div>
  );
}
