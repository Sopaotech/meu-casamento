import { describe, expect, it } from 'vitest';
import { MAX_GIFT_CENTS, parseGiftAmount, validateGiftFields, validatePublicGifts } from '../src/lib/gift-content';

describe('regras de valores e conteúdo de presentes', () => {
  it('converte valores brasileiros em centavos sem arredondamentos', () => {
    expect(parseGiftAmount('')).toBeNull();
    expect(parseGiftAmount(' 39,9 ')).toBe(3990);
    expect(parseGiftAmount('0,01')).toBe(1);
    expect(parseGiftAmount('1000000,00')).toBe(MAX_GIFT_CENTS);
  });
  it.each(['0', '-1', '1,001', '1.000,00', '1e2', 'NaN', '1000000,01', '01', 'R$ 2', '1,'])('recusa valor inválido %s', value => {
    expect(parseGiftAmount(value)).toBe('invalid');
  });
  it('valida nome, descrição e permite valor livre', () => {
    expect(validateGiftFields(' Lua de mel ', 'Nossa viagem', '')).toEqual({ name: 'Lua de mel', description: 'Nossa viagem', valueCents: null });
    expect(validateGiftFields('', '', '1')).toBeNull();
    expect(validateGiftFields('presente\u0000', '', '1')).toBeNull();
    expect(validateGiftFields('presente', 'x'.repeat(501), '1')).toBeNull();
  });
  it('aceita revisões antigas e recusa snapshots malformados ou duplicados', () => {
    expect(validatePublicGifts(null)).toEqual([]);
    const item = { id: 'gift1', name: 'Café', description: '', valueCents: 9900, imageId: null };
    expect(validatePublicGifts([item])).toEqual([item]);
    expect(validatePublicGifts([item, item])).toBeNull();
    expect(validatePublicGifts([{ ...item, valueCents: -1 }])).toBeNull();
    expect(validatePublicGifts([{ ...item, imageId: '../private' }])).toBeNull();
  });
});
