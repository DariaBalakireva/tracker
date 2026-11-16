import { useState } from 'react';
import type { Category, ColorKey } from '../logic/types';
import { COLORS } from './bits';

const EMOJI = ['💪', '🧘‍♀️', '🏃‍♀️', '💧', '🥗', '😴', '📚', '✍️', '🧠', '🏠', '🧹', '🛒', '💼', '💻', '🎨', '🎸', '🌿', '🐶', '💅', '👗', '💰', '❤️', '⭐', '🌙'];

export function CategoryEditor({
  initial,
  onSave,
  onCancel,
  saveLabel = 'Сохранить',
}: {
  initial?: Category;
  onSave: (c: Omit<Category, 'id'>) => void;
  onCancel?: () => void;
  saveLabel?: string;
}) {
  const [name, setName] = useState(initial?.name ?? '');
  const [emoji, setEmoji] = useState(initial?.emoji ?? '⭐');
  const [color, setColor] = useState<ColorKey>(initial?.color ?? 'violet');
  const valid = name.trim().length > 0 && emoji.trim().length > 0;
  return (
    <div className="stack lg">
      <div className="row" style={{ alignItems: 'flex-end' }}>
        <div className="field" style={{ width: 76 }}>
          <label className="label" htmlFor="cat-emoji">
            Эмодзи
          </label>
          <input
            id="cat-emoji"
            className="input"
            style={{ textAlign: 'center', fontSize: 22, padding: 8 }}
            value={emoji}
            onChange={(e) => setEmoji([...e.target.value].slice(-2).join(''))}
          />
        </div>
        <div className="field" style={{ flex: 1 }}>
          <label className="label" htmlFor="cat-name">
            Название категории
          </label>
          <input
            id="cat-name"
            className="input"
            value={name}
            maxLength={30}
            placeholder="Например, Красота"
            onChange={(e) => setName(e.target.value)}
          />
        </div>
      </div>
      <div className="chips" aria-label="Быстрый выбор эмодзи">
        {EMOJI.map((e) => (
          <button
            key={e}
            type="button"
            className="chip day-chip"
            style={{ fontSize: 20 }}
            aria-pressed={emoji === e}
            aria-label={`Эмодзи ${e}`}
            onClick={() => setEmoji(e)}
          >
            {e}
          </button>
        ))}
      </div>
      <div className="field">
        <span className="label">Цвет</span>
        <div className="swatches">
          {(Object.keys(COLORS) as ColorKey[]).map((k) => (
            <button
              key={k}
              type="button"
              className="swatch"
              style={{ background: COLORS[k].dot }}
              aria-label={COLORS[k].name}
              aria-pressed={color === k}
              onClick={() => setColor(k)}
            />
          ))}
        </div>
      </div>
      <div className="row">
        {onCancel && (
          <button type="button" className="btn ghost small" onClick={onCancel}>
            Отмена
          </button>
        )}
        <button
          type="button"
          className="btn small"
          style={{ flex: 1 }}
          disabled={!valid}
          onClick={() => onSave({ name: name.trim(), emoji: emoji.trim(), color })}
        >
          {saveLabel}
        </button>
      </div>
    </div>
  );
}
