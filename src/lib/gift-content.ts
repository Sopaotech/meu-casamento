/** Values in this module are validated on the server; cents are never floating point. */
export const MAX_GIFTS = 100;
export const MAX_GIFT_CENTS = 100_000_000;

export type GiftFields = { name: string; description: string; valueCents: number | null };
export type PublicGift = GiftFields & { id: string; imageId: string | null };

const controls = /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/;

export function parseGiftAmount(value: unknown): number | null | 'invalid' {
  if (typeof value !== 'string') return 'invalid';
  const input = value.trim();
  if (!input) return null; // A free contribution, with no suggested amount.
  const match = /^(0|[1-9]\d{0,6})(?:[,.](\d{1,2}))?$/.exec(input);
  if (!match) return 'invalid';
  const cents = Number(match[1]) * 100 + Number((match[2] ?? '').padEnd(2, '0'));
  return Number.isSafeInteger(cents) && cents >= 1 && cents <= MAX_GIFT_CENTS ? cents : 'invalid';
}

export function validateGiftFields(name: unknown, description: unknown, amount: unknown): GiftFields | null {
  if (typeof name !== 'string' || typeof description !== 'string') return null;
  const cleanName = name.trim();
  const cleanDescription = description.trim();
  const valueCents = parseGiftAmount(amount);
  if (!cleanName || cleanName.length > 100 || cleanDescription.length > 500 ||
      controls.test(cleanName) || controls.test(cleanDescription) || valueCents === 'invalid') return null;
  return { name: cleanName, description: cleanDescription, valueCents };
}

export function validatePublicGifts(value: unknown): PublicGift[] | null {
  if (value == null) return []; // Older publications had no gift snapshot.
  if (!Array.isArray(value) || value.length > MAX_GIFTS) return null;
  const ids = new Set<string>();
  const result: PublicGift[] = [];
  for (const entry of value) {
    if (!entry || typeof entry !== 'object' || Array.isArray(entry)) return null;
    const obj = entry as Record<string, unknown>;
    if (typeof obj.id !== 'string' || !/^[a-zA-Z0-9_-]{1,128}$/.test(obj.id) || ids.has(obj.id) ||
        typeof obj.name !== 'string' || !obj.name.trim() || obj.name.length > 100 ||
        typeof obj.description !== 'string' || obj.description.length > 500 ||
        controls.test(obj.name) || controls.test(obj.description) ||
        (obj.valueCents !== null && (!Number.isInteger(obj.valueCents) || (obj.valueCents as number) < 1 || (obj.valueCents as number) > MAX_GIFT_CENTS)) ||
        (obj.imageId !== null && (typeof obj.imageId !== 'string' || !/^[a-f0-9]{64}$/.test(obj.imageId)))) return null;
    ids.add(obj.id);
    result.push({ id: obj.id, name: obj.name, description: obj.description, valueCents: obj.valueCents as number | null, imageId: obj.imageId as string | null });
  }
  return result;
}

export function formatGiftAmount(cents: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(cents / 100);
}

export const GIFT_IDEAS = [
  'Lua de mel', 'Jantar romântico', 'Cafeteira', 'Jogo de jantar', 'Viagem', 'Passeio especial', 'Contribuição livre',
] as const;
