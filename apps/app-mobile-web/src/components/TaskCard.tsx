import { useEffect, useMemo, useRef, useState } from 'react';
import type { Subtask, Task, TaskPriority, TaskStatus } from '../lib/types';
import subtasksIcon from '../assests/subtasks.svg';
import listIcon from '../assests/list.svg';
import aiFlashIcon from '../assests/ai_flash.svg';
import plusMenuIcon from '../assests/plus.svg';
import { useUpdateTask, useCreateSubtask, useUpdateSubtask } from '../hooks/queries';
import { EditableText } from './EditableText';
import { DropdownMenu } from './DropdownMenu';
import { TaskChipMenu, type TaskChipMenuOption } from './TaskChipMenu';
import { TaskDeadlinePicker } from './TaskDeadlinePicker';
import styles from './TaskCard.module.css';

const NO_LIST_OPTION_VALUE = '__no_list__';

const PRIORITY_OPTIONS: TaskChipMenuOption[] = [
  { value: 'LOW', label: 'Низкий', dotColor: '#8f9aa7' },
  { value: 'MEDIUM', label: 'Средний', dotColor: '#5f84f2' },
  { value: 'HIGH', label: 'Высокий', dotColor: '#f59b0f' },
  { value: 'CRITICAL', label: 'Критичный', dotColor: '#df4b4b' },
];

interface TaskCardProps {
  task: Task;
  isCompleted?: boolean;
  onToggleCompleted?: (taskId: string, nextCompleted: boolean) => void;
  onOpenAssistant?: (taskId: string) => void;
  onUpdateTitle?: (taskId: string, nextTitle: string) => void;
  onCreateSubtask?: (taskId: string, title: string) => void;
  onUpdateSubtask?: (taskId: string, subtaskId: string, patch: { title?: string; status?: TaskStatus }) => void;
  onUpdateDeadline?: (taskId: string, nextDeadline: string | null) => void;
  availableLists?: { id: string; name: string; isDefault?: boolean }[];
  onUpdateList?: (taskId: string, nextListId: string | null) => void;
  onUpdatePriority?: (taskId: string, nextPriority: TaskPriority) => void;
  showActionMenu?: boolean;
  showAddSubtaskButton?: boolean;
  clickToOpenAssistant?: boolean;
  forceSubtasksOpen?: boolean;
}

export function TaskCard({
  task,
  isCompleted,
  onToggleCompleted,
  onOpenAssistant,
  onUpdateTitle,
  onCreateSubtask,
  onUpdateSubtask,
  onUpdateDeadline,
  availableLists,
  onUpdateList,
  onUpdatePriority,
  showActionMenu = true,
  showAddSubtaskButton = true,
  clickToOpenAssistant = true,
  forceSubtasksOpen = false,
}: TaskCardProps) {
  const updateTaskMut = useUpdateTask();
  const createSubtaskMut = useCreateSubtask();
  const updateSubtaskMut = useUpdateSubtask();

  const [localTitle, setLocalTitle] = useState(task.title);
  const [localSubtasks, setLocalSubtasks] = useState<Subtask[]>(task.subtasks);
  const [localTaskCompleted, setLocalTaskCompleted] = useState(task.status === 'DONE');
  const [localDeadline, setLocalDeadline] = useState(task.deadline);
  const [localListId, setLocalListId] = useState<string | null>(task.listId);
  const [localPriority, setLocalPriority] = useState<TaskPriority>(task.priority);
  const [isSubtasksOpen, setIsSubtasksOpen] = useState(forceSubtasksOpen);
  const enterPressedRef = useRef(false);
  const taskToggleStampRef = useRef(0);
  const subtaskToggleStampRef = useRef<Record<string, number>>({});
  const canOpenAssistant = clickToOpenAssistant && typeof onOpenAssistant === 'function';
  const taskCompleted = isCompleted ?? localTaskCompleted;
  const persistedSubtasksCount = localSubtasks.filter((sub) => sub.title.trim().length > 0).length;
  const hasSubs = localSubtasks.length > 0;
  const subtasksForcedOpen = forceSubtasksOpen && hasSubs;
  const subtasksOpen = subtasksForcedOpen || isSubtasksOpen;

  const listOptions = useMemo<TaskChipMenuOption[]>(() => {
    const normalized: TaskChipMenuOption[] = [
      { value: NO_LIST_OPTION_VALUE, label: 'Без списка' },
    ];

    for (const list of availableLists ?? []) {
      if (list.isDefault) {
        continue;
      }

      if (!normalized.some((option) => option.value === list.id)) {
        normalized.push({ value: list.id, label: list.name });
      }
    }

    const taskList = task.list;
    if (taskList && !normalized.some((option) => option.value === taskList.id)) {
      normalized.push({ value: taskList.id, label: taskList.name });
    }

    if (localListId && !normalized.some((option) => option.value === localListId)) {
      normalized.push({ value: localListId, label: 'Список' });
    }

    return normalized;
  }, [availableLists, localListId, task.list]);

  useEffect(() => {
    setLocalTitle(task.title);
  }, [task.id, task.title]);

  useEffect(() => {
    setLocalSubtasks(task.subtasks);
  }, [task.id, task.subtasks]);

  useEffect(() => {
    if (forceSubtasksOpen) {
      setIsSubtasksOpen(true);
    }
  }, [forceSubtasksOpen, task.id, hasSubs]);

  useEffect(() => {
    setLocalTaskCompleted(task.status === 'DONE');
  }, [task.id, task.status]);

  useEffect(() => {
    setLocalDeadline(task.deadline);
  }, [task.deadline]);

  useEffect(() => {
    setLocalListId(task.listId);
  }, [task.listId]);

  useEffect(() => {
    setLocalPriority(task.priority);
  }, [task.priority]);

  const menuItems = [
    {
      id: 'open-assistant',
      label: 'Открыть AI-ассистент',
      onSelect: handleOpenAssistant,
      icon: aiFlashIcon,
    },
    {
      id: 'toggle-subtasks',
      label: subtasksOpen ? 'Скрыть подзадачи' : 'Показать подзадачи',
      onSelect: () => {
        if (subtasksForcedOpen) {
          return;
        }
        setIsSubtasksOpen((prev) => !prev);
      },
      disabled: !hasSubs || subtasksForcedOpen,
      icon: subtasksIcon,
    },
    {
      id: 'add-subtask',
      label: 'Добавить подзадачу',
      onSelect: addDraft,
      icon: plusMenuIcon,
    },
  ];

  function addDraft() {
    const id = `draft-${task.id}-${Date.now()}`;
    const draft: Subtask = {
      id,
      taskId: task.id,
      title: '',
      status: 'TODO',
      createdAt: new Date().toISOString(),
    };
    setLocalSubtasks((prev) => [...prev, draft]);
    setIsSubtasksOpen(true);
  }

  function updateSubtaskTitle(id: string, newTitle: string) {
    const isDraft = id.startsWith('draft-');
    if (!newTitle.trim() && isDraft) {
      setLocalSubtasks((prev) => prev.filter((s) => s.id !== id));
      return;
    }
    const trimmed = newTitle.trim();
    setLocalSubtasks((prev) =>
      prev.map((s) => (s.id === id ? { ...s, title: trimmed || s.title } : s))
    );
    if (isDraft && trimmed) {
      if (onCreateSubtask) {
        onCreateSubtask(task.id, trimmed);
      } else {
        createSubtaskMut.mutate({ taskId: task.id, title: trimmed });
      }
    } else if (!isDraft && trimmed) {
      if (onUpdateSubtask) {
        onUpdateSubtask(task.id, id, { title: trimmed });
      } else {
        updateSubtaskMut.mutate({ taskId: task.id, id, title: trimmed });
      }
    }
  }

  function toggleTaskCompleted() {
    const nextCompleted = !taskCompleted;

    setLocalTaskCompleted(nextCompleted);

    if (onToggleCompleted) {
      onToggleCompleted(task.id, nextCompleted);
      return;
    }

    updateTaskMut.mutate(
      { id: task.id, status: nextCompleted ? 'DONE' : 'TODO' },
      {
        onError: () => {
          setLocalTaskCompleted(!nextCompleted);
        },
      },
    );
  }

  function toggleSubtaskCompleted(id: string) {
    if (id.startsWith('draft-')) return;
    const subtask = localSubtasks.find((s) => s.id === id);
    if (!subtask) return;

    const previousStatus = subtask.status;
    const nextStatus = previousStatus === 'DONE' ? 'TODO' : 'DONE';

    setLocalSubtasks((prev) =>
      prev.map((s) => (s.id === id ? { ...s, status: nextStatus } : s))
    );

    if (onUpdateSubtask) {
      onUpdateSubtask(task.id, id, { status: nextStatus });
      return;
    }

    updateSubtaskMut.mutate(
      { taskId: task.id, id, status: nextStatus },
      {
        onError: () => {
          setLocalSubtasks((prev) =>
            prev.map((item) => (item.id === id ? { ...item, status: previousStatus } : item))
          );
        },
      },
    );
  }

  function triggerTaskToggle() {
    const now = Date.now();
    if (now - taskToggleStampRef.current < 220) {
      return;
    }

    taskToggleStampRef.current = now;
    toggleTaskCompleted();
  }

  function triggerSubtaskToggle(id: string) {
    const now = Date.now();
    const previousStamp = subtaskToggleStampRef.current[id] ?? 0;

    if (now - previousStamp < 220) {
      return;
    }

    subtaskToggleStampRef.current[id] = now;
    toggleSubtaskCompleted(id);
  }

  function handleOpenAssistant() {
    onOpenAssistant?.(task.id);
  }

  function handleListChange(nextValue: string): void {
    const nextListId = nextValue === NO_LIST_OPTION_VALUE ? null : nextValue;
    setLocalListId(nextListId);
    onUpdateList?.(task.id, nextListId);
  }

  function handlePriorityChange(nextValue: string): void {
    const nextPriority = nextValue as TaskPriority;
    if (!PRIORITY_OPTIONS.some((option) => option.value === nextPriority)) {
      return;
    }

    setLocalPriority(nextPriority);
    onUpdatePriority?.(task.id, nextPriority);
  }

  function isInteractiveTarget(target: EventTarget | null): boolean {
    if (!(target instanceof HTMLElement)) {
      return false;
    }

    return Boolean(target.closest('button, [contenteditable="true"], [data-dropdown-menu]'));
  }

  return (
    <div
      className={`${styles.card} ${taskCompleted ? styles.cardDone : ''} ${canOpenAssistant ? '' : styles.cardStatic}`}
      role={canOpenAssistant ? 'button' : undefined}
      tabIndex={canOpenAssistant ? 0 : undefined}
      onClick={canOpenAssistant ? (e) => {
        if (isInteractiveTarget(e.target)) {
          return;
        }

        handleOpenAssistant();
      } : undefined}
      onKeyDown={canOpenAssistant ? (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          if (isInteractiveTarget(e.target)) {
            return;
          }

          e.preventDefault();
          handleOpenAssistant();
        }
      } : undefined}
    >
      <div className={styles.row}>
        <button
          type="button"
          className={`${styles.checkbox} ${taskCompleted ? styles.checkboxChecked : ''}`}
          onPointerDown={(e) => { e.stopPropagation(); }}
          onMouseDown={(e) => { e.stopPropagation(); }}
          onPointerUp={(e) => { e.stopPropagation(); triggerTaskToggle(); }}
          onClick={(e) => { e.stopPropagation(); triggerTaskToggle(); }}
          aria-label={taskCompleted ? 'Mark task as not completed' : 'Mark task as completed'}
          aria-pressed={taskCompleted}
        />
        <div className={styles.content}>
          <EditableText
            value={localTitle}
            onChange={(val) => {
              setLocalTitle(val);
              if (!val.trim() || val === task.title) {
                return;
              }

              if (onUpdateTitle) {
                onUpdateTitle(task.id, val);
              } else {
                updateTaskMut.mutate({ id: task.id, title: val });
              }
            }}
            className={styles.title}
            multiline
          />
          <div className={styles.meta}>
            {persistedSubtasksCount > 0 && (
              <button
                type="button"
                className={`${styles.metaItem} ${styles.metaToggle} ${subtasksOpen ? styles.metaToggleActive : ''}`}
                onClick={(e) => {
                  e.stopPropagation();
                  if (subtasksForcedOpen) {
                    return;
                  }
                  setIsSubtasksOpen((prev) => !prev);
                }}
                aria-label={subtasksOpen ? 'Скрыть подзадачи' : 'Показать подзадачи'}
              >
                <img src={subtasksIcon} alt="" className={styles.metaIcon} />
                {persistedSubtasksCount}
              </button>
            )}
            <div className={styles.metaItem}>
              <TaskDeadlinePicker
                value={localDeadline}
                onChange={(nextDeadline) => {
                  setLocalDeadline(nextDeadline);
                  onUpdateDeadline?.(task.id, nextDeadline);
                }}
              />
            </div>
            <div className={styles.metaItem}>
              <TaskChipMenu
                value={localListId ?? NO_LIST_OPTION_VALUE}
                options={listOptions}
                onChange={handleListChange}
                ariaLabel="Сменить список задачи"
                iconSrc={listIcon}
              />
            </div>
            <div className={styles.metaItem}>
              <TaskChipMenu
                value={localPriority}
                options={PRIORITY_OPTIONS}
                onChange={handlePriorityChange}
                ariaLabel="Сменить приоритет задачи"
                showColorDot
              />
            </div>
          </div>
        </div>
        {showActionMenu ? (
          <div className={styles.actions}>
          <button
            className={styles.actionCircle}
            type="button"
            title="AI действие"
            onClick={(e) => { e.stopPropagation(); handleOpenAssistant(); }}
          >
            <img src={aiFlashIcon} alt="" className={styles.actionIcon} />
          </button>
          <DropdownMenu items={menuItems} triggerAriaLabel="Действия задачи" />
          </div>
        ) : null}
      </div>

      {hasSubs && (
        <div className={`${styles.subtasksPanel} ${subtasksOpen ? styles.subtasksOpen : styles.subtasksClosed}`}>
          <div className={styles.subtasks}>
            {localSubtasks.map((sub, i) => {
              const isSubtaskCompleted = sub.status === 'DONE';

              return (
                <div key={sub.id}>
                  {i > 0 && <div className={styles.divider} />}
                  <div className={styles.subtaskRow}>
                    <button
                      type="button"
                      className={`${styles.subCheckbox} ${isSubtaskCompleted ? styles.checkboxChecked : ''}`}
                      onPointerDown={(e) => { e.stopPropagation(); }}
                      onMouseDown={(e) => { e.stopPropagation(); }}
                      onPointerUp={(e) => { e.stopPropagation(); triggerSubtaskToggle(sub.id); }}
                      onClick={(e) => { e.stopPropagation(); triggerSubtaskToggle(sub.id); }}
                      aria-label={isSubtaskCompleted ? 'Mark subtask as not completed' : 'Mark subtask as completed'}
                      aria-pressed={isSubtaskCompleted}
                    />
                    <SubtaskEditable
                      sub={sub}
                      isDraft={sub.id.startsWith('draft-')}
                      onSave={(title) => updateSubtaskTitle(sub.id, title)}
                      onEnter={() => {
                        if (!enterPressedRef.current) {
                          enterPressedRef.current = true;
                          setTimeout(() => {
                            enterPressedRef.current = false;
                            setIsSubtasksOpen(true);
                            addDraft();
                          }, 0);
                        }
                      }}
                      onCancel={() => {
                        if (sub.id.startsWith('draft-')) {
                          setLocalSubtasks((prev) => prev.filter((s) => s.id !== sub.id));
                        }
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {showAddSubtaskButton ? (
        <div className={styles.plusWrap}>
          <button
            className={styles.plusBtn}
            type="button"
            onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); }}
            onClick={(e) => { e.stopPropagation(); addDraft(); }}
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path d="M6 1v10M1 6h10" stroke="white" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </button>
        </div>
      ) : null}
    </div>
  );
}

// Отдельный компонент для подзадачи с autoFocus для черновиков
function SubtaskEditable({
  sub,
  isDraft,
  onSave,
  onEnter,
  onCancel,
}: {
  sub: Subtask;
  isDraft: boolean;
  onSave: (title: string) => void;
  onEnter: () => void;
  onCancel: () => void;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const originalRef = useRef(sub.title);
  const enterFiredRef = useRef(false);

  useEffect(() => {
    if (isDraft && ref.current) {
      ref.current.focus();
    }
  }, []);

  function handleBlur() {
    if (enterFiredRef.current) return;

    const text = ref.current?.textContent?.trim() ?? '';
    if (!text) {
      onCancel();
      return;
    }
    onSave(text);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Escape') {
      e.preventDefault();
      if (ref.current) ref.current.textContent = originalRef.current;
      if (isDraft && !originalRef.current) {
        onCancel();
      } else {
        ref.current?.blur();
      }
      return;
    }
    if (e.key === 'Enter') {
      e.preventDefault();
      const text = ref.current?.textContent?.trim() ?? '';
      if (!text) {
        onCancel();
        return;
      }
      enterFiredRef.current = true;
      onSave(text);
      ref.current?.blur();
      onEnter();
      setTimeout(() => { enterFiredRef.current = false; }, 50);
    }
  }

  return (
    <span
      ref={ref}
      contentEditable
      suppressContentEditableWarning
      onBlur={handleBlur}
      onKeyDown={handleKeyDown}
      className={`${styles.subTitle} ${sub.status === 'DONE' ? styles.subTitleDone : ''}`}
      style={{ outline: 'none', cursor: 'text' }}
      onFocus={(e) => { originalRef.current = e.currentTarget.textContent ?? ''; }}
      data-placeholder="Введите подзадачу..."
    >
      {sub.title}
    </span>
  );
}
