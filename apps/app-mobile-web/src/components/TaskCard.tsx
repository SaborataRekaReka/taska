import { useState } from 'react';
import type { Task } from '../lib/types';
import { useUpdateTask, useDeleteTask, useUpdateSubtask } from '../hooks/queries';
import { useUiStore } from '../stores/ui';
import styles from './TaskCard.module.css';

const PRIORITY_ICON: Record<string, string> = {
  CRITICAL: '🔴',
  HIGH: '🟠',
  MEDIUM: '',
  LOW: '🔵',
};

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export function TaskCard({ task }: { task: Task }) {
  const updateTask = useUpdateTask();
  const deleteTask = useDeleteTask();
  const updateSubtask = useUpdateSubtask();
  const setEditingTask = useUiStore((s) => s.setEditingTask);
  const [menuOpen, setMenuOpen] = useState(false);

  const isDone = task.status === 'DONE';

  function toggleStatus() {
    updateTask.mutate({
      id: task.id,
      status: isDone ? 'TODO' : 'DONE',
    });
  }

  function toggleSubtask(subId: string, currentStatus: string) {
    updateSubtask.mutate({
      taskId: task.id,
      id: subId,
      status: currentStatus === 'DONE' ? 'TODO' : 'DONE',
    });
  }

  return (
    <div className={`${styles.card} ${isDone ? styles.done : ''}`}>
      <div className={styles.row}>
        <button className={styles.checkbox} onClick={toggleStatus}>
          {isDone ? '✓' : ''}
        </button>
        <div className={styles.content} onClick={() => setEditingTask(task.id)}>
          <span className={styles.title}>
            {PRIORITY_ICON[task.priority]}{' '}
            {task.title}
          </span>
          <div className={styles.meta}>
            {task.subtasks.length > 0 && (
              <span className={styles.metaItem}>
                ↪ {task.subtasks.filter((s) => s.status === 'DONE').length}/{task.subtasks.length}
              </span>
            )}
            {task.deadline && (
              <span className={styles.metaItem}>⏰ {formatDate(task.deadline)}</span>
            )}
            {task.list && (
              <span className={styles.metaItem}>≡ {task.list.name}</span>
            )}
          </div>
        </div>
        <div className={styles.actions}>
          <button className={styles.menuBtn} onClick={() => setMenuOpen(!menuOpen)}>⋮</button>
          {menuOpen && (
            <div className={styles.menu}>
              <button onClick={() => { setEditingTask(task.id); setMenuOpen(false); }}>
                Редактировать
              </button>
              <button onClick={() => { deleteTask.mutate(task.id); setMenuOpen(false); }}>
                Удалить
              </button>
            </div>
          )}
        </div>
      </div>

      {task.subtasks.length > 0 && (
        <div className={styles.subtasks}>
          {task.subtasks.map((sub) => (
            <div key={sub.id} className={styles.subtaskRow}>
              <button
                className={`${styles.subCheckbox} ${sub.status === 'DONE' ? styles.subDone : ''}`}
                onClick={() => toggleSubtask(sub.id, sub.status)}
              >
                {sub.status === 'DONE' ? '✓' : ''}
              </button>
              <span className={sub.status === 'DONE' ? styles.subTitleDone : ''}>
                {sub.title}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
