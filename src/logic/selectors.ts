import { buildIndex, buildOnceIndex, showOnDay } from './schedule';
import type { AppState, Completion, DayKey, Task } from './types';

export function tasksForDay(s: AppState, day: DayKey): Task[] {
  const idx = buildIndex(s.completions);
  const onceIdx = buildOnceIndex(s.completions);
  return s.tasks.filter((t) => showOnDay(t, day, idx, onceIdx));
}

export function completionFor(s: AppState, task: Task, day: DayKey): Completion | undefined {
  if (task.kind === 'once') return s.completions.find((c) => c.taskId === task.id);
  return s.completions.find((c) => c.taskId === task.id && c.day === day);
}

export function completionsOn(s: AppState, day: DayKey): Completion[] {
  return s.completions.filter((c) => c.day === day);
}
