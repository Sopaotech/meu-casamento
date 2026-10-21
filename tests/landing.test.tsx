import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, describe, expect, it, vi } from 'vitest';

import HomePage from '../src/app/page';

function page() {
  return renderToStaticMarkup(createElement(HomePage));
}

function section(html: string, id: string) {
  const result = html.match(new RegExp(`<section\\b[^>]*\\bid="${id}"[^>]*>[\\s\\S]*?</section>`));
  expect(result, `Seção ${id} não encontrada`).not.toBeNull();
  return result![0];
}

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('landing Meu Casamento', () => {
  it('apresenta a nova assinatura na navegação e no rodapé', () => {
    const html = page();
    expect(html.match(/aria-label="Meu Casamento, início"/g)).toHaveLength(2);
    expect(html).toContain('Conheça o Meu Casamento');
    // O caminho da fotografia é técnico e permanece compatível.
    expect(html.replaceAll('/images/noivara-casal.webp', '')).not.toMatch(/noivara/i);
  });

  it('apresenta os benefícios, os três modelos e as cinco etapas reais', () => {
    const html = page();
    expect(html).toContain('O seu amor tem uma história.');
    expect(html).toContain('Conte a sua.');
    expect(html).not.toContain('PARA HISTÓRIAS QUE MERECEM SER CELEBRADAS');

    const benefits = section(html, 'beneficios');
    for (const text of ['site de casamento', 'três modelos', 'fotografias', 'publiquem', 'editar']) {
      expect(benefits.toLowerCase()).toContain(text);
    }
    expect(benefits).toContain('lista de presentes');
    expect(benefits).toContain('ainda não está disponível');
    const templates = section(html, 'modelos');
    for (const name of ['Clássico', 'Romântico', 'Moderno']) expect(templates).toContain(name);
    const process = section(html, 'como-funciona');
    for (const step of ['Criem sua conta', 'Configurem o casamento', 'Escolham um modelo', 'Contem sua história', 'Publiquem e compartilhem']) {
      expect(process).toContain(step);
    }
  });

  it('distingue planos e presentes futuros de recursos disponíveis', () => {
    const html = page();
    const gifts = section(html, 'presentes');
    expect(gifts).toContain('PAGAMENTOS EM DESENVOLVIMENTO');
    expect(gifts).toContain('ainda não estão disponíveis');
    for (const text of ['pagamentos, que ainda não estão disponíveis', 'parceiro financeiro', 'condições do serviço ainda estão em definição', 'RSVP']) {
      expect(gifts).toContain(text);
    }
    const plans = section(html, 'planos');
    for (const text of ['Pacote de 6 meses', 'Pacote de 12 meses', 'A definir', 'contratação ainda não estão disponíveis', 'definição comercial']) {
      expect(plans).toContain(text);
    }
    expect([...plans.matchAll(/<h3>(.*?)<\/h3>/g)].map((match) => match[1])).toEqual(['Pacote de 6 meses', 'Pacote de 12 meses']);
    expect(plans).not.toMatch(/R\$\s*\d|\b3\s+meses\b|Pagamento único|Mensalidade/i);
    expect(gifts + plans).not.toMatch(/<(?:a|button)\b/i);
    expect(html.toLowerCase()).not.toContain('receba sem nenhuma taxa');
  });

  it('responde às perguntas essenciais sem prometer contratação ou pagamentos', () => {
    const faq = section(page(), 'perguntas');
    for (const topic of ['Como criamos', 'O que podemos personalizar', 'Como publicamos', 'Como funcionarão os pacotes', 'lista de presentes', 'Como funcionarão os pagamentos']) {
      expect(faq).toContain(topic);
    }
    expect(faq).toContain('pacotes de 6 e 12 meses');
    expect(faq).toContain('Valores e demais condições ainda serão definidos');
    expect(faq).not.toMatch(/R\$\s*\d|\b3\s+meses\b|pagamento único|mensalidade/i);
    expect(faq).toContain('a contratação ainda não está disponível');
    expect(faq).toContain('O parceiro financeiro e as condições do serviço ainda não foram definidos');
  });

  it('aponta somente para rotas reais ou âncoras presentes na página', () => {
    const html = page();
    const hrefs = [...html.matchAll(/<a\b[^>]*\bhref="([^"]+)"/g)].map((match) => match[1]);
    expect(hrefs.length).toBeGreaterThan(0);
    for (const href of hrefs) {
      if (href.startsWith('#')) {
        expect(html).toContain(`id="${href.slice(1)}"`);
      } else {
        expect(['/', '/cadastro', '/entrar']).toContain(href);
      }
    }
    expect(hrefs).toContain('/cadastro');
    expect(hrefs).toContain('/entrar');
  });

  it.each(['development', 'production'])('usa a fotografia estática autorizada em %s', (environment) => {
    vi.stubEnv('NODE_ENV', environment);
    expect(page()).toContain('src="/images/noivara-casal.webp"');
    expect(page()).not.toContain('/demonstracao-local/foto-hero');
  });
});
