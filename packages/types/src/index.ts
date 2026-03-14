export type TaskPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export type TaskStatus = 'TODO' | 'IN_PROGRESS' | 'DONE';

export interface TaskDto {
  id: string;
  title: string;
  description: string | null;
  priority: TaskPriority;
  deadline: string | null;
  status: TaskStatus;
  listId: string | null;
}
