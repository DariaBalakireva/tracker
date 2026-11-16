import type { DayKey } from './types';

const DAY_MS = 86_400_000;
const pad = (n: number) => String(n).padStart(2, '0');

export function toKey(y: number, m: number, d: number): DayKey {
  return `${y}-${pad(m)}-${pad(d)}`;
}

/** Ключ дня по локальному времени. */
export function dayKey(date: Date = new Date()): DayKey {
  return toKey(date.getFullYear(), date.getMonth() + 1, date.getDate());
}

export function parts(k: DayKey): [number, number, number] {
  const [y, m, d] = k.split('-').map(Number);
  return [y, m, d];
}

function utc(k: DayKey): number {
  const [y, m, d] = parts(k);
  return Date.UTC(y, m - 1, d);
}

function fromUtc(ms: number): DayKey {
  const dt = new Date(ms);
  return toKey(dt.getUTCFullYear(), dt.getUTCMonth() + 1, dt.getUTCDate());
}

export function addDays(k: DayKey, n: number): DayKey {
  return fromUtc(utc(k) + n * DAY_MS);
}

/** Сколько дней от a до b (b − a). */
export function diffDays(a: DayKey, b: DayKey): number {
  return Math.round((utc(b) - utc(a)) / DAY_MS);
}

/** 1 = понедельник … 7 = воскресенье. */
export function weekday(k: DayKey): number {
  const wd = new Date(utc(k)).getUTCDay();
  return wd === 0 ? 7 : wd;
}

export function weekStart(k: DayKey): DayKey {
  return addDays(k, 1 - weekday(k));
}

export function daysInMonth(y: number, m: number): number {
  return new Date(Date.UTC(y, m, 0)).getUTCDate();
}

export function monthStart(k: DayKey): DayKey {
  const [y, m] = parts(k);
  return toKey(y, m, 1);
}

export function monthEnd(k: DayKey): DayKey {
  const [y, m] = parts(k);
  return toKey(y, m, daysInMonth(y, m));
}

export function addMonths(k: DayKey, n: number): DayKey {
  const [y, m] = parts(k);
  const total = y * 12 + (m - 1) + n;
  return toKey(Math.floor(total / 12), (total % 12) + 1, 1);
}

export function toLocalDate(k: DayKey): Date {
  const [y, m, d] = parts(k);
  return new Date(y, m - 1, d);
}

/** Все дни от from до to включительно. */
export function daysRange(from: DayKey, to: DayKey): DayKey[] {
  const out: DayKey[] = [];
  for (let d = from; d <= to; d = addDays(d, 1)) out.push(d);
  return out;
}

export const WEEKDAY_SHORT = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
const MONTHS_GEN = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'];
const MONTHS_NOM = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'];
const WEEKDAY_LONG = ['понедельник', 'вторник', 'среда', 'четверг', 'пятница', 'суббота', 'воскресенье'];

/** «Понедельник, 16 ноября» */
export function formatLong(k: DayKey): string {
  const [, m, d] = parts(k);
  const s = `${WEEKDAY_LONG[weekday(k) - 1]}, ${d} ${MONTHS_GEN[m - 1]}`;
  return s[0].toUpperCase() + s.slice(1);
}

/** «16 ноября» */
export function formatShort(k: DayKey): string {
  const [, m, d] = parts(k);
  return `${d} ${MONTHS_GEN[m - 1]}`;
}

/** «Ноябрь 2026» */
export function formatMonth(k: DayKey): string {
  const [y, m] = parts(k);
  return `${MONTHS_NOM[m - 1]} ${y}`;
}

export function monthNameShort(k: DayKey): string {
  const [, m] = parts(k);
  return MONTHS_NOM[m - 1].slice(0, 3).toLowerCase();
}

/** «Сегодня», «Завтра», «Вчера» или «пт, 20 ноября». */
export function formatRelative(k: DayKey, today: DayKey): string {
  const diff = diffDays(today, k);
  if (diff === 0) return 'Сегодня';
  if (diff === 1) return 'Завтра';
  if (diff === -1) return 'Вчера';
  if (diff === 2) return 'Послезавтра';
  return `${WEEKDAY_SHORT[weekday(k) - 1]}, ${formatShort(k)}`;
}
