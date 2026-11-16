import { addDays, addMonths, daysRange, monthEnd, monthStart, weekStart } from './date';
import { buildIndex, currentStreak } from './schedule';
import type { AppState, DayKey, ID } from './types';

export interface DayStat {
  day: DayKey;
  count: number;
  earned: number;
  penalties: number;
}

export function dayStats(s: AppState, from: DayKey, to: DayKey): DayStat[] {
  const map = new Map<DayKey, DayStat>();
  for (const d of daysRange(from, to)) map.set(d, { day: d, count: 0, earned: 0, penalties: 0 });
  for (const c of s.completions) {
    const x = map.get(c.day);
    if (x) {
      x.count++;
      x.earned += c.amount;
    }
  }
  for (const p of s.penalties) {
    const x = map.get(p.day);
    if (x) x.penalties += p.amount;
  }
  return [...map.values()];
}

export interface MonthStat {
  month: DayKey;
  count: number;
  earned: number;
  penalties: number;
}

export function monthStats(s: AppState, months: number, today: DayKey): MonthStat[] {
  const out: MonthStat[] = [];
  const first = addMonths(monthStart(today), -(months - 1));
  for (let i = 0; i < months; i++) {
    const m = addMonths(first, i);
    out.push({ month: m, count: 0, earned: 0, penalties: 0 });
  }
  const find = (d: DayKey) => out.find((x) => x.month === monthStart(d));
  for (const c of s.completions) {
    const x = find(c.day);
    if (x) {
      x.count++;
      x.earned += c.amount;
    }
  }
  for (const p of s.penalties) {
    const x = find(p.day);
    if (x) x.penalties += p.amount;
  }
  return out;
}

export interface CategoryStat {
  categoryId: ID | null;
  count: number;
  earned: number;
}

export function categoryStats(s: AppState, from: DayKey, to: DayKey): CategoryStat[] {
  const known = new Set(s.categories.map((c) => c.id));
  const map = new Map<ID | null, CategoryStat>();
  for (const c of s.completions) {
    if (c.day < from || c.day > to) continue;
    const id = c.categoryId && known.has(c.categoryId) ? c.categoryId : null;
    const x = map.get(id) ?? { categoryId: id, count: 0, earned: 0 };
    x.count++;
    x.earned += c.amount;
    map.set(id, x);
  }
  return [...map.values()].sort((a, b) => b.count - a.count);
}

export function bestCurrentStreak(s: AppState, today: DayKey) {
  const idx = buildIndex(s.completions);
  let best: { title: string; streak: number; perWeek: boolean } | null = null;
  for (const t of s.tasks) {
    if (t.kind !== 'recurring') continue;
    const n = currentStreak(t, today, idx);
    if (n > 0 && (!best || n > best.streak)) best = { title: t.title, streak: n, perWeek: t.schedule?.type === 'perWeek' };
  }
  return best;
}

export function firstActivityDay(s: AppState, today: DayKey): DayKey {
  let first = today;
  for (const c of s.completions) if (c.day < first) first = c.day;
  for (const t of s.tasks) if (t.startDate < first) first = t.startDate;
  return first;
}

/** Границы периода для статистики. */
export function periodBounds(kind: 'week' | 'month' | 'all', anchor: DayKey, s: AppState, today: DayKey) {
  if (kind === 'week') {
    const from = weekStart(anchor);
    return { from, to: addDays(from, 6) };
  }
  if (kind === 'month') return { from: monthStart(anchor), to: monthEnd(anchor) };
  return { from: firstActivityDay(s, today), to: today };
}
