import { useMemo } from 'react';
import { motion } from 'framer-motion';
import type { TaskPriority } from '../lib/types';
import { useTasks, useUpdateTask, useLists } from '../hooks/queries';
import { useUiStore } from '../stores/ui';
import { TaskCard } from './TaskCard';
import styles from './TaskList.module.css';

export function TaskList() {
  const openTaskAssistantModal = useUiStore((s) => s.openTaskAssistantModal);
  const { data: tasks = [] } = useTasks();
  const { data: lists = [] } = useLists();
  const updateTask = useUpdateTask();

  const availableTaskLists = useMemo(
    () => lists.map((list) => ({ id: list.id, name: list.name, isDefault: list.isDefault })),
    [lists],
  );

  const sortedTasks = useMemo(
    () => [...tasks]
      .map((task, index) => ({
        task,
        index,
        isCompleted: task.status === 'DONE',
      }))
      .sort((a, b) => {
        if (a.isCompleted === b.isCompleted) {
          return a.index - b.index;
        }
        return a.isCompleted ? 1 : -1;
      }),
    [tasks],
  );

  function handleUpdateTaskDeadline(taskId: string, nextDeadline: string | null): void {
    updateTask.mutate({ id: taskId, deadline: nextDeadline });
  }

  function handleUpdateTaskList(taskId: string, nextListId: string | null): void {
    updateTask.mutate({ id: taskId, listId: nextListId });
  }

  function handleUpdateTaskPriority(taskId: string, nextPriority: TaskPriority): void {
    updateTask.mutate({ id: taskId, priority: nextPriority });
  }

  return (
    <div className={styles.list}>
      {sortedTasks.map(({ task }) => (
        <motion.div
          key={task.id}
          className={styles.item}
          layout
          transition={{ layout: { duration: 0.34, ease: [0.22, 1, 0.36, 1] } }}
        >
          <TaskCard
            task={task}
            onOpenAssistant={openTaskAssistantModal}
            onUpdateDeadline={handleUpdateTaskDeadline}
            availableLists={availableTaskLists}
            onUpdateList={handleUpdateTaskList}
            onUpdatePriority={handleUpdateTaskPriority}
          />
        </motion.div>
      ))}
      {sortedTasks.length === 0 && (
        <div className={styles.empty}>Задач пока нет</div>
      )}
    </div>
  );
}
