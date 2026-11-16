import type { ReactNode } from 'react';
import { isDone, previewReward, tapsOf } from '../logic/actions';
import { formatRelative, weekStart } from '../logic/date';
import { completionFor } from '../logic/selectors';
import { buildIndex, currentStreak, penaltyFor, scheduleText, streakText, weekDoneCount } from '../logic/schedule';
import type { AppState, Task } from '../logic/types';
import { rub } from './bits';
import { useFlow } from './flows';
import { Flame, IconCheck, IconPlus, Sparkle } from './icons';

export function TaskCard({ s, task, showDate }: { s: AppState; task: Task; showDate?: boolean }) {
  const { today, toggle, openDetail } = useFlow();
  const done = isDone(s, task, today);
  const comp = completionFor(s, task, today);
  const preview = previewReward(s, task, today);
  const amount = comp ? comp.amount : preview.amount;
  const pct = comp ? comp.bonusPct : preview.pct;
  const multi = task.timesPerDay > 1;
  const taps = done ? task.timesPerDay : tapsOf(s, task.id, today);

  // Первая строка — расписание и прогресс, вторая — серия или штраф.
  const line1: string[] = [];
  let line2: ReactNode = null;
  if (task.kind === 'recurring') {
    const idx = buildIndex(s.completions);
    if (task.schedule?.type === 'perWeek') {
      line1.push(`${weekDoneCount(idx, task, weekStart(today))} из ${task.schedule.count} на этой неделе`);
    } else {
      line1.push(scheduleText(task));
    }
    const streak = currentStreak(task, today, idx);
    if (streak >= 2)
      line2 = (
        <span className="meta">
          <Flame /> {streakText(task, streak)}
        </span>
      );
  } else {
    if (showDate) line1.push(task.date ? formatRelative(task.date, today) : 'Без даты');
    if (task.missedCount > 0 && !done)
      line2 = (
        <span className="meta">
          <b style={{ color: 'var(--danger)' }}>штраф −{rub(penaltyFor(task))}, перенесено</b>
        </span>
      );
  }
  if (multi) line1.push(`${taps} из ${task.timesPerDay}`);

  const label = done
    ? `${task.title} — выполнено, отменить`
    : multi
      ? `${task.title} — отметить ещё раз (${taps} из ${task.timesPerDay})`
      : `${task.title} — отметить выполненным`;

  return (
    <div className={`task ${done ? 'done' : ''}`}>
      <button className="task-body" onClick={() => openDetail(task.id)}>
        <span className="task-title">{task.title}</span>
        {line1.length > 0 && <span className="meta">{line1.join(' · ')}</span>}
        {line2}
        {multi && (
          <span className="taps" aria-hidden="true">
            {Array.from({ length: task.timesPerDay }, (_, i) => (
              <Sparkle key={i} size={task.timesPerDay > 10 ? 12 : 16} color={i < taps ? '#3E8FDB' : '#CFE0F5'} />
            ))}
          </span>
        )}
      </button>
      <div className="price-col">
        <span className="price">{rub(amount)}</span>
        {pct > 0 && <span className="price-bonus">+{pct}% серия</span>}
      </div>
      <button
        className={`check ${done ? 'done' : multi ? 'plus' : ''}`}
        aria-label={label}
        onClick={() => toggle(task)}
      >
        {done ? <IconCheck size={20} /> : multi ? <IconPlus size={20} /> : null}
      </button>
    </div>
  );
}
