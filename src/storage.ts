import { createStore, del, entries, get, set, clear } from 'idb-keyval';
import type { AppState } from './logic/types';

const stateDb = createStore('tracker-state', 'kv');
const photoDb = createStore('tracker-photos', 'photos');

export async function loadState(): Promise<AppState | undefined> {
  return get<AppState>('state', stateDb);
}

let chain: Promise<unknown> = Promise.resolve();
/** Сохраняем по очереди, чтобы более старая версия не перезаписала новую. */
export function saveState(s: AppState): Promise<unknown> {
  chain = chain.then(() => set('state', s, stateDb)).catch((e) => console.error('save failed', e));
  return chain;
}

export const savePhoto = (id: string, blob: Blob) => set(id, blob, photoDb);
export const loadPhoto = (id: string) => get<Blob>(id, photoDb);
export const deletePhoto = (id: string) => del(id, photoDb);
export const allPhotos = () => entries<string, Blob>(photoDb);

export async function replaceAll(state: AppState, photos: [string, Blob][]) {
  await clear(photoDb);
  for (const [id, blob] of photos) await set(id, blob, photoDb);
  await set('state', state, stateDb);
}

/** Просим браузер не удалять данные при нехватке места. */
export async function requestPersistence() {
  try {
    if (navigator.storage?.persist && !(await navigator.storage.persisted())) await navigator.storage.persist();
  } catch {
    /* не поддерживается — не страшно */
  }
}

/** Уменьшаем фото, чтобы не занимать лишнее место на телефоне. */
export async function shrinkImage(file: Blob, max = 1080): Promise<Blob> {
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.decoding = 'async';
    img.src = url;
    await img.decode();
    const scale = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight));
    const w = Math.round(img.naturalWidth * scale);
    const h = Math.round(img.naturalHeight * scale);
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    canvas.getContext('2d')!.drawImage(img, 0, 0, w, h);
    const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, 'image/jpeg', 0.85));
    return blob ?? file;
  } catch {
    return file;
  } finally {
    URL.revokeObjectURL(url);
  }
}
