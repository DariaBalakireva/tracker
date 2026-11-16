import { addDays, diffDays, weekday, weekStart } from './date';
import {
  bonusPct,
  buildIndex,
  buildOnceIndex,
  doneKey,
  isDayBased,
  isPerWeek,
  isScheduledOn,
  penaltyFor,
  streakIfDone,
  weekDoneCount,
  withBonus,
} from './schedule';
import type { Allocation, AppState, Category, Completion, DayKey, Goal, ID, Penalty, Task } from './types';

export const uid = (): ID =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2) + Date.now().toString(36);

export function initialState(today: DayKey): AppState {
  return {
    version: 1,
    categories: [
      { id: uid(), name: 'Спорт', emoji: '💪', color: 'violet' },
      { id: uid(), name: 'Здоровье', emoji: '💧', color: 'blue' },
      { id: uid(), name: 'Учёба', emoji: '📚', color: 'green' },
      { id: uid(), name: 'Дом', emoji: '🏠', color: 'orange' },
    ],
    tasks: [],
    completions: [],
    penalties: [],
    taps: {},
    goals: [],
    wallet: 0,
    phrases: [],
    lastTarget: null,
    processedThrough: addDays(today, -1),
    summarySeenOn: null,
  };
}

/* ───────────── Деньги ───────────── */

export const goalRoom = (g: Goal) => Math.max(0, g.price - g.saved);
export const isReached = (g: Goal) => !g.bought && g.saved >= g.price;
/** Цели, в которые ещё можно класть деньги. */
export const openGoals = (s: AppState) => s.goals.filter((g) => !g.bought && g.saved < g.price);

/**
 * Зачислить заработанное: сначала гасим долг, потом кладём в цель (сколько поместится),
 * остаток — в кошелёк.
 */
export function earn(s: AppState, amount: number, target: ID | null) {
  let wallet = s.wallet;
  let rest = amount;
  let debt = 0;
  if (wallet < 0) {
    debt = Math.min(rest, -wallet);
    wallet += debt;
    rest -= debt;
  }
  let goals = s.goals;
  let toGoal = 0;
  let goalId: ID | null = null;
  let reached: Goal | null = null;
  const g = target ? s.goals.find((x) => x.id === target && !x.bought) : undefined;
  if (g) {
    goalId = g.id;
    toGoal = Math.min(rest, goalRoom(g));
    rest -= toGoal;
    if (toGoal > 0) {
      const ng = { ...g, saved: g.saved + toGoal };
      goals = s.goals.map((x) => (x.id === g.id ? ng : x));
      if (ng.saved >= ng.price) reached = ng;
    }
  }
  wallet += rest;
  const alloc: Allocation = { debt, goalId, toGoal, toWallet: rest };
  return { state: { ...s, wallet, goals }, alloc, reached };
}

/** Вернуть деньги, начисленные за выполнение (при отмене). */
export function refund(s: AppState, alloc: Allocation): AppState {
  let wallet = s.wallet - alloc.toWallet - alloc.debt;
  let goals = s.goals;
  if (alloc.toGoal > 0) {
    const g = alloc.goalId ? s.goals.find((x) => x.id === alloc.goalId && !x.bought) : undefined;
    if (g) {
      const take = Math.min(g.saved, alloc.toGoal);
      goals = s.goals.map((x) => (x.id === g.id ? { ...x, saved: x.saved - take } : x));
      wallet -= alloc.toGoal - take;
    } else {
      wallet -= alloc.toGoal;
    }
  }
  return { ...s, wallet, goals };
}

/* ───────────── Выполнение заданий ───────────── */

export function isDone(s: AppState, task: Task, day: DayKey): boolean {
  if (task.kind === 'once') return s.completions.some((c) => c.taskId === task.id);
  return s.completions.some((c) => c.taskId === task.id && c.day === day);
}

/** Сколько принесёт выполнение сегодня (с учётом бонуса за серию). */
export function previewReward(s: AppState, task: Task, day: DayKey) {
  const streak = task.kind === 'recurring' ? streakIfDone(task, day, buildIndex(s.completions)) : 0;
  const pct = bonusPct(streak);
  return { base: task.reward, pct, amount: withBonus(task.reward, pct), streak };
}

export function completeTask(s: AppState, taskId: ID, day: DayKey, target: ID | null, nowIso: string) {
  const task = s.tasks.find((t) => t.id === taskId);
  if (!task || isDone(s, task, day)) return null;
  const { pct, amount, streak } = previewReward(s, task, day);
  const { state, alloc, reached } = earn(s, amount, target);
  const completion: Completion = {
    id: uid(),
    taskId,
    title: task.title,
    categoryId: task.categoryId,
    day,
    at: nowIso,
    base: task.reward,
    bonusPct: pct,
    amount,
    alloc,
  };
  const taps = task.timesPerDay > 1 ? { ...s.taps, [doneKey(taskId, day)]: task.timesPerDay } : s.taps;
  return {
    state: { ...state, completions: [...s.completions, completion], taps, lastTarget: target },
    completion,
    reached,
    streak,
  };
}

export function undoCompletion(s: AppState, completionId: ID): AppState {
  const c = s.completions.find((x) => x.id === completionId);
  if (!c) return s;
  const next = refund(s, c.alloc);
  const task = s.tasks.find((t) => t.id === c.taskId);
  const taps = { ...s.taps };
  if (task && task.timesPerDay > 1) taps[doneKey(c.taskId, c.day)] = task.timesPerDay - 1;
  return { ...next, taps, completions: s.completions.filter((x) => x.id !== completionId) };
}

/** Отметки для заданий «несколько раз в день» (последнюю отметку делает completeTask). */
export function setTaps(s: AppState, taskId: ID, day: DayKey, count: number): AppState {
  const task = s.tasks.find((t) => t.id === taskId);
  if (!task || isDone(s, task, day)) return s;
  const v = Math.max(0, Math.min(task.timesPerDay - 1, count));
  return { ...s, taps: { ...s.taps, [doneKey(taskId, day)]: v } };
}

export const tapsOf = (s: AppState, taskId: ID, day: DayKey) => s.taps[doneKey(taskId, day)] ?? 0;

/* ───────────── Пропуски и штрафы ───────────── */

/**
 * Проверить все прошедшие дни, которые ещё не проверялись: за каждый пропуск
 * списывается половина награды из кошелька (может уйти в долг).
 * Невыполненные разовые задания переносятся на следующий день.
 */
export function processDays(s: AppState, today: DayKey): { state: AppState; penalties: Penalty[] } {
  const end = addDays(today, -1);
  let d = addDays(s.processedThrough, 1);
  if (d > end) return { state: s, penalties: [] };

  const idx = buildIndex(s.completions);
  const onceIdx = buildOnceIndex(s.completions);
  const tasks = [...s.tasks];
  const fresh: Penalty[] = [];
  let wallet = s.wallet;

  const add = (t: Task, day: DayKey, amount: number, movedTo: DayKey | null, missing: number) => {
    if (amount <= 0) return;
    fresh.push({ id: uid(), taskId: t.id, title: t.title, categoryId: t.categoryId, day, amount, movedTo, missing });
    wallet -= amount;
  };

  for (; d <= end; d = addDays(d, 1)) {
    for (let i = 0; i < tasks.length; i++) {
      const t = tasks[i];
      if (t.kind === 'once') {
        if (t.date !== null && t.date <= d && !onceIdx.has(t.id)) {
          const movedTo = addDays(d, 1);
          add(t, d, penaltyFor(t), movedTo, 1);
          tasks[i] = { ...t, date: movedTo, missedCount: t.missedCount + 1 };
        }
      } else if (isDayBased(t)) {
        if (isScheduledOn(t, d) && !idx.has(doneKey(t.id, d))) add(t, d, penaltyFor(t), null, 1);
      } else if (isPerWeek(t) && weekday(d) === 7 && d >= t.startDate && t.schedule?.type === 'perWeek') {
        const ws = weekStart(d);
        const available = ws >= t.startDate ? 7 : diffDays(t.startDate, d) + 1;
        const required = Math.min(t.schedule.count, available);
        const missing = Math.max(0, required - weekDoneCount(idx, t, ws));
        if (missing > 0) add(t, d, missing * penaltyFor(t), null, missing);
      }
    }
  }

  return {
    state: { ...s, tasks, wallet, penalties: [...s.penalties, ...fresh], processedThrough: end },
    penalties: fresh,
  };
}

/* ───────────── Задания ───────────── */

export type TaskInput = Pick<Task, 'title' | 'categoryId' | 'reward' | 'kind' | 'date' | 'schedule' | 'timesPerDay'>;

export function addTask(s: AppState, input: TaskInput, today: DayKey, nowIso: string): AppState {
  const task: Task = { ...input, id: uid(), startDate: today, createdAt: nowIso, missedCount: 0 };
  return { ...s, tasks: [...s.tasks, task] };
}

export function updateTask(s: AppState, id: ID, patch: Partial<TaskInput>): AppState {
  return { ...s, tasks: s.tasks.map((t) => (t.id === id ? { ...t, ...patch } : t)) };
}

export function deleteTask(s: AppState, id: ID): AppState {
  const taps = Object.fromEntries(Object.entries(s.taps).filter(([k]) => !k.startsWith(`${id}|`)));
  return { ...s, tasks: s.tasks.filter((t) => t.id !== id), taps };
}

export function reschedule(s: AppState, id: ID, date: DayKey | null): AppState {
  return { ...s, tasks: s.tasks.map((t) => (t.id === id && t.kind === 'once' ? { ...t, date } : t)) };
}

/* ───────────── Цели ───────────── */

export type GoalInput = Pick<Goal, 'name' | 'price' | 'comment' | 'photoId'>;

export function addGoal(s: AppState, input: GoalInput, nowIso: string): AppState {
  const goal: Goal = { ...input, id: uid(), saved: 0, createdAt: nowIso, bought: null };
  return { ...s, goals: [...s.goals, goal] };
}

/** Изменить цель. Если новая цена меньше накопленного — лишнее уходит в кошелёк. */
export function updateGoal(s: AppState, id: ID, patch: Partial<GoalInput>): AppState {
  let wallet = s.wallet;
  const goals = s.goals.map((g) => {
    if (g.id !== id) return g;
    const ng = { ...g, ...patch };
    if (!ng.bought && ng.saved > ng.price) {
      wallet += ng.saved - ng.price;
      ng.saved = ng.price;
    }
    return ng;
  });
  return { ...s, goals, wallet };
}

/** Удалить цель: накопленное возвращается в кошелёк. */
export function deleteGoal(s: AppState, id: ID): AppState {
  const g = s.goals.find((x) => x.id === id);
  if (!g) return s;
  return {
    ...s,
    wallet: s.wallet + (g.bought ? 0 : g.saved),
    goals: s.goals.filter((x) => x.id !== id),
    lastTarget: s.lastTarget === id ? null : s.lastTarget,
  };
}

export type Pocket = ID | 'wallet';

export function available(s: AppState, from: Pocket): number {
  if (from === 'wallet') return Math.max(0, s.wallet);
  return s.goals.find((g) => g.id === from)?.saved ?? 0;
}

export function capacity(s: AppState, to: Pocket): number {
  if (to === 'wallet') return Infinity;
  const g = s.goals.find((x) => x.id === to);
  return g && !g.bought ? goalRoom(g) : 0;
}

export function transfer(s: AppState, from: Pocket, to: Pocket, amount: number): { state: AppState; error?: string } {
  if (!Number.isFinite(amount) || amount <= 0) return { state: s, error: 'Введи сумму' };
  if (from === to) return { state: s, error: 'Выбери разные кошелёк и цель' };
  const av = available(s, from);
  if (amount > av) return { state: s, error: `Можно переложить не больше ${av.toLocaleString('ru-RU')} ₽` };
  const cap = capacity(s, to);
  if (amount > cap) return { state: s, error: `В эту цель поместится только ${cap.toLocaleString('ru-RU')} ₽` };
  let wallet = s.wallet;
  if (from === 'wallet') wallet -= amount;
  if (to === 'wallet') wallet += amount;
  const goals = s.goals.map((g) => {
    if (g.id === from) return { ...g, saved: g.saved - amount };
    if (g.id === to) return { ...g, saved: g.saved + amount };
    return g;
  });
  return { state: { ...s, wallet, goals } };
}

/**
 * Отметить цель купленной за price.
 * Купила дешевле — разница идёт в кошелёк. Дороже — разница берётся из кошелька;
 * если там не хватает, возвращается shortfall (сколько нужно довнести).
 */
export function buyGoal(s: AppState, id: ID, price: number, nowIso: string): { state: AppState; shortfall?: number } {
  const g = s.goals.find((x) => x.id === id);
  if (!g || g.bought) return { state: s };
  const diff = g.saved - price;
  let wallet = s.wallet;
  if (diff >= 0) {
    wallet += diff;
  } else {
    const need = -diff;
    const have = Math.max(0, wallet);
    if (have < need) return { state: s, shortfall: need - have };
    wallet -= need;
  }
  const goals = s.goals.map((x) => (x.id === id ? { ...x, saved: price, bought: { price, at: nowIso } } : x));
  return { state: { ...s, wallet, goals, lastTarget: s.lastTarget === id ? null : s.lastTarget } };
}

/* ───────────── Категории ───────────── */

export function addCategory(s: AppState, input: Omit<Category, 'id'>): { state: AppState; id: ID } {
  const id = uid();
  return { state: { ...s, categories: [...s.categories, { ...input, id }] }, id };
}

export function updateCategory(s: AppState, id: ID, patch: Partial<Omit<Category, 'id'>>): AppState {
  return { ...s, categories: s.categories.map((c) => (c.id === id ? { ...c, ...patch } : c)) };
}

/** Удалить категорию: её задания переходят в «Без категории». */
export function deleteCategory(s: AppState, id: ID): AppState {
  return {
    ...s,
    categories: s.categories.filter((c) => c.id !== id),
    tasks: s.tasks.map((t) => (t.categoryId === id ? { ...t, categoryId: null } : t)),
  };
}
