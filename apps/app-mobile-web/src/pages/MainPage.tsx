import { useMemo } from 'react';
import { Header } from '../components/Header';
import { HeroPanel } from '../components/HeroPanel';
import { ListTabs } from '../components/ListTabs';
import { Toolbar } from '../components/Toolbar';
import { TaskList } from '../components/TaskList';
import { DayCreatedActions } from '../components/DayCreatedActions';
import { EditTaskModal } from '../components/EditTaskModal';
import { MyDayModal } from '../components/my-day/MyDayModal';
import { dayColorsToBackground } from '../lib/profileColors';
import type { DayTask } from '../components/my-day/types';
import { useUiStore } from '../stores/ui';
import styles from './MainPage.module.css';

function mapPriority(priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'): DayTask['priority'] {
  if (priority === 'LOW') {
    return 'low';
  }

  if (priority === 'MEDIUM') {
    return 'medium';
  }

  return 'high';
}

function mapEffort(priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'): DayTask['effort'] {
  if (priority === 'LOW') {
    return 'low';
  }

  if (priority === 'MEDIUM') {
    return 'medium';
  }

  return 'high';
}

export function MainPage() {
  const demoState = useUiStore((s) => s.demoState);
  const setDemoState = useUiStore((s) => s.setDemoState);
  const setActiveList = useUiStore((s) => s.setActiveList);
  const isMyDayModalOpen = useUiStore((s) => s.isMyDayModalOpen);
  const openMyDayModal = useUiStore((s) => s.openMyDayModal);
  const closeMyDayModal = useUiStore((s) => s.closeMyDayModal);
  const setMyDaySaved = useUiStore((s) => s.setMyDaySaved);
  const dayColors = useUiStore((s) => s.dayColors);
  const demoTasks = useUiStore((s) => s.demoTasks);

  const isDayCreated = demoState === 'dayCreated';
  const showLegacyBalance = demoState === 'balanceModalOpen';
  const showMyDayModal = isMyDayModalOpen || showLegacyBalance;
  const selectedTaskId = useUiStore((s) => s.selectedTaskId);
  const showEditModal = selectedTaskId !== null;
  const hasDayColors = dayColors !== null;

  const modalTasks = useMemo<DayTask[]>(
    () => demoTasks.map((task, index) => {
      const normalizedPriority = mapPriority(task.priority);
      const title = task.title.toLowerCase();

      const estimatedMinutes = (() => {
        const base = normalizedPriority === 'high' ? 120 : normalizedPriority === 'medium' ? 75 : 40;
        return base + task.subtasks.length * 18 + index * 6;
      })();

      return {
        priority: normalizedPriority,
        dueDate: task.deadline,
        estimatedMinutes,
        effort: mapEffort(task.priority),
        tags: [
          task.list?.name ?? 'Без списка',
          normalizedPriority === 'high' ? 'strategic' : 'routine',
        ],
        isImportant: normalizedPriority === 'high' || title.includes('plan') || title.includes('strategy'),
        isOverdue: Boolean(
          task.deadline
          && task.status !== 'DONE'
          && new Date(task.deadline).getTime() < Date.now(),
        ),
      };
    }),
    [demoTasks],
  );

  function handleCloseMyDayModal(): void {
    closeMyDayModal();
    if (showLegacyBalance) {
      setDemoState('workListHover');
    }
  }

  function handleCreateMyDay(): void {
    setDemoState('dayCreated');
    setMyDaySaved(false);
    closeMyDayModal();
  }

  function handleEditBalance(): void {
    openMyDayModal();
  }

  function handleSaveMyDay(): void {
    setMyDaySaved(true);
    setActiveList('__my_day__');
    setDemoState('workListHover');
    closeMyDayModal();
  }

  return (
    <div className={`${styles.page} ${isDayCreated && !hasDayColors ? styles.emotional : ''}`}>
      {dayColors && (
        <div
          className={styles.dayBg}
          style={{ background: dayColorsToBackground(dayColors) }}
        />
      )}
      {isDayCreated && !hasDayColors && <div className={styles.emotionalBloom} />}
      <Header />
      <main className={styles.main}>
        <HeroPanel />
        <div className={styles.tabRow}>
          <ListTabs />
          <Toolbar />
        </div>
        {isDayCreated && (
          <DayCreatedActions
            onEditBalance={handleEditBalance}
            onSave={handleSaveMyDay}
          />
        )}
        <TaskList />
      </main>
      <MyDayModal
        isOpen={showMyDayModal}
        onClose={handleCloseMyDayModal}
        tasks={modalTasks}
        onCreateMyDay={handleCreateMyDay}
      />
      {showEditModal && <EditTaskModal />}
    </div>
  );
}
