import { describe, expect, it } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { WeddingPage } from '../src/components/wedding-page';
import { contentFromForm, coupleNamesFromForm, normalizeSlug, validateContent } from '../src/lib/content';

const valid = {
  template: 'classico',
  templateVersion: 1 as const,
  coupleNames: 'Ana e João',
  eventDate: '2028-02-29',
  eventLocation: 'São Paulo',
  story: 'Nossa história',
  welcomeMessage: 'Sejam bem-vindos',
  photoIds: [],
};

describe('conteúdo do site', () => {
  it('combina nomes do novo formulário e mantém compatibilidade com envios legados', () => {
    const form = new FormData();
    form.set('firstName', ' Ana ');
    form.set('secondName', ' João ');
    expect(coupleNamesFromForm(form)).toBe('Ana e João');
    expect(validateContent({ ...valid, coupleNames: coupleNamesFromForm(form) }).ok).toBe(true);
    form.set('secondName', '  ');
    form.set('coupleNames', 'Valor legado não deve substituir campo incompleto');
    expect(coupleNamesFromForm(form)).toBeNull();
    form.delete('firstName');
    form.delete('secondName');
    form.set('coupleNames', 'Ana e João');
    expect(coupleNamesFromForm(form)).toBe('Ana e João');
    form.delete('coupleNames');
    expect(coupleNamesFromForm(form)).toBeNull();
  });
  it('aceita os três modelos e normaliza espaços dos campos', () => {
    for (const template of ['classico', 'moderno', 'romantico']) {
      expect(validateContent({ ...valid, template, coupleNames: '  Ana e João  ' }))
        .toEqual({ ok: true, content: { ...valid, template, coupleNames: 'Ana e João' } });
    }
  });

  it('aceita campos opcionais vazios e datas bissextas válidas', () => {
    expect(validateContent({ ...valid, eventDate: '', eventLocation: '', story: '', welcomeMessage: '' }).ok).toBe(true);
    expect(validateContent(valid).ok).toBe(true);
  });

  it.each(['2027-02-29', '2028-02-30', '2028-13-01', '2028-00-01', '1899-12-31', '2101-01-01', '01/02/2028'])
    ('rejeita data inválida %s', (eventDate) => {
      expect(validateContent({ ...valid, eventDate }).ok).toBe(false);
    });

  it('recusa tipos inesperados, nomes vazios, controles e textos acima dos limites', () => {
    for (const value of [null, [], {}, { ...valid, template: 'outro' }, { ...valid, templateVersion: 2 },
      { ...valid, templateVersion: '1' }, { ...valid, coupleNames: '  ' },
      { ...valid, coupleNames: 'x'.repeat(121) }, { ...valid, eventLocation: 'x'.repeat(201) },
      { ...valid, welcomeMessage: 'x'.repeat(501) }, { ...valid, story: 'x'.repeat(5001) },
      { ...valid, story: 'texto\u0000' }, { ...valid, eventLocation: 42 }]) {
      expect(validateContent(value).ok).toBe(false);
    }
  });

  it('descarta propriedades extras em vez de incluí-las no conteúdo publicado', () => {
    expect(validateContent({ ...valid, ownerId: 'outro-tenant', internal: 'privado' }))
      .toEqual({ ok: true, content: valid });
  });

  it('valida campos ausentes em formulários', () => {
    const form = new FormData();
    form.set('coupleNames', 'Ana e João');
    expect(contentFromForm(form).ok).toBe(false);
  });

  it('aceita conteúdo antigo sem lista de fotos e preserva IDs válidos', () => {
    const { photoIds: _photos, ...legacy } = valid;
    expect(validateContent(legacy)).toEqual({ ok: true, content: valid });
    const photoIds = ['a'.repeat(64), 'b'.repeat(64)];
    expect(validateContent({ ...valid, photoIds })).toEqual({ ok: true, content: { ...valid, photoIds } });
  });

  it('recusa listas de fotos inválidas, duplicadas ou acima do limite', () => {
    for (const photoIds of [null, 'a'.repeat(64), ['A'.repeat(64)], ['a'.repeat(63)], [42],
      ['a'.repeat(64), 'a'.repeat(64)], Array.from({ length: 21 }, (_, i) => i.toString(16).padStart(64, '0'))]) {
      expect(validateContent({ ...valid, photoIds }).ok).toBe(false);
    }
  });

  it('mantém as fotos nos campos ocultos ao salvar o formulário', () => {
    const form = new FormData();
    for (const [key, value] of Object.entries(valid)) {
      if (typeof value === 'string') form.set(key, value);
    }
    const photoIds = ['a'.repeat(64), 'b'.repeat(64)];
    photoIds.forEach((id) => form.append('photoIds', id));
    expect(contentFromForm(form)).toEqual({ ok: true, content: { ...valid, photoIds } });
    form.append('photoIds', photoIds[0]);
    expect(contentFromForm(form).ok).toBe(false);
  });
});

describe('renderização pública e prévia', () => {
  it('mostra entrada potencialmente maliciosa como texto, sem criar elementos HTML', () => {
    const html = renderToStaticMarkup(createElement(WeddingPage, {
      content: { ...valid, template: 'classico', story: '<img src=x onerror=alert(1)>' },
    }));
    expect(html).toContain('&lt;img src=x onerror=alert(1)&gt;');
    expect(html).not.toContain('<img');
  });

  it('renderiza somente as fotos presentes no conteúdo da revisão', () => {
    const photoIds = ['a'.repeat(64), 'b'.repeat(64)];
    const html = renderToStaticMarkup(createElement(WeddingPage, {
      content: { ...valid, template: 'classico', photoIds },
    }));
    expect(html).toContain(`/fotos/${photoIds[0]}`);
    expect(html).toContain(`/fotos/${photoIds[1]}`);
    expect(html).toContain('Galeria de fotos');
  });

  it.each(['classico', 'romantico', 'moderno'] as const)(
    'apresenta a primeira foto no hero e preserva a galeria no modelo %s', (template) => {
      const photoIds = ['a'.repeat(64), 'b'.repeat(64)];
      const html = renderToStaticMarkup(createElement(WeddingPage, {
        content: { ...valid, template, photoIds },
      }));
      expect(html).toContain(`wedding-page--${template}`);
      expect(html).toMatch(new RegExp(`wedding-hero-portrait"><img src="/fotos/${photoIds[0]}"`));
      expect(html).toContain(`Foto 2 de ${valid.coupleNames}`);
      expect(html).toContain(`/fotos/${photoIds[1]}`);
      expect(html).toContain('2028-02-29');
    },
  );

  it.each(['classico', 'romantico', 'moderno'] as const)(
    'não inventa fotos nem detalhes opcionais ausentes no modelo %s', (template) => {
      const html = renderToStaticMarkup(createElement(WeddingPage, {
        content: { ...valid, template, photoIds: [], eventDate: '', eventLocation: '', story: '', welcomeMessage: '' },
      }));
      expect(html).toContain('wedding-hero-portrait--empty');
      expect(html).not.toContain('<img');
      expect(html).not.toContain('Galeria de fotos');
      expect(html).not.toContain('Detalhes da celebração');
      expect(html).not.toContain('Um pouco sobre nós');
    },
  );
});

describe('endereço público', () => {
  it('normaliza acentos, caixa, separadores e espaços', () => {
    expect(normalizeSlug('  João & Ana  ')).toBe('joao-ana');
  });

  it.each(['admin', 'ADMIN', ' painel ', 'api', 's', 'ab', '---', 'x'.repeat(61)])
    ('rejeita endereço reservado, curto ou longo: %s', (input) => {
      expect(normalizeSlug(input)).toBeNull();
    });

  it('recusa tipos não textuais e entrada excessivamente longa', () => {
    expect(normalizeSlug(null)).toBeNull();
    expect(normalizeSlug('a'.repeat(161))).toBeNull();
  });
});
