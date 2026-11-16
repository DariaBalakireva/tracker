import { useState } from 'react';
import {
  addDays,
  addMonths,
  daysInMonth,
  formatMonth,
  formatShort,
  monthNameShort,
  monthStart,
  parts,
  toKey,
  WEEKDAY_SHORT,
  weekday,
} from '../logic/date';
import { plural } from '../logic/schedule';
import { bestCurrentStreak, categoryStats, dayStats, monthStats, periodBounds } from '../logic/stats';
import { useApp } from '../store';
import { BgSparkles, COLORS, findCategory, rub } from '../ui/bits';
import { useFlow } from '../ui/flows';
import { Flame, IconChevronLeft, IconChevronRight } from '../ui/icons';

type Period = 'week' | 'month' | 'all';

function Bars({ items, mode }: { items: { label: string; count: number; earned: number; title: string }[]; mode: 'count' | 'money' }) {
  const val = (x: { count: number; earned: number }) => (mode === 'count' ? x.count : x.earned);
  const max = Math.max(1, ...items.map(val));
  const dense = items.length > 14;
  return (
    <div className="bars" role="img" aria-label={mode === 'count' ? 'Выполненные задания по дням' : 'Заработанные деньги по дням'}>
      {items.map((x, i) => {
        const v = val(x);
        return (
          <div key={i} className="bar-col" title={x.title}>
            {!dense && v > 0 && <span className="bar-val">{mode === 'count' ? v : v >= 1000 ? `${Math.round(v / 100) / 10}k` : v}</span>}
            <div className={`bar ${v === 0 ? 'zero' : ''}`} style={{ height: `${(v / max) * 100}%` }} />
            <span className="bar-label">{x.label}</span>
          </div>
        );
      })}
    </div>
  );
}

function ActivityCalendar({ today }: { today: string }) {
  const s = useApp();
  const [month, setMonth] = useState(monthStart(today));
  const [y, m] = parts(month);
  const total = daysInMonth(y, m);
  const stats = dayStats(s, month, toKey(y, m, total));
  const max = Math.max(1, ...stats.map((d) => d.count));
  const level = (n: number) => (n === 0 ? '' : `l${Math.min(4, Math.ceil((n / max) * 4))}`);
  const active = stats.filter((d) => d.count > 0).length;
  return (
    <div className="card pad stack">
      <div className="row between">
        <button className="icon-btn flat" aria-label="Предыдущий месяц" onClick={() => setMonth(addMonths(month, -1))}>
          <IconChevronLeft size={18} />
        </button>
        <div className="stack" style={{ alignItems: 'center', gap: 0 }}>
          <span style={{ fontWeight: 800 }}>{formatMonth(month)}</span>
          <span className="hint">
            {active} {plural(active, 'активный день', 'активных дня', 'активных дней')}
          </span>
        </div>
        <button className="icon-btn flat" aria-label="Следующий месяц" disabled={month >= monthStart(today)} onClick={() => setMonth(addMonths(month, 1))}>
          <IconChevronRight size={18} />
        </button>
      </div>
      <div className="cal">
        {WEEKDAY_SHORT.map((d) => (
          <span key={d} className="cal-h">
            {d}
          </span>
        ))}
        {Array.from({ length: weekday(month) - 1 }, (_, i) => (
          <span key={`e${i}`} className="cal-d empty-cell" />
        ))}
        {stats.map((d) => (
          <span
            key={d.day}
            className={`cal-d ${level(d.count)} ${d.day === today ? 'today' : ''}`}
            title={`${formatShort(d.day)}: ${d.count}`}
            aria-label={`${formatShort(d.day)}: ${d.count} ${plural(d.count, 'задание', 'задания', 'заданий')}`}
          >
            {parts(d.day)[2]}
          </span>
        ))}
      </div>
      <div className="row hint" style={{ gap: 6, justifyContent: 'flex-end' }}>
        меньше
        {['', 'l1', 'l2', 'l3', 'l4'].map((l) => (
          <span key={l} className={`cal-d ${l}`} style={{ width: 16, height: 16, borderRadius: 5, aspectRatio: 'auto', boxShadow: l ? undefined : 'inset 0 0 0 1px var(--line)' }} />
        ))}
        больше
      </div>
    </div>
  );
}

export function Stats() {
  const s = useApp();
  const { today } = useFlow();
  const [period, setPeriod] = useState<Period>('week');
  const [anchor, setAnchor] = useState(today);
  const [mode, setMode] = useState<'count' | 'money'>('count');
  const { from, to } = periodBounds(period, anchor, s, today);

  const days = dayStats(s, from, to);
  const count = days.reduce((a, d) => a + d.count, 0);
  const earned = days.reduce((a, d) => a + d.earned, 0);
  const fined = days.reduce((a, d) => a + d.penalties, 0);
  const cats = categoryStats(s, from, to);
  const best = bestCurrentStreak(s, today);

  const bars =
    period === 'all'
      ? monthStats(s, 12, today)
          .filter((x, i, arr) => x.count > 0 || x.earned > 0 || i >= arr.length - 6)
          .map((x) => ({ label: monthNameShort(x.month), count: x.count, earned: x.earned, title: formatMonth(x.month) }))
      : days.map((d, i) => ({
          label: period === 'week' ? WEEKDAY_SHORT[i] : parts(d.day)[2] % 5 === 0 || parts(d.day)[2] === 1 ? String(parts(d.day)[2]) : '',
          count: d.count,
          earned: d.earned,
          title: formatShort(d.day),
        }));

  const shift = (dir: number) => setAnchor(period === 'week' ? addDays(anchor, dir * 7) : addMonths(anchor, dir));
  const periodTitle =
    period === 'week' ? `${formatShort(from)} — ${formatShort(to)}` : period === 'month' ? formatMonth(from) : `с ${formatShort(from)}`;
  const canNext = to < today;

  return (
    <div className="screen">
      <BgSparkles />
      <div className="head">
        <h1 className="h1">Статистика</h1>
      </div>

      <div className="seg" role="group" aria-label="Период">
        {(
          [
            ['week', 'Неделя'],
            ['month', 'Месяц'],
            ['all', 'Всё время'],
          ] as [Period, string][]
        ).map(([k, l]) => (
          <button
            key={k}
            aria-pressed={period === k}
            onClick={() => {
              setPeriod(k);
              setAnchor(today);
            }}
          >
            {l}
          </button>
        ))}
      </div>

      <div className="row between">
        {period !== 'all' ? (
          <button className="icon-btn flat" aria-label="Раньше" onClick={() => shift(-1)}>
            <IconChevronLeft size={18} />
          </button>
        ) : (
          <span />
        )}
        <span style={{ fontWeight: 800 }}>{periodTitle}</span>
        {period !== 'all' ? (
          <button className="icon-btn flat" aria-label="Позже" disabled={!canNext} onClick={() => shift(1)}>
            <IconChevronRight size={18} />
          </button>
        ) : (
          <span />
        )}
      </div>

      <div className="tiles">
        <div className="tile">
          <span className="tile-label">Выполнено</span>
          <span className="tile-value">{count}</span>
          <span className="tile-sub">{plural(count, 'задание', 'задания', 'заданий')}</span>
        </div>
        <div className="tile">
          <span className="tile-label">Заработано</span>
          <span className="tile-value" style={{ color: 'var(--price)' }}>{rub(earned)}</span>
          <span className="tile-sub">на цели и в кошелёк</span>
        </div>
        <div className="tile">
          <span className="tile-label">Штрафы</span>
          <span className="tile-value" style={{ color: fined ? 'var(--danger)' : undefined }}>{fined ? `−${rub(fined)}` : '0 ₽'}</span>
          <span className="tile-sub">{fined ? 'за пропуски' : 'ни одного пропуска ✨'}</span>
        </div>
        <div className="tile">
          <span className="tile-label">Лучшая серия сейчас</span>
          <span className="tile-value row" style={{ gap: 6 }}>
            <Flame size={20} /> {best?.streak ?? 0}
          </span>
          <span className="tile-sub" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {best ? best.title : 'пока нет'}
          </span>
        </div>
      </div>

      <div className="card pad stack">
        <div className="row between">
          <span style={{ fontWeight: 800 }}>{period === 'all' ? 'По месяцам' : 'По дням'}</span>
          <div className="seg" role="group" aria-label="Показывать" style={{ padding: 3 }}>
            <button aria-pressed={mode === 'count'} style={{ minHeight: 34, padding: '0 10px' }} onClick={() => setMode('count')}>
              Задания
            </button>
            <button aria-pressed={mode === 'money'} style={{ minHeight: 34, padding: '0 10px' }} onClick={() => setMode('money')}>
              Деньги
            </button>
          </div>
        </div>
        <Bars items={bars} mode={mode} />
      </div>

      <div className="card pad stack" style={{ gap: 14 }}>
        <span style={{ fontWeight: 800 }}>По категориям</span>
        {cats.length === 0 && <span className="hint">За этот период пока ничего не выполнено.</span>}
        {cats.map((c) => {
          const cat = findCategory(s.categories, c.categoryId);
          const col = COLORS[cat.color];
          return (
            <div key={c.categoryId ?? 'none'} className="cat-row">
              <div className="row between">
                <span style={{ fontWeight: 700 }}>
                  <span aria-hidden="true">{cat.emoji}</span> {cat.name}
                </span>
                <span className="hint" style={{ fontWeight: 800 }}>
                  {c.count} · {rub(c.earned)}
                </span>
              </div>
              <div className="cat-bar">
                <div style={{ width: `${(c.count / cats[0].count) * 100}%`, background: col.dot }} />
              </div>
            </div>
          );
        })}
      </div>

      <ActivityCalendar today={today} />
    </div>
  );
}
