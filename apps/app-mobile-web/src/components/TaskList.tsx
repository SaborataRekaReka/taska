import { DEMO_TASKS } from '../lib/demoData';
import { useState } from 'react';
import { useUiStore } from '../stores/ui';
import { TaskCard } from './TaskCard';
import { InsertBetween } from './InsertBetween';
import styles from './TaskList.module.css';

export function TaskList() {
  const demoState = useUiStore((s) => s.demoState);
  const searchQuery = useUiStore((s) => s.searchQuery.trim().toLowerCase());
  const showInsert = demoState === 'workListHover' || demoState === 'tempAiList';
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const filteredTasks = DEMO_TASKS.filter((task) => {
    if (!searchQuery) return true;

    const matchesTitle = task.title.toLowerCase().includes(searchQuery);
    const matchesList = task.list?.name.toLowerCase().includes(searchQuery) ?? false;
    const matchesSubtasks = task.subtasks.some((subtask) => subtask.title.toLowerCase().includes(searchQuery));

    return matchesTitle || matchesList || matchesSubtasks;
  });

  return (
    <div className={styles.list}>
      {filteredTasks.map((task, i) => (
        <div
          key={task.id}
          className={styles.item}
          onMouseEnter={() => setHoveredIndex(i)}
          onMouseLeave={() => setHoveredIndex((prev) => (prev === i ? null : prev))}
        >
          <TaskCard task={task} />
          {showInsert && i < DEMO_TASKS.length - 1 && <InsertBetween visible={hoveredIndex === i} />}
        </div>
      ))}
      {filteredTasks.length === 0 && <div className={styles.empty}>Ничего не найдено</div>}
    </div>
  );
}
