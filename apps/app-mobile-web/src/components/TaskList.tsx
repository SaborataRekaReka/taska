import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { DEMO_TASKS } from '../lib/demoData';
import { useUiStore } from '../stores/ui';
import { TaskCard } from './TaskCard';
import styles from './TaskList.module.css';

function isDueToday(deadline: string | null): boolean {
  if (!deadline) {
    return false;
  }

  const due = new Date(deadline);
  const now = new Date();

  return (
    due.getFullYear() === now.getFullYear()
    && due.getMonth() === now.getMonth()
    && due.getDate() === now.getDate()
  );
}

export function TaskList() {
  const activeListId = useUiStore((s) => s.activeListId);
  const isMyDaySaved = useUiStore((s) => s.isMyDaySaved);
  const searchQuery = useUiStore((s) => s.searchQuery.trim().toLowerCase());
  const openTaskAssistantModal = useUiStore((s) => s.openTaskAssistantModal);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [completedTaskIds, setCompletedTaskIds] = useState<Record<string, boolean>>({});

  const listScopedTasks = useMemo(
    () => DEMO_TASKS.filter((task) => {
      if (activeListId === '__no_list__') {
        return task.listId === null;
      }

      if (activeListId === '__my_day__') {
        return isMyDaySaved ? true : isDueToday(task.deadline);
      }

      if (activeListId) {
        return task.listId === activeListId;
      }

      return true;
    }),
    [activeListId, isMyDaySaved],
  );

  const filteredTasks = useMemo(
    () => listScopedTasks.filter((task) => {
      if (!searchQuery) {
        return true;
      }

      const normalizedTitle = task.title.toLowerCase();
      const normalizedListName = task.list?.name.toLowerCase() ?? '';
      const matchesTitle = normalizedTitle.includes(searchQuery);
      const matchesList = normalizedListName.includes(searchQuery);
      const matchesSubtasks = task.subtasks.some((subtask) =>
        subtask.title.toLowerCase().includes(searchQuery)
      );

      return matchesTitle || matchesList || matchesSubtasks;
    }),
    [listScopedTasks, searchQuery],
  );

  const sortedTasks = useMemo(
    () => filteredTasks
      .map((task, index) => ({
        task,
        index,
        isCompleted: completedTaskIds[task.id] ?? task.status === 'DONE',
      }))
      .sort((a, b) => {
        if (a.isCompleted === b.isCompleted) {
          return a.index - b.index;
        }

        return a.isCompleted ? 1 : -1;
      }),
    [completedTaskIds, filteredTasks],
  );

  function handleToggleTaskCompleted(taskId: string, nextCompleted: boolean) {
    setCompletedTaskIds((prev) => ({
      ...prev,
      [taskId]: nextCompleted,
    }));
  }

  return (
    <div className={styles.list}>
      {sortedTasks.map(({ task, isCompleted }) => (
        <motion.div
          key={task.id}
          className={styles.item}
          layout
          transition={{ layout: { duration: 0.34, ease: [0.22, 1, 0.36, 1] } }}
        >
          <TaskCard
            task={task}
            isCompleted={isCompleted}
            onToggleCompleted={handleToggleTaskCompleted}
            onOpenAssistant={openTaskAssistantModal}
          />
        </motion.div>
      ))}
      {sortedTasks.length === 0 && (
        <div className={styles.empty}>{'Ничего не найдено'}</div>
      )}
    </div>
  );
}
