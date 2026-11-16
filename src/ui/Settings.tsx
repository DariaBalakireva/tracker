import { useRef, useState } from 'react';
import { addCategory, deleteCategory, updateCategory } from '../logic/actions';
import { dayKey } from '../logic/date';
import { BUILTIN_PHRASES } from '../logic/phrases';
import type { AppState, Category } from '../logic/types';
import { commit, getState, useApp } from '../store';
import { allPhotos, replaceAll } from '../storage';
import { CategoryPill, Confirm, Sheet } from './bits';
import { CategoryEditor } from './CategoryEditor';
import { IconDownload, IconEdit, IconPlus, IconShare, IconTrash } from './icons';

const blobToDataUrl = (b: Blob) =>
  new Promise<string>((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(r.result as string);
    r.onerror = () => rej(r.error);
    r.readAsDataURL(b);
  });

async function exportBackup() {
  const photos = await allPhotos();
  const data = {
    app: 'tracker',
    version: 1,
    exportedAt: new Date().toISOString(),
    state: getState(),
    photos: await Promise.all(photos.map(async ([id, blob]) => [id, await blobToDataUrl(blob)])),
  };
  const file = new File([JSON.stringify(data)], `tracker-${dayKey()}.json`, { type: 'application/json' });
  try {
    if (navigator.canShare?.({ files: [file] })) {
      await navigator.share({ files: [file], title: 'Резервная копия Трекера' });
      return;
    }
  } catch (e) {
    if ((e as Error).name === 'AbortError') return;
  }
  const a = document.createElement('a');
  a.href = URL.createObjectURL(file);
  a.download = file.name;
  document.body.appendChild(a);
  a.click();
  a.remove();
}

interface Backup {
  app: string;
  version: number;
  exportedAt: string;
  state: AppState;
  photos: [string, string][];
}

async function readBackup(file: File): Promise<Backup> {
  const data = JSON.parse(await file.text()) as Backup;
  if (data?.app !== 'tracker' || data.state?.version !== 1 || !Array.isArray(data.state.tasks)) throw new Error('bad');
  return data;
}

async function restore(b: Backup) {
  const photos: [string, Blob][] = await Promise.all(
    (b.photos ?? []).map(async ([id, url]) => [id, await (await fetch(url)).blob()] as [string, Blob]),
  );
  await replaceAll(b.state, photos);
  location.reload();
}

export function Settings({ onClose }: { onClose: () => void }) {
  const s = useApp();
  const [editCat, setEditCat] = useState<Category | 'new' | null>(null);
  const [delCat, setDelCat] = useState<Category | null>(null);
  const [phrase, setPhrase] = useState('');
  const [pending, setPending] = useState<Backup | null>(null);
  const [importError, setImportError] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  return (
    <Sheet title="Настройки" onClose={onClose}>
      <section className="stack">
        <h3 className="label" style={{ margin: 0 }}>КАТЕГОРИИ</h3>
        {s.categories.map((c) => {
          const n = s.tasks.filter((t) => t.categoryId === c.id).length;
          return (
            <div key={c.id} className="task" style={{ padding: '8px 8px 8px 14px' }}>
              <div style={{ flex: 1, minWidth: 0 }} className="stack">
                <CategoryPill category={c} />
                <span className="meta">{n ? `${n} ${n === 1 ? 'задание' : n < 5 ? 'задания' : 'заданий'}` : 'нет заданий'}</span>
              </div>
              <button className="icon-btn flat" aria-label={`Изменить категорию ${c.name}`} onClick={() => setEditCat(c)}>
                <IconEdit size={18} />
              </button>
              <button className="icon-btn flat" style={{ background: 'var(--danger-tint)', color: 'var(--danger)' }} aria-label={`Удалить категорию ${c.name}`} onClick={() => setDelCat(c)}>
                <IconTrash size={18} />
              </button>
            </div>
          );
        })}
        <button className="btn soft block small" onClick={() => setEditCat('new')}>
          <IconPlus size={18} /> Новая категория
        </button>
      </section>

      <section className="stack">
        <h3 className="label" style={{ margin: 0 }}>СВОИ ФРАЗЫ ПОХВАЛЫ</h3>
        <span className="hint">
          Кроме {BUILTIN_PHRASES.length} встроенных. Свои будут попадаться чаще. Можно вставить {'{task}'} — подставится название задания.
        </span>
        {s.phrases.map((p, i) => (
          <div key={i} className="task" style={{ padding: '8px 8px 8px 14px' }}>
            <span style={{ flex: 1, fontWeight: 700 }}>{p}</span>
            <button
              className="icon-btn flat"
              style={{ background: 'var(--danger-tint)', color: 'var(--danger)' }}
              aria-label="Удалить фразу"
              onClick={() => commit({ ...getState(), phrases: getState().phrases.filter((_, j) => j !== i) })}
            >
              <IconTrash size={18} />
            </button>
          </div>
        ))}
        <div className="row">
          <input
            className="input"
            style={{ flex: 1 }}
            aria-label="Новая фраза"
            placeholder="Например: ты лучшая!"
            value={phrase}
            maxLength={120}
            onChange={(e) => setPhrase(e.target.value)}
          />
          <button
            className="btn small"
            disabled={!phrase.trim()}
            onClick={() => {
              commit({ ...getState(), phrases: [...getState().phrases, phrase.trim()] });
              setPhrase('');
            }}
          >
            Добавить
          </button>
        </div>
      </section>

      <section className="stack">
        <h3 className="label" style={{ margin: 0 }}>РЕЗЕРВНАЯ КОПИЯ</h3>
        <span className="hint">
          Все данные хранятся только на этом телефоне. Если удалить Трекер с экрана «Домой», они пропадут — поэтому иногда сохраняй
          копию в «Файлы».
        </span>
        <button className="btn soft block small" onClick={() => void exportBackup()}>
          <IconShare size={18} /> Сохранить копию
        </button>
        <button className="btn ghost block small" onClick={() => fileRef.current?.click()}>
          <IconDownload size={18} /> Восстановить из копии
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="application/json,.json"
          hidden
          onChange={async (e) => {
            const f = e.target.files?.[0];
            e.target.value = '';
            if (!f) return;
            try {
              setImportError('');
              setPending(await readBackup(f));
            } catch {
              setImportError('Это не похоже на копию Трекера.');
            }
          }}
        />
        {importError && <div className="error" role="alert">{importError}</div>}
      </section>

      {editCat && (
        <Sheet title={editCat === 'new' ? 'Новая категория' : 'Категория'} onClose={() => setEditCat(null)}>
          <CategoryEditor
            initial={editCat === 'new' ? undefined : editCat}
            saveLabel={editCat === 'new' ? 'Создать' : 'Сохранить'}
            onSave={(c) => {
              commit(editCat === 'new' ? addCategory(getState(), c).state : updateCategory(getState(), editCat.id, c));
              setEditCat(null);
            }}
          />
        </Sheet>
      )}
      {delCat && (
        <Confirm
          title={`Удалить «${delCat.name}»?`}
          text="Задания из этой категории никуда не денутся — они перейдут в «Без категории»."
          yes="Удалить категорию"
          danger
          onYes={() => commit(deleteCategory(getState(), delCat.id))}
          onClose={() => setDelCat(null)}
        />
      )}
      {pending && (
        <Confirm
          title="Восстановить из копии?"
          text={`Копия от ${new Date(pending.exportedAt).toLocaleString('ru-RU')}. Всё, что сейчас в Трекере, заменится данными из копии.`}
          yes="Восстановить"
          onYes={() => void restore(pending)}
          onClose={() => setPending(null)}
        />
      )}
    </Sheet>
  );
}
