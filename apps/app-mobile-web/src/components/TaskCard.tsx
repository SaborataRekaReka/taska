import type { Task } from '../lib/types';
import styles from './TaskCard.module.css';

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export function TaskCard({ task }: { task: Task }) {
  const hasSubs = task.subtasks.length > 0;

  return (
    <div className={styles.card}>
      <div className={styles.row}>
        <button className={styles.checkbox} />
        <div className={styles.content}>
          <span className={styles.title}>{task.title}</span>
          <div className={styles.meta}>
            {hasSubs && (
              <span className={styles.metaItem}>
                <svg width="12" height="12" viewBox="0 0 14 14" fill="none"><path d="M3 4h8M3 7h6M3 10h4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/></svg>
                {task.subtasks.length}
              </span>
            )}
            {task.deadline && (
              <span className={styles.metaItem}>
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><circle cx="6" cy="6" r="5" stroke="currentColor" strokeWidth="1.1"/><path d="M6 3v3.5l2 1.5" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round"/></svg>
                {formatDate(task.deadline)}
              </span>
            )}
            {task.list && (
              <span className={styles.metaItem}>
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M1 3h10M1 6h10M1 9h10" stroke="currentColor" strokeWidth="1" strokeLinecap="round"/></svg>
                {task.list.name}
              </span>
            )}
          </div>
        </div>
        <div className={styles.actions}>
          <button className={styles.actionCircle}>
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M6 1v10M1 6h10" stroke="white" strokeWidth="1.8" strokeLinecap="round"/></svg>
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
          {task.subtasks.map((sub, i) => (
            <div key={sub.id}>
              {i > 0 && <div className={styles.divider} />}
              <div className={styles.subtaskRow}>
                <button className={styles.subCheckbox} />
                <span className={styles.subTitle}>{sub.title}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
