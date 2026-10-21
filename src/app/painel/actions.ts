'use server';

import { notFound, redirect } from 'next/navigation';
import { requireUser } from '@/lib/auth';
import { assertSameOrigin } from '@/lib/security';
import { contentFromForm, coupleNamesFromForm, initialContent, normalizeSlug, validateContent } from '@/lib/content';
import { createWedding, publishDraft, saveDraft, unpublish, WeddingError } from '@/lib/weddings';
import { PhotoError, removePhoto, uploadPhoto } from '@/lib/photos';

function idFromForm(form: FormData): string {
  const id = form.get('id');
  if (typeof id !== 'string' || id.length < 1 || id.length > 128) notFound();
  return id;
}

function versionFromForm(form: FormData): number | null {
  const value = form.get('version');
  if (typeof value !== 'string' || !/^\d{1,10}$/.test(value)) return null;
  const version = Number(value);
  return Number.isSafeInteger(version) && version >= 0 && version < 2147483647 ? version : null;
}

function editorPath(id: string, state: string): string {
  return `/painel/${encodeURIComponent(id)}?estado=${state}`;
}

function failFor(error: unknown): string {
  if (error instanceof WeddingError) {
    if (error.code === 'not-found') notFound();
    if (error.code === 'conflict') return 'conflito';
    if (error.code === 'slug-taken') return 'endereco-ocupado';
  }
  // Do not expose database errors or private data to the client.
  return 'erro';
}

export async function createWeddingAction(form: FormData) {
  await assertSameOrigin();
  const user = await requireUser();
  const slug = normalizeSlug(form.get('slug'));
  const validated = validateContent({ ...initialContent, coupleNames: coupleNamesFromForm(form) });
  if (!slug || !validated.ok) redirect('/painel/novo?estado=invalido');
  let id: string;
  try {
    const created = await createWedding(user.id, slug, validated.content.coupleNames);
    id = created.id;
  } catch (error) {
    redirect(`/painel/novo?estado=${failFor(error)}`);
  }
  redirect(editorPath(id, 'criado'));
}

export type SaveDraftState = { error: string | null };

export async function saveDraftAction(_previous: SaveDraftState, form: FormData): Promise<SaveDraftState> {
  await assertSameOrigin();
  const user = await requireUser();
  const id = idFromForm(form);
  const version = versionFromForm(form);
  const validated = contentFromForm(form);
  if (version === null) return { error: 'A versão do rascunho é inválida. Copie suas alterações e atualize a página.' };
  if (!validated.ok) return { error: validated.error };
  try {
    await saveDraft(user.id, id, version, validated.content);
  } catch (error) {
    const failure = failFor(error);
    return { error: failure === 'conflito'
      ? 'O rascunho mudou em outra sessão. Copie suas alterações, atualize a página e revise antes de salvar.'
      : 'Não foi possível salvar. Seus textos continuam no formulário; tente novamente.' };
  }
  redirect(editorPath(id, 'salvo'));
}

export async function publishAction(_previous: SaveDraftState, form: FormData): Promise<SaveDraftState> {
  await assertSameOrigin();
  const user = await requireUser();
  const id = idFromForm(form);
  const version = versionFromForm(form);
  if (version === null) return { error: 'A versão do rascunho é inválida. Atualize a página.' };
  try {
    await publishDraft(user.id, id, version);
  } catch (error) {
    const failure = failFor(error);
    return { error: failure === 'conflito'
      ? 'O rascunho mudou em outra sessão. Atualize a página e revise antes de publicar.'
      : 'Não foi possível publicar. Tente novamente.' };
  }
  redirect(editorPath(id, 'publicado'));
}

export async function unpublishAction(_previous: SaveDraftState, form: FormData): Promise<SaveDraftState> {
  await assertSameOrigin();
  const user = await requireUser();
  const id = idFromForm(form);
  const version = versionFromForm(form);
  if (version === null) return { error: 'A versão do rascunho é inválida. Atualize a página.' };
  try {
    await unpublish(user.id, id, version);
  } catch (error) {
    const failure = failFor(error);
    return { error: failure === 'conflito'
      ? 'O rascunho mudou em outra sessão. Atualize a página e revise antes de despublicar.'
      : 'Não foi possível despublicar. Tente novamente.' };
  }
  redirect(editorPath(id, 'despublicado'));
}

export type PhotoActionState = { error: string | null };

function photoFailure(error: unknown): string {
  if (error instanceof PhotoError) {
    if (error.code === 'not-found') notFound();
    if (error.code === 'conflict') return 'O rascunho mudou em outra sessão. Atualize a página e revise antes de tentar novamente.';
    if (error.code === 'invalid-format') return 'Escolha uma foto JPEG, PNG ou WebP válida, sem animação e com até 20 megapixels.';
    if (error.code === 'too-large') return 'A foto deve ter no máximo 5 MB.';
    if (error.code === 'draft-limit') return 'O rascunho pode ter no máximo 20 fotos.';
    if (error.code === 'storage-limit') return 'O limite de 100 fotos no rascunho e nas publicações preservadas foi atingido.';
    if (error.code === 'storage-error') return 'Não foi possível armazenar a foto. Tente novamente.';
  }
  return 'Não foi possível concluir a operação. Tente novamente.';
}

export async function uploadPhotoAction(_previous: PhotoActionState, form: FormData): Promise<PhotoActionState> {
  await assertSameOrigin();
  const user = await requireUser();
  const id = idFromForm(form);
  const version = versionFromForm(form);
  const file = form.get('photo');
  if (version === null) return { error: 'A versão do rascunho é inválida. Atualize a página.' };
  if (!(file instanceof File) || file.size === 0) return { error: 'Escolha uma foto JPEG, PNG ou WebP válida.' };
  // Check the length before allocating another buffer for the submitted file.
  if (file.size > 5 * 1024 * 1024) return { error: 'A foto deve ter no máximo 5 MB.' };
  try {
    await uploadPhoto(user.id, id, version, new Uint8Array(await file.arrayBuffer()));
  } catch (error) {
    return { error: photoFailure(error) };
  }
  redirect(editorPath(id, 'foto-adicionada'));
}

export async function removePhotoAction(_previous: PhotoActionState, form: FormData): Promise<PhotoActionState> {
  await assertSameOrigin();
  const user = await requireUser();
  const id = idFromForm(form);
  const version = versionFromForm(form);
  const photoId = form.get('photoId');
  if (version === null || typeof photoId !== 'string' || !/^[a-f0-9]{64}$/.test(photoId)) {
    return { error: 'A versão do rascunho ou a foto é inválida. Atualize a página.' };
  }
  try {
    await removePhoto(user.id, id, version, photoId);
  } catch (error) {
    return { error: photoFailure(error) };
  }
  redirect(editorPath(id, 'foto-removida'));
}
