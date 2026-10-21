/** The only data the editor and published renderer accept. */
export type WeddingContent = {
  template: 'classico' | 'moderno' | 'romantico';
  templateVersion: 1;
  coupleNames: string;
  eventDate: string;
  eventLocation: string;
  story: string;
  welcomeMessage: string;
  photoIds: string[];
};

export const initialContent: WeddingContent = {
  template: 'classico',
  templateVersion: 1,
  coupleNames: '',
  eventDate: '',
  eventLocation: '',
  story: '',
  welcomeMessage: '',
  photoIds: [],
};

type ValidationResult =
  | { ok: true; content: WeddingContent }
  | { ok: false; error: string };

function validDate(value: string): boolean {
  if (!value) return true;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split('-').map(Number);
  if (year < 1900 || year > 2100 || month < 1 || month > 12 || day < 1) return false;
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return day <= daysInMonth;
}

/** Validate untrusted form data as well as data read back from the database. */
export function validateContent(value: unknown): ValidationResult {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return { ok: false, error: 'Conteúdo inválido.' };
  }
  const obj = value as Record<string, unknown>;
  if (obj.templateVersion !== 1) return { ok: false, error: 'Versão do modelo não reconhecida.' };
  const fields = ['template', 'coupleNames', 'eventDate', 'eventLocation', 'story', 'welcomeMessage'] as const;
  if (fields.some((field) => typeof obj[field] !== 'string')) {
    return { ok: false, error: 'Preencha os campos de texto corretamente.' };
  }
  const template = (obj.template as string).trim();
  const coupleNames = (obj.coupleNames as string).trim();
  const eventDate = (obj.eventDate as string).trim();
  const eventLocation = (obj.eventLocation as string).trim();
  const story = (obj.story as string).trim();
  const welcomeMessage = (obj.welcomeMessage as string).trim();
  // Drafts and published revisions created before photo support have no photoIds.
  const photoIds = obj.photoIds === undefined ? [] : obj.photoIds;
  if (!Array.isArray(photoIds) || photoIds.length > 20 ||
      photoIds.some((id) => typeof id !== 'string' || !/^[a-f0-9]{64}$/.test(id)) ||
      new Set(photoIds).size !== photoIds.length) {
    return { ok: false, error: 'A lista de fotos é inválida.' };
  }
  if (template !== 'classico' && template !== 'moderno' && template !== 'romantico') {
    return { ok: false, error: 'Escolha um dos modelos disponíveis.' };
  }
  if (!coupleNames || coupleNames.length > 120) {
    return { ok: false, error: 'Informe os nomes do casal em até 120 caracteres.' };
  }
  if (eventLocation.length > 200 || story.length > 5000 || welcomeMessage.length > 500) {
    return { ok: false, error: 'Um dos campos ultrapassou o tamanho permitido.' };
  }
  if (!validDate(eventDate)) return { ok: false, error: 'Informe uma data válida.' };
  if ([coupleNames, eventLocation, story, welcomeMessage].some((s) => /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/.test(s))) {
    return { ok: false, error: 'O conteúdo contém caracteres inválidos.' };
  }
  return { ok: true, content: { template, templateVersion: 1, coupleNames, eventDate, eventLocation, story, welcomeMessage, photoIds } };
}

export function contentFromForm(form: FormData): ValidationResult {
  return validateContent({ ...Object.fromEntries(
    ['template', 'coupleNames', 'eventDate', 'eventLocation', 'story', 'welcomeMessage']
      .map((key) => [key, form.get(key)]),
  ), templateVersion: 1, photoIds: form.getAll('photoIds') });
}

/** New forms collect both names separately; old submissions keep using coupleNames. */
export function coupleNamesFromForm(form: FormData): string | null {
  const first = form.get('firstName');
  const second = form.get('secondName');
  if (first === null && second === null) {
    const legacy = form.get('coupleNames');
    return typeof legacy === 'string' ? legacy : null;
  }
  if (typeof first !== 'string' || typeof second !== 'string' || !first.trim() || !second.trim()) return null;
  return `${first.trim()} e ${second.trim()}`;
}

const reservedSlugs = new Set(['admin', 'api', 'login', 'logout', 'cadastro', 'painel', 'novo', 's', 'www']);

export function normalizeSlug(value: unknown): string | null {
  if (typeof value !== 'string' || value.length > 160) return null;
  const slug = value.trim().normalize('NFKD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  return slug.length >= 3 && slug.length <= 60 && !reservedSlugs.has(slug) ? slug : null;
}
