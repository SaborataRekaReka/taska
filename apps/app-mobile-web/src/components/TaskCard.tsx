import { useEffect, useRef, useState } from 'react';
import type { Subtask, Task } from '../lib/types';
import subtasksIcon from '../assests/subtasks.svg';
import clockIcon from '../assests/clock.svg';
import listIcon from '../assests/list.svg';
import aiFlashIcon from '../assests/ai_flash.svg';
import { EditableText } from './EditableText';
import { DropdownMenu } from './DropdownMenu';
import styles from './TaskCard.module.css';

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

interface TaskCardProps {
  task: Task;
  isCompleted?: boolean;
  onToggleCompleted?: (taskId: string, nextCompleted: boolean) => void;
  onOpenAssistant?: (taskId: string) => void;
}

export function TaskCard({ task, isCompleted, onToggleCompleted, onOpenAssistant }: TaskCardProps) {
  const [localTitle, setLocalTitle] = useState(task.title);
  const [localSubtasks, setLocalSubtasks] = useState<Subtask[]>(task.subtasks);
  const [localTaskCompleted, setLocalTaskCompleted] = useState(task.status === 'DONE');
  const [isSubtasksOpen, setIsSubtasksOpen] = useState(false);
  const enterPressedRef = useRef(false);
  const taskCompleted = isCompleted ?? localTaskCompleted;
  const persistedSubtasksCount = localSubtasks.filter((sub) => sub.title.trim().length > 0).length;
  const hasSubs = localSubtasks.length > 0;
  const menuItems = [
    {
      id: 'open-assistant',
      label: 'Открыть AI-ассистент',
      onSelect: handleOpenAssistant,
    },
    {
      id: 'toggle-subtasks',
      label: isSubtasksOpen ? 'Скрыть подзадачи' : 'Показать подзадачи',
      onSelect: () => setIsSubtasksOpen((prev) => !prev),
      disabled: !hasSubs,
    },
    {
      id: 'add-subtask',
      label: 'Добавить подзадачу',
      onSelect: addDraft,
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
    setLocalSubtasks((prev) =>
      prev.map((s) => (s.id === id ? { ...s, title: newTitle.trim() || s.title } : s))
    );
  }

  function toggleTaskCompleted() {
    const nextCompleted = !taskCompleted;

    if (onToggleCompleted) {
      onToggleCompleted(task.id, nextCompleted);
      return;
    }

    setLocalTaskCompleted(nextCompleted);
  }

  function toggleSubtaskCompleted(id: string) {
    setLocalSubtasks((prev) =>
      prev.map((subtask) => {
        if (subtask.id !== id) {
          return subtask;
        }

        const nextStatus = subtask.status === 'DONE' ? 'TODO' : 'DONE';
        return { ...subtask, status: nextStatus };
      })
    );
  }

  function handleOpenAssistant() {
    onOpenAssistant?.(task.id);
  }

  function isInteractiveTarget(target: EventTarget | null): boolean {
    if (!(target instanceof HTMLElement)) {
      return false;
    }

    return Boolean(target.closest('button, [contenteditable="true"]'));
  }

  return (
    <div
      className={`${styles.card} ${taskCompleted ? styles.cardDone : ''}`}
      role="button"
      tabIndex={0}
      onClick={(e) => {
        if (isInteractiveTarget(e.target)) {
          return;
        }

        handleOpenAssistant();
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          if (isInteractiveTarget(e.target)) {
            return;
          }

          e.preventDefault();
          handleOpenAssistant();
        }
      }}
    >
      <div className={styles.row}>
        <button
          type="button"
          className={`${styles.checkbox} ${taskCompleted ? styles.checkboxChecked : ''}`}
          onClick={(e) => { e.stopPropagation(); toggleTaskCompleted(); }}
          aria-label={taskCompleted ? 'Mark task as not completed' : 'Mark task as completed'}
          aria-pressed={taskCompleted}
        />
        <div className={styles.content}>
          <EditableText
            value={localTitle}
            onChange={setLocalTitle}
            className={styles.title}
            multiline
          />
          <div className={styles.meta}>
            {persistedSubtasksCount > 0 && (
              <button
                type="button"
                className={`${styles.metaItem} ${styles.metaToggle} ${isSubtasksOpen ? styles.metaToggleActive : ''}`}
                onClick={(e) => { e.stopPropagation(); setIsSubtasksOpen((prev) => !prev); }}
                aria-label={isSubtasksOpen ? 'Скрыть подзадачи' : 'Показать подзадачи'}
              >
                <img src={subtasksIcon} alt="" className={styles.metaIcon} />
                {persistedSubtasksCount}
              </button>
            )}
            {task.deadline && (
              <span className={styles.metaItem}>
                <img src={clockIcon} alt="" className={styles.metaIcon} />
                {formatDate(task.deadline)}
              </span>
            )}
            {task.list && (
              <span className={styles.metaItem}>
                <img src={listIcon} alt="" className={styles.metaIcon} />
                {task.list.name}
              </span>
            )}
          </div>
        </div>
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
      </div>

      {hasSubs && (
        <div className={`${styles.subtasksPanel} ${isSubtasksOpen ? styles.subtasksOpen : styles.subtasksClosed}`}>
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
                      onClick={(e) => { e.stopPropagation(); toggleSubtaskCompleted(sub.id); }}
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
