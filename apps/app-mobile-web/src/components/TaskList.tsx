import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { DEMO_LISTS } from '../lib/demoData';
import { isTaskInSmartList } from '../lib/smartLists';
import type { TaskPriority } from '../lib/types';
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
  const activeSmartListId = useUiStore((s) => s.activeSmartListId);
  const isTempListVisible = useUiStore((s) => s.isTempListVisible);
  const searchQuery = useUiStore((s) => s.searchQuery.trim().toLowerCase());
  const openTaskAssistantModal = useUiStore((s) => s.openTaskAssistantModal);
  const demoTasks = useUiStore((s) => s.demoTasks);
  const updateDemoTask = useUiStore((s) => s.updateDemoTask);
  const [completedTaskIds, setCompletedTaskIds] = useState<Record<string, boolean>>({});

  const availableTaskLists = useMemo(
    () => DEMO_LISTS
      .filter((list) => list.id !== 'no-list')
      .filter((list) => list.id !== 'temp' || isTempListVisible)
      .map((list) => ({ id: list.id, name: list.name })),
    [isTempListVisible],
  );

  const listNameById = useMemo(
    () => new Map(availableTaskLists.map((list) => [list.id, list.name])),
    [availableTaskLists],
  );

  const listScopedTasks = useMemo(
    () => demoTasks.filter((task) => {
      if (activeSmartListId) {
        return isTaskInSmartList(task, activeSmartListId);
      }

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
    [activeListId, activeSmartListId, demoTasks, isMyDaySaved],
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

  function handleUpdateTaskDeadline(taskId: string, nextDeadline: string | null): void {
    updateDemoTask(taskId, { deadline: nextDeadline });
  }

  function handleUpdateTaskList(taskId: string, nextListId: string | null): void {
    if (!nextListId) {
      updateDemoTask(taskId, {
        listId: null,
        list: null,
      });
      return;
    }

    const nextListName = listNameById.get(nextListId);
    updateDemoTask(taskId, {
      listId: nextListId,
      list: {
        id: nextListId,
        name: nextListName ?? 'Список',
      },
    });
  }

  function handleUpdateTaskPriority(taskId: string, nextPriority: TaskPriority): void {
    updateDemoTask(taskId, { priority: nextPriority });
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
            onUpdateDeadline={handleUpdateTaskDeadline}
            availableLists={availableTaskLists}
            onUpdateList={handleUpdateTaskList}
            onUpdatePriority={handleUpdateTaskPriority}
          />
        </motion.div>
      ))}
      {sortedTasks.length === 0 && (
        <div className={styles.empty}>{'Ничего не найдено'}</div>
      )}
    </div>
  );
}
