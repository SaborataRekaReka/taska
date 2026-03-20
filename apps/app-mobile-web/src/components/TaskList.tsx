import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import type { TaskPriority, TaskStatus } from '../lib/types';
import { useTasks, useUpdateTask, useLists } from '../hooks/queries';
import { useUiStore } from '../stores/ui';
import { TaskCard } from './TaskCard';
import styles from './TaskList.module.css';

export function TaskList() {
  const openTaskAssistantModal = useUiStore((s) => s.openTaskAssistantModal);
  const { data: tasks = [] } = useTasks();
  const { data: lists = [] } = useLists();
  const updateTask = useUpdateTask();
  const [optimisticStatusById, setOptimisticStatusById] = useState<Record<string, TaskStatus>>({});

  const availableTaskLists = useMemo(
    () => lists.map((list) => ({ id: list.id, name: list.name, isDefault: list.isDefault })),
    [lists],
  );

  const serverStatusById = useMemo<Record<string, TaskStatus>>(
    () => Object.fromEntries(tasks.map((task) => [task.id, task.status])),
    [tasks],
  );

  useEffect(() => {
    setOptimisticStatusById((current) => {
      const liveTaskIds = new Set(tasks.map((task) => task.id));
      let changed = false;
      const next = { ...current };

      for (const taskId of Object.keys(next)) {
        if (!liveTaskIds.has(taskId)) {
          delete next[taskId];
          changed = true;
          continue;
        }

        if (next[taskId] === serverStatusById[taskId]) {
          delete next[taskId];
          changed = true;
        }
      }

      return changed ? next : current;
    });
  }, [serverStatusById, tasks]);

  const sortedTasks = useMemo(
    () => [...tasks]
      .map((task, index) => ({
        task,
        index,
        resolvedStatus: optimisticStatusById[task.id] ?? task.status,
        isCompleted: (optimisticStatusById[task.id] ?? task.status) === 'DONE',
      }))
      .sort((a, b) => {
        if (a.isCompleted === b.isCompleted) {
          return a.index - b.index;
        }
        return a.isCompleted ? 1 : -1;
      }),
    [optimisticStatusById, tasks],
  );

  function handleToggleTaskCompleted(taskId: string, nextCompleted: boolean) {
    const nextStatus: TaskStatus = nextCompleted ? 'DONE' : 'TODO';
    const previousStatus = optimisticStatusById[taskId] ?? serverStatusById[taskId];

    setOptimisticStatusById((current) => ({ ...current, [taskId]: nextStatus }));

    updateTask.mutate(
      { id: taskId, status: nextStatus },
      {
        onError: () => {
          if (!previousStatus) {
            setOptimisticStatusById((current) => {
              const next = { ...current };
              delete next[taskId];
              return next;
            });
            return;
          }

          setOptimisticStatusById((current) => ({ ...current, [taskId]: previousStatus }));
        },
      },
    );
  }

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
      {sortedTasks.map(({ task, isCompleted, resolvedStatus }) => (
        <motion.div
          key={task.id}
          className={styles.item}
          layout
          transition={{ layout: { duration: 0.34, ease: [0.22, 1, 0.36, 1] } }}
        >
          <TaskCard
            task={resolvedStatus === task.status ? task : { ...task, status: resolvedStatus }}
            isCompleted={isCompleted}
            onToggleCompleted={handleToggleTaskCompleted}
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
