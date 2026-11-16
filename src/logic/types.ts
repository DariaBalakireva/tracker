export type ID = string;
/** Календарный день в формате YYYY-MM-DD (локальное время). */
export type DayKey = string;

export type ColorKey = 'violet' | 'blue' | 'green' | 'pink' | 'orange' | 'teal' | 'yellow' | 'gray';

export interface Category {
  id: ID;
  name: string;
  emoji: string;
  color: ColorKey;
}

export type Schedule =
  | { type: 'daily' }
  /** 1 = понедельник … 7 = воскресенье */
  | { type: 'weekdays'; days: number[] }
  | { type: 'perWeek'; count: number }
  | { type: 'everyNDays'; n: number }
  | { type: 'monthly'; day: number };

export interface Task {
  id: ID;
  title: string;
  categoryId: ID | null;
  /** Награда в рублях. */
  reward: number;
  kind: 'once' | 'recurring';
  /** Для разовых: день, на который назначено (null — без даты). */
  date: DayKey | null;
  /** Для регулярных. */
  schedule: Schedule | null;
  /** Сколько раз в день нужно отметить (1 — обычное задание). */
  timesPerDay: number;
  /** С этого дня считаются серии и пропуски. */
  startDate: DayKey;
  createdAt: string;
  /** Для разовых: сколько раз задание переносилось со штрафом. */
  missedCount: number;
}

/** Куда разошлись деньги за одно выполнение. */
export interface Allocation {
  /** Сколько ушло на погашение долга. */
  debt: number;
  goalId: ID | null;
  toGoal: number;
  toWallet: number;
}

export interface Completion {
  id: ID;
  taskId: ID;
  /** Снимок названия и категории — чтобы статистика не ломалась после удаления задания. */
  title: string;
  categoryId: ID | null;
  day: DayKey;
  at: string;
  base: number;
  bonusPct: number;
  amount: number;
  alloc: Allocation;
}

export interface Penalty {
  id: ID;
  taskId: ID;
  title: string;
  categoryId: ID | null;
  /** День, который был пропущен (для «N раз в неделю» — последний день недели). */
  day: DayKey;
  amount: number;
  /** Для разовых — на какой день перенесли. */
  movedTo: DayKey | null;
  /** Для «N раз в неделю» — сколько раз не хватило. */
  missing: number;
}

export interface Goal {
  id: ID;
  name: string;
  price: number;
  comment: string;
  photoId: ID | null;
  saved: number;
  createdAt: string;
  bought: null | { price: number; at: string };
}

export interface AppState {
  version: 1;
  categories: Category[];
  tasks: Task[];
  completions: Completion[];
  penalties: Penalty[];
  /** `${taskId}|${day}` → сколько раз уже отмечено сегодня (для заданий «несколько раз в день»). */
  taps: Record<string, number>;
  goals: Goal[];
  /** Нераспределённые деньги. Отрицательное значение — долг. */
  wallet: number;
  /** Свои фразы похвалы. */
  phrases: string[];
  /** Куда клали деньги в прошлый раз (null — в кошелёк). */
  lastTarget: ID | null;
  /** Все дни до этого включительно уже проверены на пропуски. */
  processedThrough: DayKey;
  /** За какой день уже показан итог «вчера». */
  summarySeenOn: DayKey | null;
}
