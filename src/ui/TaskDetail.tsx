import { useState } from 'react';
import { deleteTask, isDone, previewReward, tapsOf } from '../logic/actions';
import { addMonths, daysInMonth, formatMonth, formatRelative, formatShort, monthStart, parts, toKey, WEEKDAY_SHORT, weekday } from '../logic/date';
import { completionFor, tasksForDay } from '../logic/selectors';
import {
  buildIndex,
  currentStreak,
  doneKey,
  isDayBased,
  isScheduledOn,
  nextTier,
  bonusPct,
  penaltyFor,
  plural,
  scheduleText,
  streakText,
} from '../logic/schedule';
import type { AppState, DayKey, ID, Task } from '../logic/types';
import { commit, getState, useApp } from '../store';
import { CategoryPill, Confirm, findCategory, rub, Sheet } from './bits';
import { useFlow } from './flows';
import { Flame, IconCalendar, IconChevronLeft, IconChevronRight, IconEdit, IconMinus, IconPlus, IconTrash, IconUndo, Sparkle } from './icons';

export type DayStatus = 'done' | 'miss' | 'todo' | 'off';

export function dayStatus(s: AppState, task: Task, day: DayKey, today: DayKey, idx = buildIndex(s.completions)): DayStatus {
  if (idx.has(doneKey(task.id, day))) return 'done';
  if (day < task.startDate) return 'off';
  if (isDayBased(task)) {
    if (!isScheduledOn(task, day)) return 'off';
    if (day < today) return s.penalties.some((p) => p.taskId === task.id && p.day === day) ? 'miss' : 'off';
    return 'todo';
  }
  return 'off';
}

function Tracker({ s, task, today }: { s: AppState; task: Task; today: DayKey }) {
  const [month, setMonth] = useState(monthStart(today));
  const [y, m] = parts(month);
  const total = daysInMonth(y, m);
  const lead = weekday(month) - 1;
  const idx = buildIndex(s.completions);
  const cells: (DayKey | null)[] = [...Array(lead).fill(null), ...Array.from({ length: total }, (_, i) => toKey(y, m, i + 1))];
  const doneCount = cells.filter((d) => d && idx.has(doneKey(task.id, d))).length;
  return (
    <div className="card pad stack">
      <div className="row between">
        <button className="icon-btn flat" aria-label="Предыдущий месяц" onClick={() => setMonth(addMonths(month, -1))}>
          <IconChevronLeft size={18} />
        </button>
        <div className="stack" style={{ alignItems: 'center', gap: 0 }}>
          <span style={{ fontWeight: 800 }}>{formatMonth(month)}</span>
          <span className="hint">
            выполнено {doneCount} {plural(doneCount, 'раз', 'раза', 'раз')}
          </span>
        </div>
        <button className="icon-btn flat" aria-label="Следующий месяц" onClick={() => setMonth(addMonths(month, 1))}>
          <IconChevronRight size={18} />
        </button>
      </div>
      <div className="cal">
        {WEEKDAY_SHORT.map((d) => (
          <span key={d} className="cal-h">
            {d}
          </span>
        ))}
        {cells.map((d, i) =>
          d ? (
            <span key={d} className={`cal-d ${dayStatus(s, task, d, today, idx)} ${d === today ? 'today' : ''}`}>
              {parts(d)[2]}
            </span>
          ) : (
            <span key={`e${i}`} className="cal-d empty-cell" />
          ),
        )}
      </div>
      <div className="row wrap hint" style={{ gap: 12 }}>
        <span className="row" style={{ gap: 4 }}>
          <span className="dot done" style={{ width: 14, height: 14 }} /> сделано
        </span>
        <span className="row" style={{ gap: 4 }}>
          <span className="dot miss" style={{ width: 14, height: 14 }} /> пропуск
        </span>
        {isDayBased(task) && (
          <span className="row" style={{ gap: 4 }}>
            <span className="dot todo" style={{ width: 14, height: 14 }} /> по плану
          </span>
        )}
      </div>
    </div>
  );
}

export function TaskDetail({ id, onClose }: { id: ID; onClose: () => void }) {
  const s = useApp();
  const { today, tap, untap, askUndo, openEdit, openReschedule, toggle } = useFlow();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const task = s.tasks.find((t) => t.id === id);
  if (!task) return null;
  const done = isDone(s, task, today);
  const comp = completionFor(s, task, today);
  const preview = previewReward(s, task, today);
  const cat = findCategory(s.categories, task.categoryId);
  const idx = buildIndex(s.completions);
  const streak = task.kind === 'recurring' ? currentStreak(task, today, idx) : 0;
  const curPct = bonusPct(streak);
  const next = nextTier(streak);
  const onToday = tasksForDay(s, today).some((t) => t.id === task.id);
  const taps = done ? task.timesPerDay : tapsOf(s, task.id, today);
  const left = next ? next.at - streak : 0;
  const unit =
    task.schedule?.type === 'perWeek'
      ? plural(left, 'неделя', 'недели', 'недель')
      : task.schedule?.type === 'daily'
        ? plural(left, 'день', 'дня', 'дней')
        : plural(left, 'раз', 'раза', 'раз');

  return (
    <Sheet title={task.title} onClose={onClose}>
      <div className="row wrap">
        <CategoryPill category={cat} />
        <span className="badge violet">{scheduleText(task)}</span>
      </div>

      <div className="tiles">
        <div className="tile">
          <span className="tile-label">Награда</span>
          <span className="tile-value" style={{ color: 'var(--price)' }}>{rub(comp ? comp.amount : preview.amount)}</span>
          <span className="tile-sub">{(comp?.bonusPct ?? preview.pct) > 0 ? `с бонусом +${comp?.bonusPct ?? preview.pct}%` : `пропуск: −${rub(penaltyFor(task))}`}</span>
        </div>
        {task.kind === 'recurring' ? (
          <div className="tile">
            <span className="tile-label">Серия</span>
            <span className="tile-value row" style={{ gap: 6 }}>
              <Flame size={20} /> {streak}
            </span>
            <span className="tile-sub">
              {curPct > 0 ? `бонус +${curPct}%` : 'пока без бонуса'}
              {next ? ` · ещё ${left} ${unit} до +${next.pct}%` : ''}
            </span>
          </div>
        ) : (
          <div className="tile">
            <span className="tile-label">Когда</span>
            <span className="tile-value" style={{ fontSize: 18 }}>
              {comp ? formatShort(comp.day) : task.date ? formatRelative(task.date, today) : 'Без даты'}
            </span>
            <span className="tile-sub">
              {comp ? 'выполнено' : task.missedCount > 0 ? `переносилось со штрафом: ${task.missedCount}` : 'по плану'}
            </span>
          </div>
        )}
      </div>

      {task.kind === 'recurring' && streak >= 2 && (
        <div className="notice" style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Sparkle size={22} color="#B9A8FF" />
          <span className="notice-text" style={{ color: 'var(--ink)' }}>
            {streakText(task, streak)}! Не прерывай серию — бонус растёт.
          </span>
        </div>
      )}

      {task.timesPerDay > 1 && onToday && (
        <div className="card pad stack">
          <div className="row between">
            <span style={{ fontWeight: 800 }}>Сегодня отмечено</span>
            <span className="price">
              {taps} из {task.timesPerDay}
            </span>
          </div>
          <div className="taps" aria-hidden="true">
            {Array.from({ length: task.timesPerDay }, (_, i) => (
              <Sparkle key={i} size={22} color={i < taps ? '#3E8FDB' : '#CFE0F5'} />
            ))}
          </div>
          {!done && (
            <div className="row">
              <button className="btn soft small" style={{ flex: 1 }} disabled={taps === 0} onClick={() => untap(task)}>
                <IconMinus size={18} /> Убрать
              </button>
              <button className="btn small" style={{ flex: 1 }} onClick={() => tap(task)}>
                <IconPlus size={18} /> Ещё раз
              </button>
            </div>
          )}
        </div>
      )}

      {task.kind === 'recurring' && <Tracker s={s} task={task} today={today} />}

      <div className="stack">
        {!done && task.timesPerDay === 1 && (onToday || task.kind === 'once') && (
          <button className="btn block" onClick={() => { onClose(); toggle(task); }}>
            Сделано!
          </button>
        )}
        {done && comp && comp.day === today && (
          <button className="btn block soft" onClick={() => askUndo(task)}>
            <IconUndo size={18} /> Отменить выполнение
          </button>
        )}
        {task.kind === 'once' && !done && (
          <button className="btn block soft" onClick={() => openReschedule(task)}>
            <IconCalendar size={18} /> Перенести
          </button>
        )}
        <div className="row">
          <button className="btn soft small" style={{ flex: 1 }} onClick={() => { onClose(); openEdit(task); }}>
            <IconEdit size={18} /> Изменить
          </button>
          <button className="btn danger small" style={{ flex: 1 }} onClick={() => setConfirmDelete(true)}>
            <IconTrash size={18} /> Удалить
          </button>
        </div>
      </div>

      {confirmDelete && (
        <Confirm
          title="Удалить задание?"
          text="Выполненные раньше дни останутся в статистике, заработанные деньги никуда не денутся."
          yes="Удалить"
          danger
          onYes={() => {
            commit(deleteTask(getState(), task.id));
            onClose();
          }}
          onClose={() => setConfirmDelete(false)}
        />
      )}
    </Sheet>
  );
}

