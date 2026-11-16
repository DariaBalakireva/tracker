import { describe, expect, it } from 'vitest';
import {
  addGoal,
  addTask,
  buyGoal,
  completeTask,
  deleteCategory,
  deleteGoal,
  initialState,
  processDays,
  reschedule,
  setTaps,
  tapsOf,
  transfer,
  undoCompletion,
  updateGoal,
  type TaskInput,
} from './actions';
import { addDays, weekday } from './date';
import { bonusPct, buildIndex, currentStreak, isScheduledOn, scheduleText } from './schedule';
import type { AppState, Schedule } from './types';

const NOW = '2026-11-16T10:00:00.000Z';
const MON = '2026-11-16'; // понедельник

function base(): AppState {
  return { ...initialState(MON), categories: [] };
}

function withTask(s: AppState, patch: Partial<TaskInput> = {}, start = MON): AppState {
  const input: TaskInput = {
    title: 'Зарядка',
    categoryId: null,
    reward: 100,
    kind: 'recurring',
    date: null,
    schedule: { type: 'daily' },
    timesPerDay: 1,
    ...patch,
  };
  return addTask(s, input, start, NOW);
}

const last = <T>(xs: T[]) => xs[xs.length - 1];

/** Выполнять задание каждый день с from по to включительно. */
function doDays(s: AppState, taskId: string, from: string, to: string, target: string | null = null) {
  for (let d = from; d <= to; d = addDays(d, 1)) {
    const r = completeTask(s, taskId, d, target, NOW);
    if (r) s = r.state;
  }
  return s;
}

describe('даты', () => {
  it('понедельник — первый день недели', () => {
    expect(weekday(MON)).toBe(1);
    expect(weekday('2026-11-22')).toBe(7);
  });
});

describe('расписание', () => {
  const task = (schedule: Schedule) => last(withTask(base(), { schedule }).tasks);

  it('по дням недели', () => {
    const t = task({ type: 'weekdays', days: [1, 3, 5] });
    expect(isScheduledOn(t, MON)).toBe(true);
    expect(isScheduledOn(t, '2026-11-17')).toBe(false);
    expect(isScheduledOn(t, '2026-11-18')).toBe(true);
    expect(scheduleText(t)).toBe('Пн, Ср, Пт');
  });

  it('раз в N дней — от дня создания', () => {
    const t = task({ type: 'everyNDays', n: 3 });
    expect(isScheduledOn(t, MON)).toBe(true);
    expect(isScheduledOn(t, '2026-11-17')).toBe(false);
    expect(isScheduledOn(t, '2026-11-19')).toBe(true);
  });

  it('раз в месяц: 31-е в коротком месяце переносится на последний день', () => {
    const t = task({ type: 'monthly', day: 31 });
    expect(isScheduledOn(t, '2026-11-30')).toBe(true);
    expect(isScheduledOn(t, '2026-12-31')).toBe(true);
    expect(isScheduledOn(t, '2026-12-30')).toBe(false);
  });

  it('не назначено раньше дня создания', () => {
    const t = task({ type: 'daily' });
    expect(isScheduledOn(t, addDays(MON, -1))).toBe(false);
  });
});

describe('бонусы за серию', () => {
  it('ступени 4/7/14/21 → 5/10/15/20%', () => {
    expect([1, 3, 4, 6, 7, 13, 14, 20, 21, 40].map(bonusPct)).toEqual([0, 0, 5, 5, 10, 10, 15, 15, 20, 20]);
  });

  it('7-е выполнение подряд стоит на 10% больше', () => {
    let s = withTask(base());
    const id = last(s.tasks).id;
    s = doDays(s, id, MON, addDays(MON, 5));
    const r = completeTask(s, id, addDays(MON, 6), null, NOW)!;
    expect(r.streak).toBe(7);
    expect(r.completion.amount).toBe(110);
    expect(s.completions.map((c) => c.amount)).toEqual([100, 100, 100, 105, 105, 105]);
  });

  it('пропуск обрывает серию', () => {
    let s = withTask(base());
    const id = last(s.tasks).id;
    s = doDays(s, id, MON, addDays(MON, 4));
    // 6-й день пропущен
    const r = completeTask(s, id, addDays(MON, 6), null, NOW)!;
    expect(r.streak).toBe(1);
    expect(r.completion.bonusPct).toBe(0);
  });

  it('для дней недели серия считается по назначенным дням', () => {
    let s = withTask(base(), { schedule: { type: 'weekdays', days: [1, 3, 5] } });
    const id = last(s.tasks).id;
    for (const d of ['2026-11-16', '2026-11-18', '2026-11-20']) s = completeTask(s, id, d, null, NOW)!.state;
    const r = completeTask(s, id, '2026-11-23', null, NOW)!;
    expect(r.streak).toBe(4);
    expect(r.completion.bonusPct).toBe(5);
  });

  it('для «N раз в неделю» серия считается в неделях', () => {
    let s = withTask(base(), { schedule: { type: 'perWeek', count: 2 } });
    const id = last(s.tasks).id;
    for (let w = 0; w < 3; w++) {
      s = completeTask(s, id, addDays(MON, w * 7), null, NOW)!.state;
      s = completeTask(s, id, addDays(MON, w * 7 + 2), null, NOW)!.state;
    }
    const r = completeTask(s, id, addDays(MON, 21), null, NOW)!;
    expect(r.streak).toBe(4);
    expect(r.completion.bonusPct).toBe(5);
    expect(currentStreak(last(s.tasks), addDays(MON, 21), buildIndex(s.completions))).toBe(3);
  });
});

describe('деньги', () => {
  it('награда идёт в цель, лишнее — в кошелёк', () => {
    let s = addGoal(base(), { name: 'Купальник', price: 150, comment: '', photoId: null }, NOW);
    const goal = last(s.goals).id;
    s = withTask(s);
    const id = last(s.tasks).id;
    s = completeTask(s, id, MON, goal, NOW)!.state;
    const r = completeTask(s, id, addDays(MON, 1), goal, NOW)!;
    expect(r.reached?.id).toBe(goal);
    expect(r.state.goals[0].saved).toBe(150);
    expect(r.state.wallet).toBe(50);
    expect(r.completion.alloc).toEqual({ debt: 0, goalId: goal, toGoal: 50, toWallet: 50 });
  });

  it('сначала гасится долг', () => {
    let s = addGoal({ ...base(), wallet: -30 }, { name: 'Цель', price: 1000, comment: '', photoId: null }, NOW);
    s = withTask(s);
    const r = completeTask(s, last(s.tasks).id, MON, last(s.goals).id, NOW)!;
    expect(r.state.wallet).toBe(0);
    expect(r.state.goals[0].saved).toBe(70);
  });

  it('отмена выполнения возвращает всё как было', () => {
    let s = addGoal({ ...base(), wallet: -30 }, { name: 'Цель', price: 50, comment: '', photoId: null }, NOW);
    s = withTask(s);
    const before = s;
    const r = completeTask(s, last(s.tasks).id, MON, last(s.goals).id, NOW)!;
    const undone = undoCompletion(r.state, r.completion.id);
    expect(undone.wallet).toBe(before.wallet);
    expect(undone.goals[0].saved).toBe(0);
    expect(undone.completions).toHaveLength(0);
  });

  it('перекладывание между целью и кошельком', () => {
    let s = addGoal({ ...base(), wallet: 500 }, { name: 'Цель', price: 300, comment: '', photoId: null }, NOW);
    const g = last(s.goals).id;
    expect(transfer(s, 'wallet', g, 400).error).toMatch(/поместится только 300/);
    s = transfer(s, 'wallet', g, 200).state;
    expect([s.wallet, s.goals[0].saved]).toEqual([300, 200]);
    expect(transfer(s, g, 'wallet', 250).error).toMatch(/не больше 200/);
    s = transfer(s, g, 'wallet', 50).state;
    expect([s.wallet, s.goals[0].saved]).toEqual([350, 150]);
  });

  it('цена цели уменьшилась — лишнее в кошелёк', () => {
    let s = addGoal(base(), { name: 'Цель', price: 300, comment: '', photoId: null }, NOW);
    const g = last(s.goals).id;
    s = { ...s, goals: s.goals.map((x) => ({ ...x, saved: 300 })) };
    s = updateGoal(s, g, { price: 250 });
    expect([s.wallet, s.goals[0].saved]).toEqual([50, 250]);
  });

  it('удаление цели возвращает деньги в кошелёк', () => {
    let s = addGoal(base(), { name: 'Цель', price: 300, comment: '', photoId: null }, NOW);
    s = { ...s, goals: s.goals.map((x) => ({ ...x, saved: 120 })) };
    s = deleteGoal(s, s.goals[0].id);
    expect(s.wallet).toBe(120);
    expect(s.goals).toHaveLength(0);
  });

  describe('покупка', () => {
    const setup = (wallet: number) => {
      let s = addGoal({ ...base(), wallet }, { name: 'Купальник', price: 7000, comment: '', photoId: null }, NOW);
      s = { ...s, goals: s.goals.map((x) => ({ ...x, saved: 7000 })) };
      return { s, id: s.goals[0].id };
    };

    it('дешевле — разница в кошелёк', () => {
      const { s, id } = setup(0);
      const r = buyGoal(s, id, 6500, NOW);
      expect(r.state.wallet).toBe(500);
      expect(r.state.goals[0].bought?.price).toBe(6500);
    });

    it('дороже — добираем из кошелька', () => {
      const { s, id } = setup(400);
      const r = buyGoal(s, id, 7300, NOW);
      expect(r.shortfall).toBeUndefined();
      expect(r.state.wallet).toBe(100);
    });

    it('дороже, а в кошельке не хватает — сколько довнести', () => {
      const { s, id } = setup(100);
      const r = buyGoal(s, id, 7300, NOW);
      expect(r.shortfall).toBe(200);
      expect(r.state).toBe(s);
    });
  });
});

describe('несколько раз в день', () => {
  it('задание засчитывается только после всех отметок', () => {
    let s = withTask(base(), { title: 'Вода', timesPerDay: 3, reward: 80 });
    const id = last(s.tasks).id;
    s = setTaps(s, id, MON, 1);
    s = setTaps(s, id, MON, 2);
    s = setTaps(s, id, MON, 5); // больше чем нужно — не даёт
    expect(tapsOf(s, id, MON)).toBe(2);
    expect(s.completions).toHaveLength(0);
    const r = completeTask(s, id, MON, null, NOW)!;
    expect(tapsOf(r.state, id, MON)).toBe(3);
    expect(r.state.wallet).toBe(80);
    expect(tapsOf(undoCompletion(r.state, r.completion.id), id, MON)).toBe(2);
  });

  it('не доделанное до конца — пропуск', () => {
    let s = withTask(base(), { title: 'Вода', timesPerDay: 3, reward: 80 });
    s = setTaps(s, last(s.tasks).id, MON, 2);
    const r = processDays(s, addDays(MON, 1));
    expect(r.penalties.map((p) => p.amount)).toEqual([40]);
    expect(r.state.wallet).toBe(-40);
  });
});

describe('пропуски и штрафы', () => {
  it('регулярное: штраф половина стоимости, уходит в долг', () => {
    const s = withTask(base(), { reward: 150 });
    const r = processDays(s, addDays(MON, 3));
    expect(r.penalties).toHaveLength(3);
    expect(r.state.wallet).toBe(-225);
    expect(r.state.processedThrough).toBe(addDays(MON, 2));
    // повторная проверка ничего не добавляет
    expect(processDays(r.state, addDays(MON, 3)).penalties).toHaveLength(0);
  });

  it('выполненные дни не штрафуются', () => {
    let s = withTask(base());
    s = completeTask(s, last(s.tasks).id, MON, null, NOW)!.state;
    expect(processDays(s, addDays(MON, 1)).penalties).toHaveLength(0);
  });

  it('по дням недели: штраф только за назначенные дни', () => {
    const s = withTask(base(), { schedule: { type: 'weekdays', days: [1, 3, 5] } });
    const r = processDays(s, addDays(MON, 7));
    expect(r.penalties.map((p) => p.day)).toEqual(['2026-11-16', '2026-11-18', '2026-11-20']);
  });

  it('N раз в неделю: в конце недели штраф за каждый недостающий раз', () => {
    let s = withTask(base(), { schedule: { type: 'perWeek', count: 3 }, reward: 100 });
    s = completeTask(s, last(s.tasks).id, addDays(MON, 1), null, NOW)!.state;
    const r = processDays(s, addDays(MON, 8));
    expect(r.penalties).toHaveLength(1);
    expect(r.penalties[0]).toMatchObject({ day: '2026-11-22', missing: 2, amount: 100 });
  });

  it('N раз в неделю: неполная первая неделя не требует больше, чем осталось дней', () => {
    const s = withTask(base(), { schedule: { type: 'perWeek', count: 3 }, reward: 100 }, '2026-11-21');
    const r = processDays({ ...s, processedThrough: '2026-11-20' }, '2026-11-23');
    expect(r.penalties[0]).toMatchObject({ missing: 2, amount: 100 });
  });

  it('разовое: не перенесено до конца дня — штраф и перенос на завтра, каждый день заново', () => {
    let s = withTask(base(), { kind: 'once', schedule: null, date: MON, reward: 300, title: 'Разобрать шкаф' });
    const r = processDays(s, addDays(MON, 2));
    expect(r.penalties.map((p) => [p.day, p.amount, p.movedTo])).toEqual([
      ['2026-11-16', 150, '2026-11-17'],
      ['2026-11-17', 150, '2026-11-18'],
    ]);
    expect(last(r.state.tasks)).toMatchObject({ date: '2026-11-18', missedCount: 2 });
    // за выполнение после переноса — полная стоимость
    s = completeTask(r.state, last(r.state.tasks).id, '2026-11-18', null, NOW)!.state;
    expect(s.wallet).toBe(0);
  });

  it('разовое перенесённое заранее — без штрафа', () => {
    let s = withTask(base(), { kind: 'once', schedule: null, date: MON });
    s = reschedule(s, last(s.tasks).id, addDays(MON, 5));
    expect(processDays(s, addDays(MON, 2)).penalties).toHaveLength(0);
  });

  it('разовое без даты не штрафуется', () => {
    const s = withTask(base(), { kind: 'once', schedule: null, date: null });
    expect(processDays(s, addDays(MON, 5)).penalties).toHaveLength(0);
  });
});

describe('категории', () => {
  it('при удалении задания переходят в «Без категории»', () => {
    let s = initialState(MON);
    const cat = s.categories[0].id;
    s = withTask(s, { categoryId: cat });
    s = deleteCategory(s, cat);
    expect(last(s.tasks).categoryId).toBeNull();
    expect(s.categories.find((c) => c.id === cat)).toBeUndefined();
  });
});
