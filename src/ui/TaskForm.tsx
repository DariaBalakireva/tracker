import { useState } from 'react';
import { addCategory, addTask, updateTask, type TaskInput } from '../logic/actions';
import { addDays, parts, WEEKDAY_SHORT, weekday } from '../logic/date';
import type { Schedule, Task } from '../logic/types';
import { commit, getState, useApp } from '../store';
import { COLORS, MoneyInput, Sheet, toInt } from './bits';
import { CategoryEditor } from './CategoryEditor';
import { useFlow } from './flows';
import { IconMinus, IconPlus } from './icons';

export type TaskPreset = Partial<TaskInput>;

type SchedType = Schedule['type'];
const SCHED_LABELS: [SchedType, string][] = [
  ['daily', 'Каждый день'],
  ['weekdays', 'По дням недели'],
  ['perWeek', 'N раз в неделю'],
  ['everyNDays', 'Раз в N дней'],
  ['monthly', 'Раз в месяц'],
];

function Stepper({ value, min, max, onChange, label }: { value: number; min: number; max: number; onChange: (v: number) => void; label: string }) {
  return (
    <div className="stepper" role="group" aria-label={label}>
      <button type="button" className="icon-btn flat" aria-label="Меньше" disabled={value <= min} onClick={() => onChange(Math.max(min, value - 1))}>
        <IconMinus size={18} />
      </button>
      <output aria-live="polite">{value}</output>
      <button type="button" className="icon-btn flat" aria-label="Больше" disabled={value >= max} onClick={() => onChange(Math.min(max, value + 1))}>
        <IconPlus size={18} />
      </button>
    </div>
  );
}

export function TaskForm({ task, preset, onClose }: { task: Task | null; preset?: TaskPreset; onClose: () => void }) {
  const s = useApp();
  const { today } = useFlow();
  const init = { ...preset, ...task };
  const sch = init.schedule;

  const [title, setTitle] = useState(init.title ?? '');
  const [reward, setReward] = useState(init.reward ? String(init.reward) : '');
  const [categoryId, setCategoryId] = useState<string | null>(init.categoryId ?? null);
  const [kind, setKind] = useState<Task['kind']>(init.kind ?? 'once');
  const [date, setDate] = useState<string | null>(task ? (init.date ?? null) : (init.date ?? today));
  const [picking, setPicking] = useState(!!init.date && init.date !== today && init.date !== addDays(today, 1));
  const [schedType, setSchedType] = useState<SchedType>(sch?.type ?? 'daily');
  const [days, setDays] = useState<number[]>(sch?.type === 'weekdays' ? sch.days : [weekday(today)]);
  const [perWeek, setPerWeek] = useState(sch?.type === 'perWeek' ? sch.count : 3);
  const [everyN, setEveryN] = useState(sch?.type === 'everyNDays' ? sch.n : 2);
  const [monthDay, setMonthDay] = useState(sch?.type === 'monthly' ? sch.day : parts(today)[2]);
  const [multi, setMulti] = useState((init.timesPerDay ?? 1) > 1);
  const [times, setTimes] = useState(Math.max(2, init.timesPerDay ?? 2));
  const [newCat, setNewCat] = useState(false);
  const [error, setError] = useState('');

  const tomorrow = addDays(today, 1);

  const save = () => {
    const r = toInt(reward);
    if (!title.trim()) return setError('Напиши, что нужно сделать');
    if (!Number.isFinite(r) || r <= 0) return setError('Укажи награду в рублях');
    if (kind === 'recurring' && schedType === 'weekdays' && days.length === 0) return setError('Выбери хотя бы один день недели');
    let schedule: Schedule | null = null;
    if (kind === 'recurring') {
      schedule =
        schedType === 'daily'
          ? { type: 'daily' }
          : schedType === 'weekdays'
            ? { type: 'weekdays', days: [...days].sort() }
            : schedType === 'perWeek'
              ? { type: 'perWeek', count: perWeek }
              : schedType === 'everyNDays'
                ? { type: 'everyNDays', n: everyN }
                : { type: 'monthly', day: monthDay };
    }
    const input: TaskInput = {
      title: title.trim(),
      reward: r,
      categoryId,
      kind,
      date: kind === 'once' ? date : null,
      schedule,
      timesPerDay: multi ? times : 1,
    };
    const st = getState();
    commit(task ? updateTask(st, task.id, input) : addTask(st, input, today, new Date().toISOString()));
    onClose();
  };

  return (
    <Sheet title={task ? 'Изменить задание' : 'Новое задание'} onClose={onClose}>
      <div className="field">
        <label className="label" htmlFor="t-title">
          Что сделать
        </label>
        <input
          id="t-title"
          className="input"
          value={title}
          maxLength={80}
          placeholder="Например, зарядка 15 минут"
          onChange={(e) => setTitle(e.target.value)}
        />
      </div>

      <div className="field">
        <label className="label" htmlFor="t-reward">
          Награда
        </label>
        <MoneyInput id="t-reward" value={reward} onChange={setReward} />
      </div>

      <div className="field">
        <span className="label">Категория</span>
        <div className="chips">
          {s.categories.map((c) => (
            <button
              key={c.id}
              type="button"
              className="chip"
              aria-pressed={categoryId === c.id}
              style={categoryId === c.id ? { borderColor: COLORS[c.color].dot, background: COLORS[c.color].tint, color: COLORS[c.color].ink } : undefined}
              onClick={() => setCategoryId(categoryId === c.id ? null : c.id)}
            >
              <span aria-hidden="true">{c.emoji}</span> {c.name}
            </button>
          ))}
          <button type="button" className="chip dashed" aria-expanded={newCat} onClick={() => setNewCat(!newCat)}>
            <IconPlus size={16} /> Новая
          </button>
        </div>
        {newCat && (
          <div className="card pad" style={{ marginTop: 6 }}>
            <CategoryEditor
              saveLabel="Создать категорию"
              onCancel={() => setNewCat(false)}
              onSave={(c) => {
                const r = addCategory(getState(), c);
                commit(r.state);
                setCategoryId(r.id);
                setNewCat(false);
              }}
            />
          </div>
        )}
      </div>

      <div className="seg" role="group" aria-label="Тип задания">
        <button type="button" aria-pressed={kind === 'once'} onClick={() => setKind('once')}>
          Разовое
        </button>
        <button type="button" aria-pressed={kind === 'recurring'} onClick={() => setKind('recurring')}>
          Регулярное
        </button>
      </div>

      {kind === 'once' ? (
        <div className="field">
          <span className="label">Когда</span>
          <div className="chips">
            <button type="button" className="chip" aria-pressed={!picking && date === today} onClick={() => { setPicking(false); setDate(today); }}>
              Сегодня
            </button>
            <button type="button" className="chip" aria-pressed={!picking && date === tomorrow} onClick={() => { setPicking(false); setDate(tomorrow); }}>
              Завтра
            </button>
            <button type="button" className="chip" aria-pressed={picking} onClick={() => { setPicking(true); setDate(date && date > tomorrow ? date : addDays(today, 2)); }}>
              Выбрать день
            </button>
            <button type="button" className="chip" aria-pressed={!picking && date === null} onClick={() => { setPicking(false); setDate(null); }}>
              Без даты
            </button>
          </div>
          {picking && (
            <input
              className="input"
              type="date"
              aria-label="Дата"
              min={today}
              value={date ?? ''}
              onChange={(e) => setDate(e.target.value || null)}
            />
          )}
          <span className="hint">Если не сделать и не перенести до конца дня — штраф половина награды, задание переедет на завтра.</span>
        </div>
      ) : (
        <div className="field">
          <span className="label">Как часто</span>
          <div className="chips">
            {SCHED_LABELS.map(([k, l]) => (
              <button key={k} type="button" className="chip" aria-pressed={schedType === k} onClick={() => setSchedType(k)}>
                {l}
              </button>
            ))}
          </div>
          {schedType === 'weekdays' && (
            <div className="weekdays" role="group" aria-label="Дни недели">
              {WEEKDAY_SHORT.map((d, i) => (
                <button
                  key={d}
                  type="button"
                  className="chip"
                  aria-pressed={days.includes(i + 1)}
                  onClick={() => setDays(days.includes(i + 1) ? days.filter((x) => x !== i + 1) : [...days, i + 1])}
                >
                  {d}
                </button>
              ))}
            </div>
          )}
          {schedType === 'perWeek' && (
            <div className="row between">
              <span className="hint">Сколько раз в неделю</span>
              <Stepper label="Раз в неделю" value={perWeek} min={1} max={6} onChange={setPerWeek} />
            </div>
          )}
          {schedType === 'everyNDays' && (
            <div className="row between">
              <span className="hint">Раз в сколько дней (от сегодня)</span>
              <Stepper label="Дней" value={everyN} min={2} max={60} onChange={setEveryN} />
            </div>
          )}
          {schedType === 'monthly' && (
            <div className="row between">
              <span className="hint">Какого числа</span>
              <Stepper label="Число месяца" value={monthDay} min={1} max={31} onChange={setMonthDay} />
            </div>
          )}
          <span className="hint">Пропуск — штраф половина награды. Серия подряд даёт бонус: 4 → +5%, 7 → +10%, 14 → +15%, 21 → +20%.</span>
        </div>
      )}

      <div className="card pad stack">
        <div className="switch-row">
          <label htmlFor="t-multi" style={{ fontWeight: 800 }}>
            Несколько раз в день
          </label>
          <span className="switch">
            <input id="t-multi" type="checkbox" checked={multi} onChange={(e) => setMulti(e.target.checked)} />
            <span />
          </span>
        </div>
        {multi && (
          <div className="row between">
            <span className="hint">Засчитается, когда отметишь все разы</span>
            <Stepper label="Раз в день" value={times} min={2} max={20} onChange={setTimes} />
          </div>
        )}
      </div>

      {error && <div className="error" role="alert">{error}</div>}
      <button type="button" className="btn block" onClick={save}>
        {task ? 'Сохранить' : 'Добавить задание'}
      </button>
    </Sheet>
  );
}
