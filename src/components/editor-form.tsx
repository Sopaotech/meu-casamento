'use client';

import { useActionState, useState } from 'react';
import Link from 'next/link';
import type { WeddingContent } from '@/lib/content';
import { publishAction, removePhotoAction, saveDraftAction, unpublishAction, uploadPhotoAction } from '@/app/painel/actions';

/** Controlled fields preserve the user's text if validation or a version conflict fails. */
export function EditorForm({ id, version, initial, slug, published }: { id: string; version: number; initial: WeddingContent; slug: string; published: boolean }) {
  const [content, setContent] = useState(initial);
  const [state, submit, pending] = useActionState(saveDraftAction, { error: null });
  const [photoTooLarge, setPhotoTooLarge] = useState(false);
  const [uploadState, uploadSubmit, uploadPending] = useActionState(uploadPhotoAction, { error: null });
  const [removeState, removeSubmit, removePending] = useActionState(removePhotoAction, { error: null });
  const [publishState, publishSubmit, publishPending] = useActionState(publishAction, { error: null });
  const [unpublishState, unpublishSubmit, unpublishPending] = useActionState(unpublishAction, { error: null });
  const photoPending = uploadPending || removePending;
  const publicationPending = publishPending || unpublishPending;
  const operationPending = pending || photoPending || publicationPending;
  const editableFields = ['template', 'coupleNames', 'eventDate', 'eventLocation', 'story', 'welcomeMessage'] as const;
  const dirty = editableFields.some((key) => content[key] !== initial[key]);
  return <>
  <form action={submit} className="card stack">
    <fieldset className="editor-text-fields stack" disabled={operationPending}>
    <input type="hidden" name="id" value={id} /><input type="hidden" name="version" value={version} />
    {content.photoIds.map((photoId) => <input key={photoId} type="hidden" name="photoIds" value={photoId} />)}
    {state.error && <p className="error" role="alert">{state.error}</p>}
    <label className="field">Modelo
      <select name="template" value={content.template} onChange={(e) => setContent({ ...content, template: e.target.value as WeddingContent['template'] })}>
        <option value="classico">Clássico</option><option value="moderno">Moderno</option><option value="romantico">Romântico</option>
      </select>
    </label>
    <label className="field">Nomes do casal<input name="coupleNames" required maxLength={120} value={content.coupleNames} onChange={(e) => setContent({ ...content, coupleNames: e.target.value })} /></label>
    <label className="field">Data do casamento<input type="date" name="eventDate" min="1900-01-01" max="2100-12-31" value={content.eventDate} onChange={(e) => setContent({ ...content, eventDate: e.target.value })} /></label>
    <label className="field">Local<input name="eventLocation" maxLength={200} value={content.eventLocation} onChange={(e) => setContent({ ...content, eventLocation: e.target.value })} /></label>
    <label className="field">Mensagem de boas-vindas<textarea name="welcomeMessage" maxLength={500} rows={3} value={content.welcomeMessage} onChange={(e) => setContent({ ...content, welcomeMessage: e.target.value })} /></label>
    <label className="field">Nossa história<textarea name="story" maxLength={5000} rows={8} value={content.story} onChange={(e) => setContent({ ...content, story: e.target.value })} /></label>
    <div><button className="button" type="submit" disabled={pending}>{pending ? 'Salvando…' : 'Salvar rascunho'}</button></div>
    </fieldset>
  </form>
  <section className="card stack" aria-labelledby="photos-heading">
    <h2 id="photos-heading">Fotos</h2>
    <p>Adicione até 20 fotos estáticas em JPEG, PNG ou WebP, de até 5 MB e 20 megapixels cada. Imagens animadas não são aceitas. A galeria será atualizada no site quando você publicar o rascunho.</p>
    <p className="text-muted">Até 100 fotos podem ser usadas no rascunho e em publicações preservadas. Fotos removidas sem referência não contam nesse limite.</p>
    <p className="text-muted">{content.photoIds.length} de 20 fotos no rascunho.</p>
    {dirty && <p className="notice">Salve suas alterações de texto antes de adicionar ou remover fotos.</p>}
    {uploadState.error && <p className="error" role="alert">{uploadState.error}</p>}
    {removeState.error && <p className="error" role="alert">{removeState.error}</p>}
    <form action={uploadSubmit} className="stack">
      <input type="hidden" name="id" value={id} /><input type="hidden" name="version" value={version} />
      <label className="field">Escolher foto
        <input type="file" name="photo" accept="image/jpeg,image/png,image/webp" required disabled={dirty || operationPending || content.photoIds.length >= 20}
          onChange={(event) => {
            const file = event.currentTarget.files?.[0];
            setPhotoTooLarge(Boolean(file && file.size > 5 * 1024 * 1024));
          }} />
      </label>
      {photoTooLarge && <p className="error" role="alert">A foto deve ter no máximo 5 MB.</p>}
      <button className="button button-secondary" type="submit" disabled={dirty || operationPending || content.photoIds.length >= 20 || photoTooLarge}>{uploadPending ? 'Enviando…' : 'Adicionar foto'}</button>
    </form>
    {content.photoIds.length > 0 && <div className="editor-photos">
      {content.photoIds.map((photoId, index) => <div className="editor-photo" key={photoId}>
        {/* Native images request the access-controlled route directly, without a shared image optimizer cache. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={`/fotos/${photoId}`} alt={`Foto ${index + 1} do casamento`} loading="lazy" />
        <form action={removeSubmit}>
          <input type="hidden" name="id" value={id} /><input type="hidden" name="version" value={version} />
          <input type="hidden" name="photoId" value={photoId} />
          <button className="button button-secondary" type="submit" disabled={dirty || operationPending}>{`Remover foto ${index + 1}`}</button>
        </form>
      </div>)}
    </div>}
  </section>
  <section className="card stack"><h2>Prévia e publicação</h2>
    {publishState.error && <p className="error" role="alert">{publishState.error}</p>}
    {unpublishState.error && <p className="error" role="alert">{unpublishState.error}</p>}
    <p>A prévia e a publicação usam o último rascunho salvo. {dirty ? 'Salve suas alterações para continuar.' : 'Você pode revisar a prévia antes de publicar.'}</p>
    <div>{dirty ? <span className="text-muted">Salve para ver a prévia privada</span> : <Link className="button button-secondary" href={`/painel/${encodeURIComponent(id)}/previa`}>Ver prévia privada</Link>}</div>
    <form action={publishSubmit}><input type="hidden" name="id" value={id} /><input type="hidden" name="version" value={version} />
      <button className="button" type="submit" disabled={dirty || operationPending}>{publishPending ? 'Publicando…' : published ? 'Republicar site' : 'Publicar site'}</button>
    </form>
    {published && <>
      <div><Link href={`/s/${encodeURIComponent(slug)}`}>Abrir site público</Link></div>
      <form action={unpublishSubmit}><input type="hidden" name="id" value={id} /><input type="hidden" name="version" value={version} />
        <button className="button button-ghost" type="submit" disabled={dirty || operationPending}>{unpublishPending ? 'Despublicando…' : 'Despublicar'}</button>
      </form>
    </>}
  </section>
  </>;
}
