import { addDays, diffDays, daysInMonth, parts, weekday, weekStart, WEEKDAY_SHORT } from './date';
import type { Completion, DayKey, ID, Task } from './types';

export type DoneIndex = Map<string, Completion>;

export const doneKey = (taskId: ID, day: DayKey) => `${taskId}|${day}`;

export function buildIndex(completions: Completion[]): DoneIndex {
  const idx: DoneIndex = new Map();
  for (const c of completions) idx.set(doneKey(c.taskId, c.day), c);
  return idx;
}

export const isPerWeek = (t: Task) => t.kind === 'recurring' && t.schedule?.type === 'perWeek';
export const isDayBased = (t: Task) => t.kind === 'recurring' && !isPerWeek(t);

/** Назначено ли задание на этот день (для «N раз в неделю» — всегда false, у них нет конкретных дней). */
export function isScheduledOn(task: Task, day: DayKey): boolean {
  if (task.kind === 'once') return task.date === day;
  if (day < task.startDate || !task.schedule) return false;
  const s = task.schedule;
  switch (s.type) {
    case 'daily':
      return true;
    case 'weekdays':
      return s.days.includes(weekday(day));
    case 'everyNDays':
      return diffDays(task.startDate, day) % Math.max(1, s.n) === 0;
    case 'monthly': {
      const [y, m, d] = parts(day);
      return d === Math.min(s.day, daysInMonth(y, m));
    }
    case 'perWeek':
      return false;
  }
}

/** Сколько дней на неделе (начинающейся с ws) задание выполнено; before — учитывать только дни раньше этого. */
export function weekDoneCount(idx: DoneIndex, task: Task, ws: DayKey, before?: DayKey): number {
  let n = 0;
  for (let i = 0; i < 7; i++) {
    const d = addDays(ws, i);
    if (before && d >= before) break;
    if (idx.has(doneKey(task.id, d))) n++;
  }
  return n;
}

const MAX_LOOKBACK = 3700; // ~10 лет

/**
 * Длина серии до указанного дня (не включая его).
 * Для обычных регулярных — сколько назначенных дней подряд выполнено,
 * для «N раз в неделю» — сколько недель подряд норма выполнена (до недели этого дня).
 */
export function streakBefore(task: Task, day: DayKey, idx: DoneIndex): number {
  if (task.kind !== 'recurring' || !task.schedule) return 0;
  if (task.schedule.type === 'perWeek') {
    const count = task.schedule.count;
    const first = weekStart(task.startDate);
    let w = addDays(weekStart(day), -7);
    let s = 0;
    while (w >= first && s < MAX_LOOKBACK) {
      if (weekDoneCount(idx, task, w) >= count) s++;
      else break;
      w = addDays(w, -7);
    }
    return s;
  }
  let s = 0;
  let d = addDays(day, -1);
  for (let guard = 0; d >= task.startDate && guard < MAX_LOOKBACK; guard++) {
    if (isScheduledOn(task, d)) {
      if (idx.has(doneKey(task.id, d))) s++;
      else break;
    }
    d = addDays(d, -1);
  }
  return s;
}

/** Текущая серия на сегодня: незавершённый сегодняшний день серию не обрывает. */
export function currentStreak(task: Task, today: DayKey, idx: DoneIndex): number {
  if (task.kind !== 'recurring' || !task.schedule) return 0;
  const before = streakBefore(task, today, idx);
  if (task.schedule.type === 'perWeek') {
    const met = weekDoneCount(idx, task, weekStart(today)) >= task.schedule.count;
    return before + (met ? 1 : 0);
  }
  return before + (idx.has(doneKey(task.id, today)) ? 1 : 0);
}

/** Серия, которая получится, если выполнить задание в этот день. */
export function streakIfDone(task: Task, day: DayKey, idx: DoneIndex): number {
  if (task.kind !== 'recurring') return 0;
  return streakBefore(task, day, idx) + 1;
}

export const BONUS_TIERS: { at: number; pct: number }[] = [
  { at: 4, pct: 5 },
  { at: 7, pct: 10 },
  { at: 14, pct: 15 },
  { at: 21, pct: 20 },
];

export function bonusPct(streak: number): number {
  let pct = 0;
  for (const t of BONUS_TIERS) if (streak >= t.at) pct = t.pct;
  return pct;
}

export function nextTier(streak: number): { at: number; pct: number } | null {
  return BONUS_TIERS.find((t) => t.at > streak) ?? null;
}

export function withBonus(base: number, pct: number): number {
  return base + Math.round((base * pct) / 100);
}

export function penaltyFor(task: Task): number {
  return Math.round(task.reward / 2);
}

/** taskId → выполнение (для разовых заданий, у них оно одно). */
export function buildOnceIndex(completions: Completion[]): Map<ID, Completion> {
  const m = new Map<ID, Completion>();
  for (const c of completions) m.set(c.taskId, c);
  return m;
}

/** Показывать ли задание в списке «Сегодня». */
export function showOnDay(task: Task, day: DayKey, idx: DoneIndex, onceIdx: Map<ID, Completion>): boolean {
  if (task.kind === 'once') {
    const c = onceIdx.get(task.id);
    if (c) return c.day === day;
    return task.date === day;
  }
  if (day < task.startDate || !task.schedule) return false;
  if (task.schedule.type === 'perWeek') {
    if (idx.has(doneKey(task.id, day))) return true;
    return weekDoneCount(idx, task, weekStart(day), day) < task.schedule.count;
  }
  return isScheduledOn(task, day);
}

const plural = (n: number, one: string, few: string, many: string) => {
  const n10 = n % 10;
  const n100 = n % 100;
  if (n10 === 1 && n100 !== 11) return one;
  if (n10 >= 2 && n10 <= 4 && (n100 < 12 || n100 > 14)) return few;
  return many;
};
export { plural };

export function timesWord(n: number): string {
  return `${n} ${plural(n, 'раз', 'раза', 'раз')}`;
}

export function scheduleText(task: Task): string {
  if (task.kind === 'once') return 'Разовое';
  const s = task.schedule;
  if (!s) return '';
  switch (s.type) {
    case 'daily':
      return 'Каждый день';
    case 'weekdays':
      if (s.days.length === 7) return 'Каждый день';
      if (s.days.length === 5 && [1, 2, 3, 4, 5].every((d) => s.days.includes(d))) return 'По будням';
      if (s.days.length === 2 && s.days.includes(6) && s.days.includes(7)) return 'По выходным';
      return [...s.days].sort().map((d) => WEEKDAY_SHORT[d - 1]).join(', ');
    case 'perWeek':
      return `${timesWord(s.count)} в неделю`;
    case 'everyNDays':
      return s.n === 2 ? 'Через день' : `Раз в ${s.n} ${plural(s.n, 'день', 'дня', 'дней')}`;
    case 'monthly':
      return `Раз в месяц, ${s.day}-го`;
  }
}

/** «9 дней подряд» / «3 недели подряд» / «4 раза подряд» */
export function streakText(task: Task, n: number): string {
  if (task.schedule?.type === 'perWeek') return `${n} ${plural(n, 'неделя', 'недели', 'недель')} подряд`;
  if (task.schedule?.type === 'daily') return `${n} ${plural(n, 'день', 'дня', 'дней')} подряд`;
  return `${timesWord(n)} подряд`;
}
