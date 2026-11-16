import { useEffect, useState } from 'react';
import { isDone, reschedule } from '../logic/actions';
import { addDays, formatLong } from '../logic/date';
import { pick, SUMMARY_GOOD, SUMMARY_SOFT } from '../logic/phrases';
import { completionsOn, tasksForDay } from '../logic/selectors';
import { plural } from '../logic/schedule';
import type { Category, Task } from '../logic/types';
import { commit, getState, useApp } from '../store';
import { BgSparkles, CategoryPill, HeroSparkles, NO_CATEGORY, Ring, rub } from '../ui/bits';
import { useFlow } from '../ui/flows';
import { IconGear, IconMoon, IconPlus, IconShare, Sparkle } from '../ui/icons';
import { TaskCard } from '../ui/TaskCard';

const tasksWord = (n: number) => plural(n, 'задание', 'задания', 'заданий');

function useHour() {
  const [h, setH] = useState(new Date().getHours());
  useEffect(() => {
    const t = window.setInterval(() => setH(new Date().getHours()), 60_000);
    return () => window.clearInterval(t);
  }, []);
  return h;
}

function isIosBrowser() {
  const ios = /iPhone|iPad|iPod/.test(navigator.userAgent);
  const standalone = (navigator as unknown as { standalone?: boolean }).standalone || window.matchMedia('(display-mode: standalone)').matches;
  return ios && !standalone;
}

function InstallTip() {
  const [show, setShow] = useState(() => {
    try {
      return isIosBrowser() && localStorage.getItem('install-tip') !== 'hidden';
    } catch {
      return false;
    }
  });
  if (!show) return null;
  return (
    <div className="notice">
      <div className="install-tip">
        <span className="praise-star" style={{ width: 44, height: 44, borderRadius: 14 }}>
          <IconShare size={22} />
        </span>
        <div className="stack" style={{ gap: 4 }}>
          <span className="notice-title">Установи на экран «Домой»</span>
          <span className="notice-text">
            Нажми «Поделиться» внизу Safari, затем «На экран „Домой“». Трекер откроется как обычное приложение.
          </span>
        </div>
      </div>
      <button
        className="btn small soft"
        onClick={() => {
          try {
            localStorage.setItem('install-tip', 'hidden');
          } catch {
            /* ignore */
          }
          setShow(false);
        }}
      >
        Понятно
      </button>
    </div>
  );
}

function YesterdaySummary({ today }: { today: string }) {
  const s = useApp();
  const y = addDays(today, -1);
  if (s.summarySeenOn === today) return null;
  const cs = completionsOn(s, y);
  const ps = s.penalties.filter((p) => p.day === y);
  if (cs.length === 0 && ps.length === 0) return null;
  const earned = cs.reduce((a, c) => a + c.amount, 0);
  const fined = ps.reduce((a, p) => a + p.amount, 0);
  const good = cs.length > 0 && ps.length === 0;
  return (
    <div className="notice">
      <Sparkle size={18} color="#C9BBFF" style={{ position: 'absolute', top: 14, right: 16 }} />
      <Sparkle size={10} color="#A9D3FF" style={{ position: 'absolute', top: 36, right: 40 }} />
      <span className="notice-title">Итог вчерашнего дня</span>
      <span className="notice-text" style={{ color: 'var(--ink)' }}>
        {cs.length > 0 ? (
          <>
            Сделано {cs.length} {tasksWord(cs.length)}, заработано <b className="nowrap">+{rub(earned)}</b>.
          </>
        ) : (
          'Вчера ничего не отмечено.'
        )}
        {ps.length > 0 && (
          <>
            {' '}
            Пропущено: {ps.map((p) => p.title).slice(0, 3).join(', ')}
            {ps.length > 3 ? ` и ещё ${ps.length - 3}` : ''} — штраф <b className="nowrap danger-text">−{rub(fined)}</b>.
          </>
        )}
      </span>
      <span className="notice-text">{pick(good ? SUMMARY_GOOD : SUMMARY_SOFT)}</span>
      <button className="btn small soft" onClick={() => commit({ ...getState(), summarySeenOn: today })}>
        Спасибо!
      </button>
    </div>
  );
}

export function Today({ onSettings }: { onSettings: () => void }) {
  const s = useApp();
  const { today, openEdit } = useFlow();
  const hour = useHour();
  const list = tasksForDay(s, today);
  const done = list.filter((t) => isDone(s, t, today));
  const earned = completionsOn(s, today).reduce((a, c) => a + c.amount, 0);
  const left = list.length - done.length;

  const moved = list.filter((t) => t.kind === 'once' && t.missedCount > 0 && !isDone(s, t, today));
  const rest = list.filter((t) => !moved.includes(t));
  const groups: { cat: Category; tasks: Task[] }[] = [];
  for (const c of [...s.categories, NO_CATEGORY]) {
    const ts = rest.filter((t) => (c.id ? t.categoryId === c.id : !s.categories.some((x) => x.id === t.categoryId)));
    if (ts.length) groups.push({ cat: c, tasks: ts });
  }
  const someday = s.tasks.filter((t) => t.kind === 'once' && t.date === null && !s.completions.some((c) => c.taskId === t.id));
  const eveningOnce = hour >= 20 ? list.filter((t) => t.kind === 'once' && !isDone(s, t, today)) : [];

  return (
    <div className="screen">
      <BgSparkles />
      <div className="head">
        <div className="head-text">
          <span className="head-date">{formatLong(today)}</span>
          <h1 className="h1">Сегодня</h1>
        </div>
        <div className="head-actions">
          <button className="icon-btn" aria-label="Настройки" onClick={onSettings}>
            <IconGear size={22} />
          </button>
          <button className="btn-add" aria-label="Новое задание" onClick={() => openEdit(null)}>
            <IconPlus size={24} />
          </button>
        </div>
      </div>

      <InstallTip />
      <YesterdaySummary today={today} />

      <div className="hero">
        <HeroSparkles />
        <Ring done={done.length} total={list.length} />
        <div className="hero-text">
          <span className="hero-label">{earned > 0 ? 'Уже заработано' : 'Заработано сегодня'}</span>
          <span className="hero-big">+{rub(earned)}</span>
          <span className="hero-small">
            {list.length === 0
              ? 'на сегодня заданий нет'
              : left === 0
                ? 'всё сделано! ✨'
                : `осталось ${left} ${tasksWord(left)}`}
          </span>
          {s.wallet < 0 && <span className="hero-debt">Долг {rub(-s.wallet)}</span>}
        </div>
      </div>

      {eveningOnce.length > 0 && (
        <div className="notice">
          <div className="row" style={{ gap: 10 }}>
            <IconMoon size={22} style={{ color: 'var(--v)' }} />
            <span className="notice-title">Не успеваешь?</span>
          </div>
          <span className="notice-text">
            Разовые задания можно перенести до полуночи — тогда штрафа не будет.
          </span>
          <button
            className="btn small soft"
            onClick={() => {
              let st = getState();
              for (const t of eveningOnce) st = reschedule(st, t.id, addDays(today, 1));
              commit(st);
            }}
          >
            Перенести на завтра ({eveningOnce.length})
          </button>
        </div>
      )}

      {moved.length > 0 && (
        <div className="group">
          <span className="badge warn" style={{ fontSize: 14, padding: '6px 12px' }}>Со вчера</span>
          {moved.map((t) => (
            <TaskCard key={t.id} s={s} task={t} />
          ))}
        </div>
      )}

      {groups.map(({ cat, tasks }) => (
        <div className="group" key={cat.id || 'none'}>
          <CategoryPill category={cat} suffix={`${tasks.filter((t) => isDone(s, t, today)).length} из ${tasks.length}`} />
          {tasks.map((t) => (
            <TaskCard key={t.id} s={s} task={t} />
          ))}
        </div>
      ))}

      {list.length === 0 && s.tasks.length === 0 && (
        <div className="empty">
          <Sparkle size={34} color="#B9A8FF" />
          <span className="empty-title">Начнём?</span>
          <span className="hint">Добавь первое задание и назначь за него награду. Деньги пойдут на твои цели.</span>
          <button className="btn" onClick={() => openEdit(null)}>
            <IconPlus size={20} /> Добавить задание
          </button>
        </div>
      )}

      {someday.length > 0 && (
        <div className="group">
          <CategoryPill category={{ id: 'someday', name: 'Когда-нибудь', emoji: '🌙', color: 'gray' }} />
          {someday.map((t) => (
            <TaskCard key={t.id} s={s} task={t} />
          ))}
        </div>
      )}
    </div>
  );
}

