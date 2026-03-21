import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import type {
  AiExecutionResponse,
  AiOperationDetail,
  AiPlanResponse,
  AiUndoResponse,
  AuthResponse,
  List,
  Task,
  MyDayPlanningContext,
} from '../lib/types';
import { useAuthStore } from '../stores/auth';
import { useUiStore } from '../stores/ui';

export function useLists() {
  return useQuery({
    queryKey: ['lists'],
    queryFn: () => api.get<List[]>('/lists'),
  });
}

export function useTasks() {
  const activeListId = useUiStore((s) => s.activeListId);
  const search = useUiStore((s) => s.searchQuery);
  const status = useUiStore((s) => s.filterStatus);
  const priority = useUiStore((s) => s.filterPriority);
  const urgency = useUiStore((s) => s.filterUrgency);

  const params = new URLSearchParams();
  if (activeListId === '__no_list__') params.set('noList', 'true');
  else if (activeListId === '__my_day__') params.set('dueToday', 'true');
  else if (activeListId) params.set('listId', activeListId);
  if (search) params.set('search', search);
  if (status) params.set('status', status);
  if (priority) params.set('priority', priority);
  if (urgency) params.set('urgency', urgency);

  const qs = params.toString();
  return useQuery({
    queryKey: ['tasks', activeListId, search, status, priority, urgency],
    queryFn: () => api.get<Task[]>(`/tasks${qs ? `?${qs}` : ''}`),
  });
}

export function useAllTasks() {
  return useQuery({
    queryKey: ['tasks', 'all'],
    queryFn: () => api.get<Task[]>('/tasks'),
  });
}

export function useCreateTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { title: string; listId?: string; priority?: string; deadline?: string }) =>
      api.post<Task>('/tasks', data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tasks'] });
      qc.invalidateQueries({ queryKey: ['lists'] });
    },
  });
}

export function useUpdateTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string; title?: string; status?: string; priority?: string; deadline?: string | null; listId?: string | null; description?: string }) =>
      api.patch<Task>(`/tasks/${id}`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tasks'] });
      qc.invalidateQueries({ queryKey: ['lists'] });
    },
  });
}

export function useDeleteTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete<Task>(`/tasks/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tasks'] });
      qc.invalidateQueries({ queryKey: ['lists'] });
    },
  });
}

export function useCreateSubtask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ taskId, title }: { taskId: string; title: string }) =>
      api.post(`/tasks/${taskId}/subtasks`, { title }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tasks'] }),
  });
}

export function useUpdateSubtask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ taskId, id, ...data }: { taskId: string; id: string; title?: string; status?: string }) =>
      api.patch(`/tasks/${taskId}/subtasks/${id}`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tasks'] }),
  });
}

export function useCreateList() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (name: string) => api.post<List>('/lists', { name }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['lists'] }),
  });
}

export function useUpdateList() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) =>
      api.patch<List>(`/lists/${id}`, { name }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['lists'] });
      qc.invalidateQueries({ queryKey: ['tasks'] });
    },
  });
}

export function useDeleteList() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/lists/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['lists'] });
      qc.invalidateQueries({ queryKey: ['tasks'] });
    },
  });
}

export function useReorderLists() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (orderedIds: string[]) =>
      api.patch<List[]>('/lists/reorder', { orderedIds }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['lists'] }),
  });
}

export function useDeleteSubtask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ taskId, id }: { taskId: string; id: string }) =>
      api.delete(`/tasks/${taskId}/subtasks/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tasks'] }),
  });
}

interface UserPreferences {
  dayColors: [string, string] | null;
  dayEnergy: number;
  dayMood: number;
  dayWishes: string[] | null;
  isMyDaySaved: boolean;
}

export function usePreferences() {
  return useQuery({
    queryKey: ['preferences'],
    queryFn: () => api.get<UserPreferences>('/users/me/preferences'),
  });
}

export function useUpdatePreferences() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<UserPreferences>) =>
      api.patch<UserPreferences>('/users/me/preferences', data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['preferences'] }),
  });
}

export function useCreateAiPlan() {
  return useMutation({
    mutationFn: (data: {
      prompt: string;
      scope?: 'GLOBAL' | 'TASK';
      taskId?: string;
      context?: {
        listIds?: string[];
        taskIds?: string[];
        search?: string;
        limit?: number;
        myDay?: MyDayPlanningContext;
      };
    }) => api.post<AiPlanResponse>('/ai/plan', data),
  });
}

export function useReviseAiPlan() {
  return useMutation({
    mutationFn: ({
      operationId,
      revisionPrompt,
      operations,
      metadata,
    }: {
      operationId: string;
      revisionPrompt: string;
      operations?: AiPlanResponse['operations'];
      metadata?: Record<string, unknown>;
    }) =>
      api.post<AiPlanResponse>(`/ai/operations/${operationId}/revise`, {
        revisionPrompt,
        operations,
        metadata,
      }),
  });
}

export function useConfirmAiOperation() {
  return useMutation({
    mutationFn: ({ operationId, note }: { operationId: string; note?: string }) =>
      api.post<{ operationId: string; status: string; approvedAt: string | null }>(`/ai/operations/${operationId}/confirm`, note ? { note } : undefined),
  });
}

export function useExecuteAiOperation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (operationId: string) => api.post<AiExecutionResponse>(`/ai/operations/${operationId}/execute`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tasks'] });
      qc.invalidateQueries({ queryKey: ['lists'] });
    },
  });
}

export function useUndoAiOperation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ operationId, reason }: { operationId: string; reason?: string }) =>
      api.post<AiUndoResponse>(`/ai/operations/${operationId}/undo`, reason ? { reason } : undefined),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tasks'] });
      qc.invalidateQueries({ queryKey: ['lists'] });
    },
  });
}

export function useAiOperation(operationId: string | null) {
  return useQuery({
    queryKey: ['ai-operation', operationId],
    queryFn: () => api.get<AiOperationDetail>(`/ai/operations/${operationId}`),
    enabled: Boolean(operationId),
  });
}

export function useLogin() {
  return useMutation({
    mutationFn: (data: { email: string; password: string }) =>
      api.post<AuthResponse>('/auth/login', data),
    onSuccess: (data) => {
      useAuthStore.getState().setAuth(data.user, data.accessToken, data.refreshToken);
    },
  });
}

export function useRegister() {
  return useMutation({
    mutationFn: (data: { email: string; password: string; displayName?: string }) =>
      api.post<AuthResponse>('/auth/register', data),
    onSuccess: (data) => {
      useAuthStore.getState().setAuth(data.user, data.accessToken, data.refreshToken);
    },
  });
}
