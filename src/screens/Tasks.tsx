import { useState } from 'react';
import { previewReward } from '../logic/actions';
import { addDays, formatRelative, formatShort, WEEKDAY_SHORT, weekStart } from '../logic/date';
import { buildIndex, currentStreak, scheduleText, streakText } from '../logic/schedule';
import type { AppState, Task } from '../logic/types';
import { useApp } from '../store';
import { BgSparkles, COLORS, findCategory, rub } from '../ui/bits';
import { useFlow } from '../ui/flows';
import { Flame, IconCheck, IconPlus, Sparkle } from '../ui/icons';
import { TaskCard } from '../ui/TaskCard';
import { dayStatus } from '../ui/TaskDetail';

function RecurringCard({ s, task }: { s: AppState; task: Task }) {
  const { today, openDetail } = useFlow();
  const idx = buildIndex(s.completions);
  const cat = findCategory(s.categories, task.categoryId);
  const streak = currentStreak(task, today, idx);
  const { amount, pct } = previewReward(s, task, today);
  const ws = weekStart(today);
  return (
    <button className="task" style={{ flexDirection: 'column', alignItems: 'stretch', border: 'none', textAlign: 'left' }} onClick={() => openDetail(task.id)}>
      <div className="row between" style={{ alignItems: 'flex-start' }}>
        <div className="stack" style={{ gap: 3, minWidth: 0 }}>
          <span className="task-title">
            <span aria-hidden="true">{cat.emoji}</span> {task.title}
          </span>
          <span className="meta">
            {scheduleText(task)}
            {task.timesPerDay > 1 && ` · ${task.timesPerDay} раз в день`}
            {streak >= 2 && (
              <>
                {' · '}
                <Flame /> {streakText(task, streak)}
              </>
            )}
          </span>
        </div>
        <div className="price-col">
          <span className="price">{rub(amount)}</span>
          {pct > 0 && <span className="price-bonus">+{pct}% серия</span>}
        </div>
      </div>
      <div className="week-row" aria-label="Эта неделя">
        {WEEKDAY_SHORT.map((label, i) => {
          const d = addDays(ws, i);
          const st = dayStatus(s, task, d, today, idx);
          return (
            <span key={d} className="week-cell">
              <span className={`dot ${st} ${d === today ? 'today' : ''}`} style={st === 'off' && d >= task.startDate ? { background: 'transparent' } : undefined}>
                {st === 'done' && <IconCheck size={14} />}
              </span>
              {label}
            </span>
          );
        })}
      </div>
    </button>
  );
}

export function Tasks() {
  const s = useApp();
  const { today, openEdit } = useFlow();
  const [tab, setTab] = useState<'recurring' | 'once'>('recurring');
  const recurring = s.tasks.filter((t) => t.kind === 'recurring');
  const doneIds = new Set(s.completions.map((c) => c.taskId));
  const onceOpen = s.tasks.filter((t) => t.kind === 'once' && !doneIds.has(t.id));
  const onceDone = s.tasks
    .filter((t) => t.kind === 'once' && doneIds.has(t.id))
    .map((t) => ({ t, c: s.completions.find((c) => c.taskId === t.id)! }))
    .sort((a, b) => (a.c.at < b.c.at ? 1 : -1))
    .slice(0, 15);

  const dated = onceOpen.filter((t) => t.date).sort((a, b) => (a.date! < b.date! ? -1 : 1));
  const byDate = new Map<string, Task[]>();
  for (const t of dated) byDate.set(t.date!, [...(byDate.get(t.date!) ?? []), t]);
  const undated = onceOpen.filter((t) => !t.date);

  // Регулярные — по категориям, в порядке категорий
  const order = new Map(s.categories.map((c, i) => [c.id, i]));
  const recSorted = [...recurring].sort((a, b) => (order.get(a.categoryId ?? '') ?? 99) - (order.get(b.categoryId ?? '') ?? 99));

  return (
    <div className="screen">
      <BgSparkles />
      <div className="head">
        <h1 className="h1">Задания</h1>
        <button
          className="btn-add"
          aria-label="Новое задание"
          onClick={() => openEdit(null, tab === 'recurring' ? { kind: 'recurring', schedule: { type: 'daily' } } : { kind: 'once' })}
        >
          <IconPlus size={24} />
        </button>
      </div>

      <div className="seg" role="group" aria-label="Тип заданий">
        <button aria-pressed={tab === 'recurring'} onClick={() => setTab('recurring')}>
          Регулярные · {recurring.length}
        </button>
        <button aria-pressed={tab === 'once'} onClick={() => setTab('once')}>
          Разовые · {onceOpen.length}
        </button>
      </div>

      {tab === 'recurring' ? (
        recSorted.length === 0 ? (
          <div className="empty">
            <Sparkle size={30} color="#B9A8FF" />
            <span className="empty-title">Пока пусто</span>
            <span className="hint">Регулярные задания — это привычки: каждый день, по дням недели, несколько раз в неделю…</span>
            <button className="btn small" onClick={() => openEdit(null, { kind: 'recurring', schedule: { type: 'daily' } })}>
              <IconPlus size={18} /> Добавить
            </button>
          </div>
        ) : (
          <div className="group">
            {recSorted.map((t) => (
              <RecurringCard key={t.id} s={s} task={t} />
            ))}
          </div>
        )
      ) : (
        <>
          {[...byDate.entries()].map(([d, ts]) => (
            <div className="group" key={d}>
              <span className="badge violet" style={{ fontSize: 14, padding: '6px 12px', ...(d < today ? { color: 'var(--danger)', background: 'var(--danger-tint)' } : {}) }}>
                {formatRelative(d, today)}
              </span>
              {ts.map((t) => (
                <TaskCard key={t.id} s={s} task={t} />
              ))}
            </div>
          ))}
          {undated.length > 0 && (
            <div className="group">
              <span className="badge violet" style={{ fontSize: 14, padding: '6px 12px', background: COLORS.gray.tint, color: COLORS.gray.ink }}>
                Без даты
              </span>
              {undated.map((t) => (
                <TaskCard key={t.id} s={s} task={t} />
              ))}
            </div>
          )}
          {onceOpen.length === 0 && (
            <div className="empty">
              <Sparkle size={30} color="#B9A8FF" />
              <span className="empty-title">Нет разовых заданий</span>
              <span className="hint">Можно запланировать что-то на конкретный день — например, на пятницу следующей недели.</span>
              <button className="btn small" onClick={() => openEdit(null, { kind: 'once' })}>
                <IconPlus size={18} /> Добавить
              </button>
            </div>
          )}
          {onceDone.length > 0 && (
            <div className="group">
              <span className="badge violet" style={{ fontSize: 14, padding: '6px 12px' }}>
                Выполнено
              </span>
              {onceDone.map(({ t, c }) => (
                <div key={t.id} className="task done">
                  <div className="task-body">
                    <span className="task-title">{t.title}</span>
                    <span className="meta">{formatShort(c.day)}</span>
                  </div>
                  <span className="price">+{rub(c.amount)}</span>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
