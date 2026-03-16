import type { DayProfile, DayTask, MoodLevel } from './types';

export const ASSISTANT_WISH_PRESETS = [
  'Одно большое дело',
  'Ничего сложного',
  'Только срочное',
  'Побольше поработать',
  'Часто откладываемые',
] as const;

const STRATEGIC_TAG_FRAGMENTS = [
  'strategy',
  'strategic',
  'roadmap',
  'planning',
  'architecture',
  'okr',
  'growth',
  'стратег',
  'архитект',
  'план',
  'важн',
];

const PRIORITY_SCORE: Record<DayTask['priority'], number> = {
  low: 1,
  medium: 2,
  high: 3,
};

const EFFORT_SCORE: Record<NonNullable<DayTask['effort']>, number> = {
  low: 28,
  medium: 56,
  high: 84,
};

const ENERGY_MAX = 20;

interface DueSignals {
  isOverdue: boolean;
  dueToday: boolean;
  dueTomorrow: boolean;
}

function clamp(value: number, min = 0, max = 100): number {
  return Math.max(min, Math.min(max, value));
}

function toStartOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function safeDate(value?: string | Date | null): Date | null {
  if (!value) {
    return null;
  }
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  return date;
}

function dueSignals(task: DayTask, now: Date): DueSignals {
  const today = toStartOfDay(now);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const dayAfterTomorrow = new Date(tomorrow);
  dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 1);

  const dueDate = safeDate(task.dueDate);
  const explicitOverdue = task.isOverdue === true;

  if (!dueDate) {
    return { isOverdue: explicitOverdue, dueToday: false, dueTomorrow: false };
  }

  return {
    isOverdue: explicitOverdue || dueDate < today,
    dueToday: dueDate >= today && dueDate < tomorrow,
    dueTomorrow: dueDate >= tomorrow && dueDate < dayAfterTomorrow,
  };
}

function hasStrategicTag(task: DayTask): boolean {
  const normalized = (task.tags ?? []).map((tag) => tag.toLowerCase());
  return normalized.some((tag) => STRATEGIC_TAG_FRAGMENTS.some((fragment) => tag.includes(fragment)));
}

function getDayLabel(metrics: {
  importance: number;
  urgency: number;
  duration: number;
  load: number;
  smallTasksRatio: number;
}): string {
  const { importance, urgency, duration, load, smallTasksRatio } = metrics;

  if (urgency >= 72 && load >= 68) {
    return 'Напряжённый дедлайновый день';
  }

  if (importance >= 70 && urgency >= 40 && urgency <= 70) {
    return 'Стратегический день';
  }

  if (load <= 42 && importance >= 45) {
    return 'Спокойный и сфокусированный день';
  }

  if (duration >= 72 && smallTasksRatio >= 0.45) {
    return 'День закрытия хвостов';
  }

  return 'Сбалансированный день';
}

export function computeDayProfile(
  tasks: DayTask[],
  mood: MoodLevel,
  energy: number,
  wishes: string[],
  now = new Date(),
): DayProfile {
  const taskCount = Math.max(tasks.length, 1);
  const wishSet = new Set(wishes);

  const highPriorityCount = tasks.filter((task) => task.priority === 'high').length;
  const importantCount = tasks.filter((task) => task.isImportant).length;
  const strategicCount = tasks.filter(hasStrategicTag).length;
  const totalPriorityScore = tasks.reduce((sum, task) => sum + PRIORITY_SCORE[task.priority], 0);

  const dueMeta = tasks.map((task) => dueSignals(task, now));
  const overdueCount = dueMeta.filter((meta) => meta.isOverdue).length;
  const dueTodayCount = dueMeta.filter((meta) => meta.dueToday).length;
  const dueTomorrowCount = dueMeta.filter((meta) => meta.dueTomorrow).length;

  const estimatedMinutes = tasks.reduce((sum, task) => sum + (task.estimatedMinutes ?? 0), 0);
  const smallTasksCount = tasks.filter((task) => (task.estimatedMinutes ?? 45) <= 30).length;

  const effortAverage = tasks.length
    ? tasks.reduce((sum, task) => sum + EFFORT_SCORE[task.effort ?? 'medium'], 0) / tasks.length
    : 40;

  const hardTasksCount = tasks.filter((task) => task.effort === 'high' || task.priority === 'high').length;
  const energyNormalized = clamp((energy / ENERGY_MAX) * 100);
  const moodShift = mood - 3;

  let importance =
    22
    + (totalPriorityScore / (taskCount * 3)) * 42
    + (importantCount / taskCount) * 24
    + (strategicCount / taskCount) * 18;

  let urgency =
    8
    + (overdueCount / taskCount) * 58
    + (dueTodayCount / taskCount) * 34
    + (dueTomorrowCount / taskCount) * 22
    + (highPriorityCount / taskCount) * 10;

  const minutesScore = clamp((estimatedMinutes / 540) * 100);
  const countScore = clamp((tasks.length / 10) * 100);
  let duration = minutesScore * 0.72 + countScore * 0.28;

  let load =
    effortAverage * 0.44
    + (hardTasksCount / taskCount) * 100 * 0.24
    + duration * 0.2
    + urgency * 0.12;

  // Mood and energy shift the perceived day profile.
  load += (55 - energyNormalized) * 0.33;
  load -= moodShift * 4.5;
  duration += moodShift * 3.2;
  importance += moodShift * 2.1;
  urgency -= moodShift * 1.6;

  if (wishSet.has('Одно большое дело')) {
    importance += 10;
    duration += 16;
    load += 4;
    urgency -= 6;
  }

  if (wishSet.has('Ничего сложного')) {
    load -= 18;
    duration -= 6;
  }

  if (wishSet.has('Только срочное')) {
    urgency += 22;
    duration -= 4;
  }

  if (wishSet.has('Побольше поработать')) {
    duration += 20;
    load += 14;
  }

  if (wishSet.has('Часто откладываемые')) {
    importance += 14;
    load += 10;
  }

  importance = Math.round(clamp(importance));
  urgency = Math.round(clamp(urgency));
  duration = Math.round(clamp(duration));
  load = Math.round(clamp(load));

  const dayLabel = getDayLabel({
    importance,
    urgency,
    duration,
    load,
    smallTasksRatio: tasks.length ? smallTasksCount / tasks.length : 0,
  });

  return { importance, urgency, duration, load, dayLabel };
}
