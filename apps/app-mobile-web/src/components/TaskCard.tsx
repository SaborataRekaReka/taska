import { useEffect, useRef, useState } from 'react';
import type { Subtask, Task } from '../lib/types';
import subtasksIcon from '../assests/subtasks.svg';
import clockIcon from '../assests/clock.svg';
import listIcon from '../assests/list.svg';
import aiFlashIcon from '../assests/ai_flash.svg';
import { EditableText } from './EditableText';
import styles from './TaskCard.module.css';

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export function TaskCard({ task }: { task: Task }) {
  const [localTitle, setLocalTitle] = useState(task.title);
  const [localSubtasks, setLocalSubtasks] = useState<Subtask[]>(task.subtasks);
  const [animatingId, setAnimatingId] = useState<string | null>(null);
  const enterPressedRef = useRef(false);
  const hasSubs = localSubtasks.length > 0;

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
    setAnimatingId(id);
    setTimeout(() => setAnimatingId(null), 350);
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

  return (
    <div className={styles.card}>
      <div className={styles.row}>
        <button className={styles.checkbox} />
        <div className={styles.content}>
          <EditableText
            value={localTitle}
            onChange={setLocalTitle}
            className={styles.title}
            multiline
          />
          <div className={styles.meta}>
            {hasSubs && (
              <span className={styles.metaItem}>
                <img src={subtasksIcon} alt="" className={styles.metaIcon} />
                {localSubtasks.length}
              </span>
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
          <button className={styles.actionCircle} type="button" title="AI действие">
            <img src={aiFlashIcon} alt="" className={styles.actionIcon} />
          </button>
          <button className={styles.menuBtn}>
            <svg width="4" height="16" viewBox="0 0 4 16" fill="none">
              <circle cx="2" cy="2" r="1.3" fill="currentColor"/>
              <circle cx="2" cy="8" r="1.3" fill="currentColor"/>
              <circle cx="2" cy="14" r="1.3" fill="currentColor"/>
            </svg>
          </button>
        </div>
      </div>

      {hasSubs && (
        <div className={styles.subtasks}>
          {localSubtasks.map((sub, i) => (
            <div key={sub.id} className={sub.id === animatingId ? styles.subtaskEnter : ''}>
              {i > 0 && <div className={styles.divider} />}
              <div className={styles.subtaskRow}>
                <button className={styles.subCheckbox} />
                <SubtaskEditable
                  sub={sub}
                  isDraft={sub.id.startsWith('draft-')}
                  onSave={(title) => updateSubtaskTitle(sub.id, title)}
                  onEnter={() => {
                    if (!enterPressedRef.current) {
                      enterPressedRef.current = true;
                      setTimeout(() => {
                        enterPressedRef.current = false;
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
          ))}
        </div>
      )}

      <div className={styles.plusWrap}>
        <button
          className={styles.plusBtn}
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={addDraft}
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
      className={styles.subTitle}
      style={{ outline: 'none', cursor: 'text' }}
      onFocus={(e) => { originalRef.current = e.currentTarget.textContent ?? ''; }}
      data-placeholder="Введите подзадачу..."
    >
      {sub.title}
    </span>
  );
}
