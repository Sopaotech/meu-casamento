import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { GiftList } from '../src/components/gift-list';

describe('lista de presentes para convidados', () => {
  it('mostra contribuições simbólicas e avisa que pagamentos não estão disponíveis', () => {
    const html = renderToStaticMarkup(createElement(GiftList, { gifts: [{ id: 'gift1', name: 'Lua de mel', description: 'Nossa viagem', valueCents: 3990, imageId: 'a'.repeat(64) }] }));
    expect(html).toContain('Lua de mel');
    expect(html).toContain('39,90');
    expect(html).toContain('/imagens-presente/');
    expect(html).toContain('Pagamento em desenvolvimento');
    expect(html).toContain('pelo Meu Casamento');
    expect(html).not.toMatch(/noivara/i);
    expect(html).toContain('valor sugerido');
    expect(html).toContain('não é possível contribuir');
    expect(html).not.toContain('<form');
    expect(html).not.toContain('Confirmado');
  });
  it('não cria seção vazia e identifica valor livre', () => {
    expect(renderToStaticMarkup(createElement(GiftList, { gifts: [] }))).toBe('');
    const html = renderToStaticMarkup(createElement(GiftList, { gifts: [{ id: 'gift', name: 'Livre', description: '', valueCents: null, imageId: null }] }));
    expect(html).toContain('Contribuição livre');
  });
});
