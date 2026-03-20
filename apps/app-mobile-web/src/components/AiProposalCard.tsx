import { useEffect, useMemo, useState } from 'react';
import type {
  AiOperationStatus,
  AiPlanOperation,
  AiPlanResponse,
  Subtask,
  Task,
  TaskPriority,
  TaskStatus,
} from '../lib/types';
import { TaskCard } from './TaskCard';
import styles from './AiProposalCard.module.css';

type ProposalViewState = AiOperationStatus | 'DRAFT';

type ListOption = { id: string; name: string; isDefault?: boolean };

type TaskPatchUpdates = {
  title?: string;
  priority?: TaskPriority;
  status?: TaskStatus;
  deadline?: string | null;
  listId?: string | null;
};

interface TaskPreviewItem {
  previewKey: string;
  operationIndexes: number[];
  operationKeys: string[];
  isDeletePlanned: boolean;
  task: Task;
}

export interface AiProposalRevisionPayload {
  revisionPrompt: string;
  operations?: AiPlanOperation[];
  metadata?: Record<string, unknown>;
}

interface AiProposalCardProps {
  proposal: AiPlanResponse;
  status: ProposalViewState;
  busyLabel?: string | null;
  executionCount?: number;
  tasks?: Task[];
  availableLists?: ListOption[];
  onApprove: () => void;
  onRevise: (payload: AiProposalRevisionPayload) => void;
  onUndo?: () => void;
}

function formatOperationTitle(operation: AiPlanOperation): string {
  if (operation.type === 'CREATE_LIST') return `\u0421\u043e\u0437\u0434\u0430\u0442\u044c \u0441\u043f\u0438\u0441\u043e\u043a "${operation.name ?? '\u0411\u0435\u0437 \u043d\u0430\u0437\u0432\u0430\u043d\u0438\u044f'}"`;
  if (operation.type === 'UPDATE_LIST') return `\u041f\u0435\u0440\u0435\u0438\u043c\u0435\u043d\u043e\u0432\u0430\u0442\u044c \u0441\u043f\u0438\u0441\u043e\u043a \u0432 "${operation.name ?? '...'}"`;
  if (operation.type === 'DELETE_TASK') return '\u0423\u0434\u0430\u043b\u0438\u0442\u044c \u0437\u0430\u0434\u0430\u0447\u0443';
  if (operation.type === 'CREATE_SUBTASK') return `\u0414\u043e\u0431\u0430\u0432\u0438\u0442\u044c \u043f\u043e\u0434\u0437\u0430\u0434\u0430\u0447\u0443 "${operation.subtask?.title ?? '\u0411\u0435\u0437 \u043d\u0430\u0437\u0432\u0430\u043d\u0438\u044f'}"`;
  if (operation.type === 'UPDATE_SUBTASK') return `\u041e\u0431\u043d\u043e\u0432\u0438\u0442\u044c \u043f\u043e\u0434\u0437\u0430\u0434\u0430\u0447\u0443 ${operation.subtaskId ?? ''}`.trim();
  if (operation.type === 'DELETE_SUBTASK') return `\u0423\u0434\u0430\u043b\u0438\u0442\u044c \u043f\u043e\u0434\u0437\u0430\u0434\u0430\u0447\u0443 ${operation.subtaskId ?? ''}`.trim();
  if (operation.type === 'CREATE_TASK') return `\u0421\u043e\u0437\u0434\u0430\u0442\u044c \u0437\u0430\u0434\u0430\u0447\u0443 "${operation.task?.title ?? '\u0411\u0435\u0437 \u043d\u0430\u0437\u0432\u0430\u043d\u0438\u044f'}"`;
  return `\u041e\u0431\u043d\u043e\u0432\u0438\u0442\u044c \u0437\u0430\u0434\u0430\u0447\u0443 ${operation.taskId ?? ''}`.trim();
}

function buildTaskPreview(
  operation: AiPlanOperation,
  tasksById: Map<string, Task>,
  listById: Map<string, string>,
): Task {
  const fallbackCreatedAt = '1970-01-01T00:00:00.000Z';
  const sourceTask = operation.taskId ? tasksById.get(operation.taskId) : undefined;
  const taskPatch = operation.task ?? {};
  const resolvedListId = taskPatch.listId !== undefined
    ? taskPatch.listId ?? null
    : sourceTask?.listId ?? null;

  const resolvedList = resolvedListId
    ? sourceTask?.list && sourceTask.list.id === resolvedListId
      ? sourceTask.list
      : listById.has(resolvedListId)
        ? { id: resolvedListId, name: listById.get(resolvedListId)! }
        : null
    : null;

  const fallbackTitle = operation.type === 'CREATE_TASK'
    ? '\u041d\u043e\u0432\u0430\u044f \u0437\u0430\u0434\u0430\u0447\u0430'
    : sourceTask?.title ?? '\u0417\u0430\u0434\u0430\u0447\u0430 (\u0438\u0437\u043c\u0435\u043d\u0435\u043d\u0438\u0435 \u0432 \u043f\u043b\u0430\u043d\u0435)';

  return {
    id: operation.taskId ?? `proposal-${operation.key}`,
    title: taskPatch.title ?? fallbackTitle,
    description: taskPatch.description ?? sourceTask?.description ?? null,
    priority: taskPatch.priority ?? sourceTask?.priority ?? 'MEDIUM',
    deadline: taskPatch.deadline ?? sourceTask?.deadline ?? null,
    status: taskPatch.status ?? sourceTask?.status ?? 'TODO',
    listId: resolvedListId,
    list: resolvedList,
    subtasks: [],
    createdAt: sourceTask?.createdAt ?? fallbackCreatedAt,
  };
}

function buildTaskPreviewFromTaskId(
  taskId: string,
  tasksById: Map<string, Task>,
  listById: Map<string, string>,
): Task {
  const sourceTask = tasksById.get(taskId);
  const fallbackCreatedAt = '1970-01-01T00:00:00.000Z';
  const listId = sourceTask?.listId ?? null;
  const list = listId
    ? sourceTask?.list && sourceTask.list.id === listId
      ? sourceTask.list
      : listById.has(listId)
        ? { id: listId, name: listById.get(listId)! }
        : null
    : null;

  return {
    id: sourceTask?.id ?? taskId,
    title: sourceTask?.title ?? '\u0417\u0430\u0434\u0430\u0447\u0430 (\u043d\u0435 \u043d\u0430\u0439\u0434\u0435\u043d\u0430 \u0432 \u043a\u043e\u043d\u0442\u0435\u043a\u0441\u0442\u0435)',
    description: sourceTask?.description ?? null,
    priority: sourceTask?.priority ?? 'MEDIUM',
    deadline: sourceTask?.deadline ?? null,
    status: sourceTask?.status ?? 'TODO',
    listId,
    list,
    subtasks: (sourceTask?.subtasks ?? []).map((subtask) => ({ ...subtask })),
    createdAt: sourceTask?.createdAt ?? fallbackCreatedAt,
  };
}

function resolveSubtaskPreviewId(operation: AiPlanOperation): string {
  return operation.subtaskId ?? `proposal-subtask-${operation.key}`;
}

function applyTaskOperationPatch(
  task: Task,
  taskPatch: AiPlanOperation['task'],
  listById: Map<string, string>,
): Task {
  if (!taskPatch) {
    return task;
  }

  const nextTask: Task = {
    ...task,
    subtasks: task.subtasks.map((subtask) => ({ ...subtask })),
  };

  if (taskPatch.title !== undefined) nextTask.title = taskPatch.title;
  if (taskPatch.description !== undefined) nextTask.description = taskPatch.description ?? null;
  if (taskPatch.priority !== undefined) nextTask.priority = taskPatch.priority;
  if (taskPatch.status !== undefined) nextTask.status = taskPatch.status;
  if (taskPatch.deadline !== undefined) nextTask.deadline = taskPatch.deadline ?? null;
  if (taskPatch.listId !== undefined) {
    nextTask.listId = taskPatch.listId ?? null;
    if (taskPatch.listId) {
      if (nextTask.list?.id !== taskPatch.listId) {
        nextTask.list = listById.has(taskPatch.listId)
          ? { id: taskPatch.listId, name: listById.get(taskPatch.listId)! }
          : { id: taskPatch.listId, name: '\u0421\u043f\u0438\u0441\u043e\u043a' };
      }
    } else {
      nextTask.list = null;
    }
  }

  return nextTask;
}

function applySubtaskOperationPatch(task: Task, operation: AiPlanOperation): Task {
  const nextTask: Task = {
    ...task,
    subtasks: task.subtasks.map((subtask) => ({ ...subtask })),
  };

  if (operation.type === 'DELETE_SUBTASK') {
    if (!operation.subtaskId) {
      return nextTask;
    }

    nextTask.subtasks = nextTask.subtasks.filter((subtask) => subtask.id !== operation.subtaskId);
    return nextTask;
  }

  if (operation.type !== 'CREATE_SUBTASK' && operation.type !== 'UPDATE_SUBTASK') {
    return nextTask;
  }

  const subtaskId = resolveSubtaskPreviewId(operation);
  const patch = operation.subtask ?? {};
  const existingIndex = nextTask.subtasks.findIndex((subtask) => subtask.id === subtaskId);

  if (existingIndex >= 0) {
    const existing = nextTask.subtasks[existingIndex];
    nextTask.subtasks[existingIndex] = {
      ...existing,
      title: patch.title ?? existing.title,
      status: patch.status ?? existing.status,
    };
    return nextTask;
  }

  const fallbackTitle = patch.title ?? `\u041f\u043e\u0434\u0437\u0430\u0434\u0430\u0447\u0430 ${subtaskId.slice(0, 8)}`;
  const fallbackStatus = patch.status ?? 'TODO';
  const fallbackCreatedAt = '1970-01-01T00:00:00.000Z';
  const createdSubtask: Subtask = {
    id: subtaskId,
    taskId: nextTask.id,
    title: fallbackTitle,
    status: fallbackStatus,
    createdAt: fallbackCreatedAt,
  };

  nextTask.subtasks.push(createdSubtask);
  return nextTask;
}

export function AiProposalCard({
  proposal,
  status,
  busyLabel,
  executionCount,
  tasks,
  availableLists,
  onApprove,
  onRevise,
  onUndo,
}: AiProposalCardProps) {
  const [draftOperations, setDraftOperations] = useState<AiPlanOperation[]>(proposal.operations);
  const isBusy = Boolean(busyLabel);
  const isExecuted = status === 'EXECUTED';
  const isUndone = status === 'UNDONE';

  useEffect(() => {
    setDraftOperations(proposal.operations);
  }, [proposal.operationId, proposal.operations]);

  const tasksById = useMemo(
    () => new Map((tasks ?? []).map((task) => [task.id, task])),
    [tasks],
  );

  const listById = useMemo(
    () => new Map((availableLists ?? []).map((list) => [list.id, list.name])),
    [availableLists],
  );

  const taskPreviewItems = useMemo<TaskPreviewItem[]>(() => {
    const previewMap = new Map<string, TaskPreviewItem>();

    draftOperations.forEach((operation, index) => {
      const isTaskOperation = operation.type === 'CREATE_TASK'
        || operation.type === 'UPDATE_TASK'
        || operation.type === 'DELETE_TASK';
      const isSubtaskOperation = operation.type === 'CREATE_SUBTASK'
        || operation.type === 'UPDATE_SUBTASK'
        || operation.type === 'DELETE_SUBTASK';

      if (!isTaskOperation && !isSubtaskOperation) {
        return;
      }

      let previewKey: string | null = null;
      if (operation.type === 'CREATE_TASK') {
        previewKey = `create-task:${operation.key}`;
      } else if (operation.taskId) {
        previewKey = `task:${operation.taskId}`;
      }

      if (!previewKey) {
        return;
      }

      let previewItem = previewMap.get(previewKey);
      if (!previewItem) {
        const baseTask = operation.type === 'CREATE_TASK' || operation.type === 'UPDATE_TASK'
          ? buildTaskPreview(operation, tasksById, listById)
          : buildTaskPreviewFromTaskId(operation.taskId!, tasksById, listById);

        previewItem = {
          previewKey,
          operationIndexes: [],
          operationKeys: [],
          isDeletePlanned: false,
          task: baseTask,
        };
        previewMap.set(previewKey, previewItem);
      }

      previewItem.operationIndexes.push(index);
      previewItem.operationKeys.push(operation.key);

      if (operation.type === 'DELETE_TASK') {
        previewItem.isDeletePlanned = true;
      }

      if (isTaskOperation && operation.type !== 'DELETE_TASK') {
        previewItem.task = applyTaskOperationPatch(previewItem.task, operation.task, listById);
      }

      if (isSubtaskOperation) {
        previewItem.task = applySubtaskOperationPatch(previewItem.task, operation);
      }
    });

    return Array.from(previewMap.values());
  }, [draftOperations, listById, tasksById]);

  const taskPreviewKeys = useMemo(
    () => new Set(taskPreviewItems.flatMap((item) => item.operationKeys)),
    [taskPreviewItems],
  );

  const additionalOperations = useMemo(
    () => draftOperations.filter((operation) => !taskPreviewKeys.has(operation.key)),
    [draftOperations, taskPreviewKeys],
  );

  const hasStructuredEdits = useMemo(
    () => JSON.stringify(draftOperations) !== JSON.stringify(proposal.operations),
    [draftOperations, proposal.operations],
  );

  function applyTaskPatchToOperation(operation: AiPlanOperation, updates: TaskPatchUpdates): AiPlanOperation {
    if (operation.type !== 'CREATE_TASK' && operation.type !== 'UPDATE_TASK') {
      return operation;
    }

    const nextTaskPatch: NonNullable<AiPlanOperation['task']> = { ...(operation.task ?? {}) };

    if (updates.title !== undefined) nextTaskPatch.title = updates.title;
    if (updates.priority !== undefined) nextTaskPatch.priority = updates.priority;
    if (updates.status !== undefined) nextTaskPatch.status = updates.status;
    if (updates.listId !== undefined) nextTaskPatch.listId = updates.listId;
    if (updates.deadline !== undefined) nextTaskPatch.deadline = updates.deadline ?? null;

    return {
      ...operation,
      task: nextTaskPatch,
    };
  }

  function upsertTaskPatch(item: TaskPreviewItem, updates: TaskPatchUpdates): void {
    setDraftOperations((current) => {
      const existingIndex = item.operationKeys
        .map((operationKey) => current.findIndex((operation) => operation.key === operationKey))
        .find((index) => (
          index >= 0
          && (current[index].type === 'CREATE_TASK' || current[index].type === 'UPDATE_TASK')
        ));

      if (existingIndex !== undefined) {
        return current.map((operation, index) => (
          index === existingIndex ? applyTaskPatchToOperation(operation, updates) : operation
        ));
      }

      const targetTaskId = item.task.id;
      if (!targetTaskId || targetTaskId.startsWith('proposal-')) {
        return current;
      }

      const nextOperation: AiPlanOperation = {
        type: 'UPDATE_TASK',
        key: `ui_task_patch_${targetTaskId}_${Date.now()}`,
        taskId: targetTaskId,
        task: {
          ...(updates.title !== undefined ? { title: updates.title } : {}),
          ...(updates.priority !== undefined ? { priority: updates.priority } : {}),
          ...(updates.status !== undefined ? { status: updates.status } : {}),
          ...(updates.listId !== undefined ? { listId: updates.listId } : {}),
          ...(updates.deadline !== undefined ? { deadline: updates.deadline ?? null } : {}),
        },
      };

      return [...current, nextOperation];
    });
  }

  function updateSubtaskOperationPatch(item: TaskPreviewItem, subtaskId: string, patch: { title?: string; status?: TaskStatus }): void {
    setDraftOperations((current) => current.map((operation, index) => {
      if (!item.operationIndexes.includes(index)) {
        return operation;
      }

      if (operation.type !== 'CREATE_SUBTASK' && operation.type !== 'UPDATE_SUBTASK') {
        return operation;
      }

      if (resolveSubtaskPreviewId(operation) !== subtaskId) {
        return operation;
      }

      return {
        ...operation,
        subtask: {
          ...(operation.subtask ?? {}),
          ...(patch.title !== undefined ? { title: patch.title } : {}),
          ...(patch.status !== undefined ? { status: patch.status } : {}),
        },
      };
    }));
  }

  function submitRevision(): void {
    if (isBusy || isExecuted || isUndone) {
      return;
    }

    onRevise({
      revisionPrompt: hasStructuredEdits
        ? '\u041f\u0435\u0440\u0435\u0441\u043e\u0431\u0435\u0440\u0438 \u043f\u043b\u0430\u043d \u0441 \u0443\u0447\u0435\u0442\u043e\u043c \u043f\u0440\u0430\u0432\u043e\u043a \u0438\u0437 UI-\u043a\u0430\u0440\u0442\u043e\u0447\u0435\u043a \u0437\u0430\u0434\u0430\u0447.'
        : '\u041f\u0435\u0440\u0435\u0441\u043e\u0431\u0435\u0440\u0438 \u043f\u043b\u0430\u043d \u0438\u0437\u043c\u0435\u043d\u0435\u043d\u0438\u0439 \u0438 \u043f\u0440\u0435\u0434\u043b\u043e\u0436\u0438 \u0431\u043e\u043b\u0435\u0435 \u0442\u043e\u0447\u043d\u044b\u0439 \u0432\u0430\u0440\u0438\u0430\u043d\u0442.',
      operations: hasStructuredEdits ? draftOperations : undefined,
      metadata: hasStructuredEdits ? { source: 'ui_task_preview' } : { source: 'ai_rebuild' },
    });
  }

  const canApprove = status === 'PLANNED' && !isBusy;
  const canRebuild = !isBusy && !isExecuted && !isUndone;
  const showUndoInPrimarySlot = isExecuted && Boolean(onUndo);
  const primaryLabel = showUndoInPrimarySlot ? 'Undo' : '\u041f\u0440\u0438\u043d\u044f\u0442\u044c';
  const primaryDisabled = showUndoInPrimarySlot ? isBusy : !canApprove;

  return (
    <div className={styles.cleanBlock}>
      {taskPreviewItems.length > 0 ? (
        <div className={styles.previewList}>
          {taskPreviewItems.map((item) => (
            <div key={item.previewKey}>
              {item.isDeletePlanned ? (
                <div className={styles.deleteHint}>{'\u0411\u0443\u0434\u0435\u0442 \u0443\u0434\u0430\u043b\u0435\u043d\u0430'}</div>
              ) : null}
              <TaskCard
                task={item.task}
                isCompleted={item.task.status === 'DONE'}
                onToggleCompleted={(_, nextCompleted) => {
                  upsertTaskPatch(item, { status: nextCompleted ? 'DONE' : 'TODO' });
                }}
                onUpdateTitle={(_, nextTitle) => {
                  upsertTaskPatch(item, { title: nextTitle });
                }}
                onUpdateDeadline={(_, nextDeadline) => {
                  upsertTaskPatch(item, { deadline: nextDeadline });
                }}
                onUpdateList={(_, nextListId) => {
                  upsertTaskPatch(item, { listId: nextListId });
                }}
                onUpdatePriority={(_, nextPriority) => {
                  upsertTaskPatch(item, { priority: nextPriority });
                }}
                onCreateSubtask={() => undefined}
                onUpdateSubtask={(_, subtaskId, patch) => {
                  updateSubtaskOperationPatch(item, subtaskId, patch);
                }}
                availableLists={availableLists}
                showActionMenu={false}
                showAddSubtaskButton={false}
                clickToOpenAssistant={false}
                forceSubtasksOpen
              />
            </div>
          ))}
        </div>
      ) : null}

      {additionalOperations.length > 0 ? (
        <div className={styles.operationList}>
          {additionalOperations.map((operation) => (
            <div key={operation.key} className={styles.operationItem}>
              <span>{formatOperationTitle(operation)}</span>
              <span className={styles.operationType}>{operation.type}</span>
            </div>
          ))}
        </div>
      ) : null}

      {executionCount && isExecuted ? (
        <div className={styles.metaRow}>Изменений: {executionCount}</div>
      ) : null}

      {busyLabel ? <div className={styles.busyLabel}>{busyLabel}</div> : null}

      <div className={styles.actions}>
        <button
          type="button"
          className={styles.secondaryButton}
          onClick={submitRevision}
          disabled={!canRebuild}
        >
          Пересобрать
        </button>
        <button
          type="button"
          className={styles.acceptButton}
          onClick={showUndoInPrimarySlot ? onUndo : onApprove}
          disabled={primaryDisabled}
        >
          {primaryLabel}
        </button>
      </div>
    </div>
  );
}
