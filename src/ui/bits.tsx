import { useEffect, useRef, useState, type ReactNode } from 'react';
import type { Category, ColorKey, ID } from '../logic/types';
import { loadPhoto } from '../storage';
import { IconClose, IconImage, Sparkle } from './icons';

export const COLORS: Record<ColorKey, { tint: string; ink: string; dot: string; name: string }> = {
  violet: { tint: '#ECE6FF', ink: '#4F35B8', dot: '#7B61FF', name: 'Фиолетовый' },
  blue: { tint: '#DDEEFF', ink: '#1F5FA8', dot: '#3E8FDB', name: 'Голубой' },
  green: { tint: '#DDF5EA', ink: '#1D7A55', dot: '#2FA67A', name: 'Зелёный' },
  pink: { tint: '#FFE4F1', ink: '#A3286A', dot: '#E0559A', name: 'Розовый' },
  orange: { tint: '#FFEBDD', ink: '#A4501A', dot: '#F08A3E', name: 'Оранжевый' },
  teal: { tint: '#D9F4F4', ink: '#16716F', dot: '#22A5A3', name: 'Бирюзовый' },
  yellow: { tint: '#FFF4CC', ink: '#82610A', dot: '#E2B323', name: 'Жёлтый' },
  gray: { tint: '#EEEDF3', ink: '#4D4960', dot: '#8F8BA3', name: 'Серый' },
};

export const rub = (n: number) => `${Math.round(n).toLocaleString('ru-RU')} ₽`;

export const NO_CATEGORY: Category = { id: '', name: 'Без категории', emoji: '📌', color: 'gray' };

export function findCategory(categories: Category[], id: ID | null): Category {
  return categories.find((c) => c.id === id) ?? NO_CATEGORY;
}

export function CategoryPill({ category, suffix }: { category: Category; suffix?: string }) {
  const c = COLORS[category.color];
  return (
    <span className="pill" style={{ background: c.tint, color: c.ink }}>
      <span aria-hidden="true">{category.emoji}</span>
      {category.name}
      {suffix ? ` · ${suffix}` : ''}
    </span>
  );
}

/** Нижняя шторка. */
export function Sheet({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', onKey);
    };
  }, [onClose]);
  return (
    <>
      <div className="backdrop" onClick={onClose} />
      <div className="sheet" role="dialog" aria-modal="true" aria-label={title}>
        <div className="sheet-handle" />
        <div className="sheet-head">
          <h2 className="h2">{title}</h2>
          <button className="icon-btn" aria-label="Закрыть" onClick={onClose}>
            <IconClose size={20} />
          </button>
        </div>
        <div className="sheet-body">{children}</div>
      </div>
    </>
  );
}

/** Окно подтверждения. */
export function Confirm({
  title,
  text,
  yes,
  danger,
  onYes,
  onClose,
}: {
  title: string;
  text?: string;
  yes: string;
  danger?: boolean;
  onYes: () => void;
  onClose: () => void;
}) {
  return (
    <Sheet title={title} onClose={onClose}>
      {text && <p className="hint" style={{ margin: 0, fontSize: 15 }}>{text}</p>}
      <button
        className={`btn block ${danger ? 'danger' : ''}`}
        onClick={() => {
          onYes();
          onClose();
        }}
      >
        {yes}
      </button>
      <button className="btn block ghost" onClick={onClose}>
        Отмена
      </button>
    </Sheet>
  );
}

const photoCache = new Map<string, string>();

export function usePhotoUrl(id: ID | null): string | null {
  const [url, setUrl] = useState<string | null>(id ? photoCache.get(id) ?? null : null);
  useEffect(() => {
    if (!id) {
      setUrl(null);
      return;
    }
    const cached = photoCache.get(id);
    if (cached) {
      setUrl(cached);
      return;
    }
    let alive = true;
    loadPhoto(id).then((blob) => {
      if (!blob || !alive) return;
      const u = URL.createObjectURL(blob);
      photoCache.set(id, u);
      setUrl(u);
    });
    return () => {
      alive = false;
    };
  }, [id]);
  return url;
}

export function Photo({ id, iconSize = 28 }: { id: ID | null; iconSize?: number }) {
  const url = usePhotoUrl(id);
  return url ? <img src={url} alt="" /> : <IconImage size={iconSize} />;
}

/** Блёстки на фоне экрана. */
export function BgSparkles() {
  return (
    <div className="bg-sparkles" aria-hidden="true">
      <Sparkle size={14} style={{ top: 'calc(var(--safe-t) + 34px)', right: 120 }} />
      <Sparkle size={9} color="#A9D3FF" style={{ top: 'calc(var(--safe-t) + 64px)', right: 150 }} />
      <Sparkle size={12} style={{ top: 470, left: 6 }} />
      <Sparkle size={10} color="#A9D3FF" style={{ top: 640, right: 6 }} />
    </div>
  );
}

/** Кольцо прогресса для плашки. */
export function Ring({ done, total, size = 80 }: { done: number; total: number; size?: number }) {
  const r = size / 2 - 8;
  const c = 2 * Math.PI * r;
  const frac = total > 0 ? done / total : 0;
  return (
    <div className="hero-ring" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label={`Сделано ${done} из ${total}`}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth={9} />
        {frac > 0 && (
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke="#fff"
            strokeWidth={9}
            strokeLinecap="round"
            strokeDasharray={`${frac * c} ${c}`}
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
            style={{ transition: 'stroke-dasharray 0.5s ease' }}
          />
        )}
      </svg>
      <span>
        {done}/{total}
      </span>
    </div>
  );
}

export function HeroSparkles() {
  return (
    <>
      <Sparkle className="sp" size={22} color="rgba(255,255,255,0.85)" style={{ top: 14, right: 18 }} />
      <Sparkle className="sp" size={12} color="rgba(255,255,255,0.6)" style={{ top: 44, right: 46 }} />
      <Sparkle className="sp" size={8} color="rgba(255,255,255,0.7)" style={{ bottom: 16, right: 26 }} />
    </>
  );
}

export function Progress({ value }: { value: number }) {
  const pct = Math.max(0, Math.min(100, value * 100));
  return (
    <div className="progress" role="progressbar" aria-valuenow={Math.round(pct)} aria-valuemin={0} aria-valuemax={100}>
      <div style={{ width: `${pct}%` }} />
      {pct > 0 && pct < 100 && <Sparkle size={14} color="#FFD66B" style={{ left: `calc(${pct}% - 7px)` }} />}
    </div>
  );
}

/** Поле суммы в рублях (только целые). */
export function MoneyInput({
  value,
  onChange,
  id,
  autoFocus,
}: {
  value: string;
  onChange: (v: string) => void;
  id?: string;
  autoFocus?: boolean;
}) {
  const ref = useRef<HTMLInputElement>(null);
  return (
    <div className="input-money">
      <input
        ref={ref}
        id={id}
        className="input"
        inputMode="numeric"
        pattern="[0-9]*"
        autoFocus={autoFocus}
        value={value}
        placeholder="0"
        onChange={(e) => onChange(e.target.value.replace(/\D/g, '').slice(0, 9))}
      />
    </div>
  );
}

export const toInt = (v: string) => (v === '' ? NaN : parseInt(v, 10));

/** Делает ссылки в тексте кликабельными. */
export function Linkify({ text }: { text: string }) {
  const parts = text.split(/(https?:\/\/[^\s]+)/g);
  return (
    <>
      {parts.map((p, i) =>
        /^https?:\/\//.test(p) ? (
          <a key={i} href={p} target="_blank" rel="noreferrer" style={{ overflowWrap: 'anywhere' }}>
            {p.replace(/^https?:\/\/(www\.)?/, '').slice(0, 40)}
            {p.length > 48 ? '…' : ''}
          </a>
        ) : (
          <span key={i}>{p}</span>
        ),
      )}
    </>
  );
}
