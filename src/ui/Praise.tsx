import confetti from 'canvas-confetti';
import { useEffect } from 'react';
import { showPraise, usePraise } from '../store';
import { rub } from './bits';
import { Sparkle } from './icons';

const COLORS = ['#6A4CF5', '#2F6FD6', '#FFD66B', '#C9BBFF', '#A9D3FF', '#FF9CC9'];

function burst(big: boolean) {
  const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  if (reduce) return;
  const base = { colors: COLORS, zIndex: 80, disableForReducedMotion: true, shapes: ['circle', 'star'] as confetti.Shape[] };
  confetti({ ...base, particleCount: big ? 160 : 90, spread: 80, startVelocity: 42, origin: { y: 0.62 } });
  if (big) {
    setTimeout(() => confetti({ ...base, particleCount: 80, angle: 60, spread: 60, origin: { x: 0, y: 0.7 } }), 220);
    setTimeout(() => confetti({ ...base, particleCount: 80, angle: 120, spread: 60, origin: { x: 1, y: 0.7 } }), 380);
  }
}

export function Praise() {
  const p = usePraise();
  useEffect(() => {
    if (!p) return;
    burst(!!p.big);
    navigator.vibrate?.(30);
  }, [p]);
  if (!p) return null;
  const close = () => showPraise(null);
  return (
    <div className="praise-wrap" onClick={close}>
      <div className="praise" role="dialog" aria-modal="true" aria-label="Похвала" onClick={(e) => e.stopPropagation()}>
        <Sparkle className="sp" size={20} color="#C9BBFF" style={{ top: 18, right: 22 }} />
        <Sparkle className="sp" size={11} color="#A9D3FF" style={{ top: 44, right: 50 }} />
        <Sparkle className="sp" size={14} color="#FFD66B" style={{ top: 26, left: 26 }} />
        <Sparkle className="sp" size={9} color="#C9BBFF" style={{ top: 58, left: 52 }} />
        <div className="praise-star">
          <Sparkle size={40} color="#fff" />
        </div>
        <div className="praise-phrase">{p.phrase}</div>
        <div className="praise-task">{p.title}</div>
        {p.amount !== undefined && (
          <div className="stack" style={{ alignItems: 'center', gap: 2 }}>
            <div className="praise-amount">+{rub(p.amount)}</div>
            {!!p.bonusPct && <div className="price-bonus">включая бонус +{p.bonusPct}% за серию</div>}
            {p.target && <div className="praise-task">→ {p.target}</div>}
          </div>
        )}
        {p.extra?.map((x, i) => (
          <div key={i} className="praise-extra">
            {x}
          </div>
        ))}
        <button className="btn block" onClick={close} autoFocus>
          Ура!
        </button>
      </div>
    </div>
  );
}
