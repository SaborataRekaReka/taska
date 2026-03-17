import type { Task } from './types';

export type SmartListId = 'urgent' | 'overdue' | 'high-priority';

export interface SmartListConfig {
  id: SmartListId;
  label: string;
}

const DAY_MS = 24 * 60 * 60 * 1000;

const SMART_LISTS: SmartListConfig[] = [
  { id: 'urgent', label: 'Срочные' },
  { id: 'overdue', label: 'Просрочено' },
  { id: 'high-priority', label: 'Высокий приоритет' },
];

function toTimestamp(deadline: string | null): number | null {
  if (!deadline) {
    return null;
  }

  const parsed = new Date(deadline).getTime();

  return Number.isNaN(parsed) ? null : parsed;
}

function isOpenTask(task: Task): boolean {
  return task.status !== 'DONE';
}

export function isTaskInSmartList(task: Task, listId: SmartListId): boolean {
  if (!isOpenTask(task)) {
    return false;
  }

  const now = Date.now();
  const deadlineTs = toTimestamp(task.deadline);

  if (listId === 'overdue') {
    return deadlineTs !== null && deadlineTs < now;
  }

  if (listId === 'high-priority') {
    return task.priority === 'HIGH' || task.priority === 'CRITICAL';
  }

  const isOverdue = deadlineTs !== null && deadlineTs < now;
  const isDueSoon = deadlineTs !== null && deadlineTs - now <= DAY_MS;
  const isCritical = task.priority === 'CRITICAL';

  return isOverdue || isDueSoon || isCritical;
}

export function getSmartListCount(tasks: Task[], listId: SmartListId): number {
  return tasks.filter((task) => isTaskInSmartList(task, listId)).length;
}

export { SMART_LISTS };
