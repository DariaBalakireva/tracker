import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import {
  completeTask,
  isDone,
  openGoals,
  previewReward,
  reschedule,
  setTaps,
  tapsOf,
  undoCompletion,
} from '../logic/actions';
import { addDays } from '../logic/date';
import { ALL_DONE_PHRASES, pick, praiseFor } from '../logic/phrases';
import { completionFor, completionsOn, tasksForDay } from '../logic/selectors';
import { plural } from '../logic/schedule';
import type { ID, Task } from '../logic/types';
import { commit, getState, showPraise, useApp } from '../store';
import { Confirm, Photo, rub, Sheet } from './bits';
import { IconWallet } from './icons';
import { TaskDetail } from './TaskDetail';
import { TaskForm, type TaskPreset } from './TaskForm';

interface Flow {
  today: string;
  /** Нажатие на кружок задания. */
  toggle: (task: Task) => void;
  /** Ещё одна отметка (для «несколько раз в день»). */
  tap: (task: Task) => void;
  untap: (task: Task) => void;
  askUndo: (task: Task) => void;
  openDetail: (id: ID) => void;
  openEdit: (task: Task | null, preset?: TaskPreset) => void;
  openReschedule: (task: Task) => void;
}

const Ctx = createContext<Flow | null>(null);
export const useFlow = () => useContext(Ctx)!;

export function FlowProvider({ today, children }: { today: string; children: ReactNode }) {
  const [picker, setPicker] = useState<Task | null>(null);
  const [undoFor, setUndoFor] = useState<Task | null>(null);
  const [detail, setDetail] = useState<ID | null>(null);
  const [edit, setEdit] = useState<{ task: Task | null; preset?: TaskPreset } | null>(null);
  const [resched, setResched] = useState<Task | null>(null);

  const finish = useCallback(
    (task: Task, target: ID | null) => {
      const r = completeTask(getState(), task.id, today, target, new Date().toISOString());
      setPicker(null);
      if (!r) return;
      commit(r.state);
      const { alloc } = r.completion;
      const goal = target ? r.state.goals.find((g) => g.id === target) : undefined;
      const extra: string[] = [];
      if (alloc.debt > 0) extra.push(`${rub(alloc.debt)} ушло на погашение долга`);
      if (goal && alloc.toGoal > 0 && alloc.toWallet > 0)
        extra.push(`В цель поместилось ${rub(alloc.toGoal)}, остальные ${rub(alloc.toWallet)} — в кошелёк`);
      if (r.reached) extra.push(`🎉 Цель «${r.reached.name}» накоплена! Можно идти за покупкой`);
      const list = tasksForDay(r.state, today);
      const allDone = list.length > 1 && list.every((t) => isDone(r.state, t, today));
      if (allDone) {
        const cs = completionsOn(r.state, today);
        const earned = cs.reduce((a, c) => a + c.amount, 0);
        extra.push(`${pick(ALL_DONE_PHRASES)} Сегодня: ${cs.length} ${plural(cs.length, 'задание', 'задания', 'заданий')}, +${rub(earned)}`);
      }
      showPraise({
        title: task.title,
        phrase: praiseFor(task.title, r.state.phrases),
        amount: r.completion.amount,
        bonusPct: r.completion.bonusPct,
        target: goal ? `«${goal.name}»` : 'в кошелёк',
        extra,
        big: !!r.reached || allDone,
      });
    },
    [today],
  );

  const complete = useCallback(
    (task: Task) => {
      if (openGoals(getState()).length === 0) finish(task, null);
      else setPicker(task);
    },
    [finish],
  );

  const tap = useCallback(
    (task: Task) => {
      const s = getState();
      if (isDone(s, task, today)) return;
      const n = tapsOf(s, task.id, today);
      if (n + 1 >= task.timesPerDay) complete(task);
      else {
        commit(setTaps(s, task.id, today, n + 1));
        navigator.vibrate?.(10);
      }
    },
    [complete, today],
  );

  const untap = useCallback(
    (task: Task) => {
      const s = getState();
      commit(setTaps(s, task.id, today, tapsOf(s, task.id, today) - 1));
    },
    [today],
  );

  const toggle = useCallback(
    (task: Task) => {
      if (isDone(getState(), task, today)) setUndoFor(task);
      else if (task.timesPerDay > 1) tap(task);
      else complete(task);
    },
    [complete, tap, today],
  );

  const value = useMemo<Flow>(
    () => ({
      today,
      toggle,
      tap,
      untap,
      askUndo: setUndoFor,
      openDetail: setDetail,
      openEdit: (task, preset) => setEdit({ task, preset }),
      openReschedule: setResched,
    }),
    [today, toggle, tap, untap],
  );

  return (
    <Ctx.Provider value={value}>
      {children}
      {detail && <TaskDetail id={detail} onClose={() => setDetail(null)} />}
      {edit && <TaskForm task={edit.task} preset={edit.preset} onClose={() => setEdit(null)} />}
      {picker && <GoalPicker task={picker} today={today} onPick={(t) => finish(picker, t)} onClose={() => setPicker(null)} />}
      {resched && <Reschedule task={resched} today={today} onClose={() => setResched(null)} />}
      {undoFor && (
        <UndoConfirm task={undoFor} today={today} onClose={() => setUndoFor(null)} />
      )}
    </Ctx.Provider>
  );
}

function UndoConfirm({ task, today, onClose }: { task: Task; today: string; onClose: () => void }) {
  const s = useApp();
  const c = completionFor(s, task, today);
  if (!c) return null;
  return (
    <Confirm
      title="Отменить выполнение?"
      text={`«${task.title}» снова станет невыполненным, а ${rub(c.amount)} вернутся обратно.`}
      yes="Отменить выполнение"
      danger
      onYes={() => commit(undoCompletion(getState(), c.id))}
      onClose={onClose}
    />
  );
}

/** Выбор, в какую цель положить награду. */
function GoalPicker({
  task,
  today,
  onPick,
  onClose,
}: {
  task: Task;
  today: string;
  onPick: (target: ID | null) => void;
  onClose: () => void;
}) {
  const s = useApp();
  const { amount, pct } = previewReward(s, task, today);
  const debt = s.wallet < 0 ? Math.min(amount, -s.wallet) : 0;
  const goals = [...openGoals(s)].sort((a, b) => (a.id === s.lastTarget ? -1 : b.id === s.lastTarget ? 1 : 0));
  return (
    <Sheet title="Куда положить?" onClose={onClose}>
      <div className="stack" style={{ alignItems: 'center', gap: 2 }}>
        <div className="praise-amount">+{rub(amount)}</div>
        {pct > 0 && <div className="price-bonus">с бонусом +{pct}% за серию</div>}
      </div>
      {debt > 0 && <div className="hint">Сначала {rub(debt)} пойдут на погашение долга.</div>}
      <div className="stack">
        {goals.map((g) => {
          const room = g.price - g.saved;
          return (
            <button key={g.id} className="option" aria-pressed={g.id === s.lastTarget} onClick={() => onPick(g.id)}>
              <div className="thumb sm">
                <Photo id={g.photoId} iconSize={22} />
              </div>
              <div className="stack" style={{ gap: 2, flex: 1, minWidth: 0 }}>
                <span className="option-title">{g.name}</span>
                <span className="option-sub">
                  {rub(g.saved)} из {rub(g.price)}
                  {room < amount - debt ? ` · поместится ${rub(room)}` : ''}
                </span>
              </div>
              {g.id === s.lastTarget && <span className="badge violet">как в прошлый раз</span>}
            </button>
          );
        })}
        <button className="option" aria-pressed={s.lastTarget === null} onClick={() => onPick(null)}>
          <div className="thumb sm" style={{ background: 'var(--v-tint)', color: 'var(--v-ink)' }}>
            <IconWallet size={24} />
          </div>
          <div className="stack" style={{ gap: 2, flex: 1 }}>
            <span className="option-title">В кошелёк</span>
            <span className="option-sub">Разложить потом</span>
          </div>
        </button>
      </div>
    </Sheet>
  );
}

/** Перенос разового задания. */
function Reschedule({ task, today, onClose }: { task: Task; today: string; onClose: () => void }) {
  const [custom, setCustom] = useState(task.date && task.date > today ? task.date : addDays(today, 1));
  const set = (d: string | null) => {
    commit(reschedule(getState(), task.id, d));
    onClose();
  };
  return (
    <Sheet title="Перенести задание" onClose={onClose}>
      <p className="hint" style={{ margin: 0 }}>
        «{task.title}». Если перенести до конца дня, штрафа не будет.
      </p>
      <div className="stack">
        {task.date !== today && (
          <button className="btn block soft" onClick={() => set(today)}>
            На сегодня
          </button>
        )}
        <button className="btn block soft" onClick={() => set(addDays(today, 1))}>
          На завтра
        </button>
        <div className="field">
          <label className="label" htmlFor="resched-date">
            Другой день
          </label>
          <div className="row">
            <input
              id="resched-date"
              className="input"
              type="date"
              min={today}
              value={custom}
              onChange={(e) => setCustom(e.target.value)}
              style={{ flex: 1 }}
            />
            <button className="btn small" disabled={!custom || custom < today} onClick={() => set(custom)}>
              Ок
            </button>
          </div>
        </div>
        <button className="btn block ghost" onClick={() => set(null)}>
          Без даты
        </button>
      </div>
    </Sheet>
  );
}
