export type TaskPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type TaskStatus = 'TODO' | 'IN_PROGRESS' | 'DONE';

export interface User {
  id: string;
  email: string;
  displayName: string | null;
  provider: string;
  createdAt: string;
}

export interface AuthResponse {
  user: { id: string; email: string; displayName: string | null };
  accessToken: string;
  refreshToken: string;
}

export interface List {
  id: string;
  userId: string;
  name: string;
  isDefault: boolean;
  createdAt: string;
  _count: { tasks: number };
}

export interface Subtask {
  id: string;
  taskId: string;
  title: string;
  status: TaskStatus;
  createdAt: string;
}

export interface Task {
  id: string;
  title: string;
  description: string | null;
  priority: TaskPriority;
  deadline: string | null;
  status: TaskStatus;
  listId: string | null;
  list: { id: string; name: string } | null;
  subtasks: Subtask[];
  createdAt: string;
}
