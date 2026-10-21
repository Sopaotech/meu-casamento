'use server';

import { notFound, redirect } from 'next/navigation';
import { requireUser } from '@/lib/auth';
import { assertSameOrigin } from '@/lib/security';
import { archiveGift, createGift, GiftError, updateGift, uploadGiftImage } from '@/lib/gifts';
import { MAX_PHOTO_BYTES, PhotoError } from '@/lib/photos';

function identifier(value: FormDataEntryValue | null): string {
  if (typeof value !== 'string' || !/^[a-zA-Z0-9_-]{1,128}$/.test(value)) notFound();
  return value;
}
function version(value: FormDataEntryValue | null): number {
  if (typeof value !== 'string' || !/^\d{1,10}$/.test(value)) throw new GiftError('invalid');
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 0 || parsed >= 2147483647) throw new GiftError('invalid');
  return parsed;
}
function giftPath(id: string, status: string) { return `/painel/${encodeURIComponent(id)}/presentes?estado=${status}`; }
function errorState(error: unknown): string {
  if (error instanceof GiftError) {
    if (error.code === 'not-found') notFound();
    return error.code;
  }
  if (error instanceof PhotoError) return error.code === 'storage-error' ? 'storage-error' : 'invalid-image';
  return 'error';
}

export async function createGiftAction(form: FormData) {
  await assertSameOrigin();
  const user = await requireUser();
  const weddingId = identifier(form.get('weddingId'));
  try {
    await createGift(user.id, weddingId, version(form.get('version')), { name: form.get('name'), description: form.get('description'), amount: form.get('amount') });
  } catch (error) { redirect(giftPath(weddingId, errorState(error))); }
  redirect(giftPath(weddingId, 'created'));
}

export async function updateGiftAction(form: FormData) {
  await assertSameOrigin();
  const user = await requireUser();
  const weddingId = identifier(form.get('weddingId'));
  const giftId = identifier(form.get('giftId'));
  try {
    await updateGift(user.id, weddingId, version(form.get('version')), giftId, { name: form.get('name'), description: form.get('description'), amount: form.get('amount'), position: form.get('position'), active: form.get('active') });
  } catch (error) { redirect(giftPath(weddingId, errorState(error))); }
  redirect(giftPath(weddingId, 'updated'));
}

export async function archiveGiftAction(form: FormData) {
  await assertSameOrigin();
  const user = await requireUser();
  const weddingId = identifier(form.get('weddingId'));
  const giftId = identifier(form.get('giftId'));
  try { await archiveGift(user.id, weddingId, version(form.get('version')), giftId); }
  catch (error) { redirect(giftPath(weddingId, errorState(error))); }
  redirect(giftPath(weddingId, 'archived'));
}

export async function uploadGiftImageAction(form: FormData) {
  await assertSameOrigin();
  const user = await requireUser();
  const weddingId = identifier(form.get('weddingId'));
  const giftId = identifier(form.get('giftId'));
  try {
    const file = form.get('image');
    if (!(file instanceof File) || !file.size || file.size > MAX_PHOTO_BYTES) throw new GiftError('invalid');
    await uploadGiftImage(user.id, weddingId, version(form.get('version')), giftId, new Uint8Array(await file.arrayBuffer()));
  } catch (error) { redirect(giftPath(weddingId, errorState(error))); }
  redirect(giftPath(weddingId, 'image'));
}
