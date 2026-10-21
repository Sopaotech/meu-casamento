import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/app/painel/actions', () => ({
  saveDraftAction: vi.fn(), uploadPhotoAction: vi.fn(), removePhotoAction: vi.fn(),
  publishAction: vi.fn(), unpublishAction: vi.fn(),
}));
import { EditorForm } from '../src/components/editor-form';

describe('editor de casamentos', () => {
  it('oferece os três modelos e mantém a escolha, versão e fotos do rascunho', () => {
    const photoId = 'a'.repeat(64);
    const html = renderToStaticMarkup(createElement(EditorForm, {
      id: 'wedding', version: 7, slug: 'wedding-demo', published: true,
      initial: { template: 'romantico', templateVersion: 1, coupleNames: 'Laura e Gabriel',
        eventDate: '2028-09-16', eventLocation: 'Jardim', story: 'Nossa história',
        welcomeMessage: 'Bem-vindos', photoIds: [photoId] },
    }));
    expect(html).toContain('Informações do casal');
    expect(html).toContain('Data e local');
    expect(html).toContain('A história do casal');
    expect(html).toContain('Escolham seu modelo');
    expect(html).toContain('Fotografias');
    expect(html).toContain('Prévia e publicação');
    expect(html).toMatch(/type="radio"[^>]*name="template"[^>]*value="classico"/);
    expect(html).toMatch(/type="radio"[^>]*name="template"[^>]*checked=""[^>]*value="romantico"|type="radio"[^>]*name="template"[^>]*value="romantico"[^>]*checked=""/);
    expect(html).toMatch(/type="radio"[^>]*name="template"[^>]*value="moderno"/);
    expect(html).toContain('name="version" value="7"');
    expect(html).toContain(`name="photoIds" value="${photoId}"`);
    expect(html).toContain(`src="/fotos/${photoId}"`);
    expect(html).toContain('Alterações no rascunho só aparecem após republicar.');
  });
});
