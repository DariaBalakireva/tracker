import { useEffect, useState, useSyncExternalStore } from 'react';
import { initialState, processDays } from './logic/actions';
import { dayKey } from './logic/date';
import type { AppState } from './logic/types';
import { loadState, saveState } from './storage';

let state: AppState = initialState(dayKey());
const listeners = new Set<() => void>();

const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};

export const getState = () => state;

export function commit(next: AppState) {
  if (next === state) return;
  state = next;
  listeners.forEach((l) => l());
  void saveState(next);
}

export function useApp(): AppState {
  return useSyncExternalStore(subscribe, getState);
}

export async function boot() {
  const saved = await loadState();
  if (saved && saved.version === 1) state = saved;
  else await saveState(state);
  runDayCheck();
}

/** Проверить пропущенные дни (вызывается при запуске и при возвращении в приложение). */
export function runDayCheck() {
  const r = processDays(state, dayKey());
  commit(r.state);
}

/** Текущий день; обновляется после полуночи и при возвращении в приложение. */
export function useToday(): string {
  const [today, setToday] = useState(dayKey());
  useEffect(() => {
    const check = () => {
      const k = dayKey();
      setToday((prev) => (prev === k ? prev : k));
      runDayCheck();
    };
    const onVis = () => document.visibilityState === 'visible' && check();
    document.addEventListener('visibilitychange', onVis);
    window.addEventListener('focus', check);
    const timer = window.setInterval(check, 60_000);
    return () => {
      document.removeEventListener('visibilitychange', onVis);
      window.removeEventListener('focus', check);
      window.clearInterval(timer);
    };
  }, []);
  return today;
}

/* ───── Похвала (всплывающая карточка) ───── */

export interface PraiseData {
  title: string;
  phrase: string;
  amount?: number;
  bonusPct?: number;
  target?: string;
  debtPaid?: number;
  toWallet?: number;
  extra?: string[];
  big?: boolean;
}

let praise: PraiseData | null = null;
const praiseListeners = new Set<() => void>();

export function showPraise(p: PraiseData | null) {
  praise = p;
  praiseListeners.forEach((l) => l());
}

export function usePraise() {
  return useSyncExternalStore(
    (l) => {
      praiseListeners.add(l);
      return () => praiseListeners.delete(l);
    },
    () => praise,
  );
}
