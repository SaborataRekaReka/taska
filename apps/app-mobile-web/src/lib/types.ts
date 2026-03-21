export type TaskPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type TaskStatus = 'TODO' | 'IN_PROGRESS' | 'DONE';
export type AuthProvider = 'LOCAL' | 'GOOGLE';
export type AiScope = 'GLOBAL' | 'TASK';
export type AiOperationStatus = 'PLANNED' | 'CONFIRMED' | 'EXECUTED' | 'UNDONE' | 'FAILED';
export type HistoryEntityType = 'LIST' | 'TASK' | 'SUBTASK' | 'AI_OPERATION';
export type HistoryActionType = 'CREATED' | 'UPDATED' | 'DELETED' | 'RESTORED' | 'AI_EXECUTED' | 'AI_UNDONE';
export type AiOperationType =
  | 'CREATE_LIST'
  | 'UPDATE_LIST'
  | 'CREATE_TASK'
  | 'UPDATE_TASK'
  | 'DELETE_TASK'
  | 'CREATE_SUBTASK'
  | 'UPDATE_SUBTASK'
  | 'DELETE_SUBTASK';


export type MyDayIntent = 'LIGHT' | 'BALANCED' | 'PROGRESS' | 'FOCUS' | 'CATCH_UP';
export type MyDayFocusCapacity = 'LOW' | 'MEDIUM' | 'HIGH';
export type MyDayStressLevel = 'LOW' | 'MEDIUM' | 'HIGH';
export type MyDayInteractionPreference = 'SOLO' | 'MIXED' | 'SOCIAL';

export interface MyDayPlanningContext {
  mood?: number;
  energyLevel?: number;
  wishes?: string[];
  timeBudgetMinutes?: number | null;
  dayIntent?: MyDayIntent | null;
  focusCapacity?: MyDayFocusCapacity | null;
  stressLevel?: MyDayStressLevel | null;
  interactionPreference?: MyDayInteractionPreference | null;
}

export interface User {
  id: string;
  email: string;
  displayName: string | null;
  provider: AuthProvider;
  avatarUrl: string | null;
  givenName: string | null;
  familyName: string | null;
  emailVerified: boolean;
  createdAt: string;
}

export interface AuthResponse {
  user: {
    id: string;
    email: string;
    displayName: string | null;
    provider: AuthProvider;
    avatarUrl: string | null;
    givenName: string | null;
    familyName: string | null;
    emailVerified: boolean;
  };
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

export interface AiTaskPatch {
  title?: string;
  description?: string;
  priority?: TaskPriority;
  status?: TaskStatus;
  deadline?: string | null;
  listId?: string | null;
}

export interface AiSubtaskPatch {
  title?: string;
  status?: TaskStatus;
}

export interface AiPlanOperation {
  type: AiOperationType;
  key: string;
  listId?: string;
  taskId?: string;
  subtaskId?: string;
  name?: string;
  task?: AiTaskPatch;
  subtask?: AiSubtaskPatch;
}

export interface AiPlanResponse {
  planKind?: 'GENERIC' | 'MY_DAY';
  plannerContext?: Record<string, unknown> | null;
  operationId: string;
  status: AiOperationStatus;
  scope: AiScope;
  taskId?: string | null;
  summary: string;
  assistantMessage: string;
  operations: AiPlanOperation[];
  warnings: string[];
  model?: string | null;
}

export interface AiExecutionResult {
  type: AiOperationType;
  key: string;
  entityType: 'LIST' | 'TASK' | 'SUBTASK' | 'AI_OPERATION';
  entityId: string;
  result: Record<string, unknown>;
}

export interface AiExecutionResponse {
  operationId: string;
  status: AiOperationStatus;
  executedAt: string | null;
  results: AiExecutionResult[];
}

export interface AiUndoResponse {
  operationId: string;
  status: AiOperationStatus;
  undoneAt: string | null;
  undoneCount: number;
}

export interface AiOperationDetail {
  operationId: string;
  scope: AiScope;
  taskId?: string | null;
  status: AiOperationStatus;
  prompt: string;
  model?: string | null;
  approvedAt?: string | null;
  executedAt?: string | null;
  undoneAt?: string | null;
  failedAt?: string | null;
  errorMessage?: string | null;
  plan: {
    version: 1;
    scope: AiScope;
    summary: string;
    assistantMessage: string;
    operations: AiPlanOperation[];
    warnings: string[];
    planKind?: 'GENERIC' | 'MY_DAY';
    plannerContext?: Record<string, unknown> | null;
  };
  executionPayload?: Record<string, unknown> | null;
  undoPayload?: Record<string, unknown> | null;
  createdAt: string;
}

export interface HistoryEvent {
  id: string;
  userId: string;
  entityType: HistoryEntityType;
  entityId: string;
  actionType: HistoryActionType;
  payload: Record<string, unknown>;
  createdAt: string;
}

export interface AiHealthStatus {
  module: string;
  status: string;
}

export interface AiOperationsListResponse {
  items: AiOperationDetail[];
  total: number;
  limit: number;
}

export interface AiRuntimeInfo {
  module: string;
  status: string;
  safeMode: boolean;
  planningModel: string;
  chatModel: string;
  capabilities: {
    plan: boolean;
    revise: boolean;
    confirm: boolean;
    execute: boolean;
    undo: boolean;
    listOperations: boolean;
    runtime: boolean;
    adminConfig: boolean;
    dryRun: boolean;
  };
  trustBoundary: {
    modelCanPropose: boolean;
    modelCanExecute: boolean;
  };
  timestamp: string;
}

export interface AiAdminConfig {
  id: string;
  userId: string;
  myDayAutoConfirm: boolean;
  myDayAutoExecute: boolean;
  myDayTaskLimit: number;
  blockDeleteOperations: boolean;
  requireUndoReason: boolean;
  operatorNotes: string | null;
  promptGuardrails: string | null;
  createdAt: string;
  updatedAt: string;
}
