import { useMemo } from 'react';
import { Header } from '../components/Header';
import { HeroPanel } from '../components/HeroPanel';
import { ListTabs } from '../components/ListTabs';
import { TaskList } from '../components/TaskList';
import { MyDayEmptyState } from '../components/MyDayEmptyState';
import { EditTaskModal } from '../components/EditTaskModal';
import { MyDayModal } from '../components/my-day/MyDayModal';
import { GradientBlob } from '../components/GradientBackground';
import { energyToSpread } from '../lib/profileColors';
import { useTasks } from '../hooks/queries';
import type { DayTask } from '../components/my-day/types';
import { useUiStore } from '../stores/ui';
import styles from './MainPage.module.css';

function mapPriority(priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'): DayTask['priority'] {
  if (priority === 'LOW') return 'low';
  if (priority === 'MEDIUM') return 'medium';
  return 'high';
}

function mapEffort(priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'): DayTask['effort'] {
  if (priority === 'LOW') return 'low';
  if (priority === 'MEDIUM') return 'medium';
  return 'high';
}

export function MainPage() {
  const isMyDayModalOpen = useUiStore((s) => s.isMyDayModalOpen);
  const openMyDayModal = useUiStore((s) => s.openMyDayModal);
  const closeMyDayModal = useUiStore((s) => s.closeMyDayModal);
  const setMyDaySaved = useUiStore((s) => s.setMyDaySaved);
  const activeListId = useUiStore((s) => s.activeListId);
  const isMyDaySaved = useUiStore((s) => s.isMyDaySaved);
  const dayColors = useUiStore((s) => s.dayColors);
  const dayEnergy = useUiStore((s) => s.dayEnergy);

  const { data: allTasks = [] } = useTasks();

  const isMyDayActive = activeListId === '__my_day__';
  const showMyDayEmptyState = isMyDayActive && !isMyDaySaved;
  const selectedTaskId = useUiStore((s) => s.selectedTaskId);
  const showEditModal = selectedTaskId !== null;

  const modalTasks = useMemo<DayTask[]>(
    () => allTasks.map((task, index) => {
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
    [allTasks],
  );

  function handleCloseMyDayModal(): void {
    closeMyDayModal();
  }

  function handleCreateMyDay(): void {
    setMyDaySaved(true);
    closeMyDayModal();
  }

  return (
    <div className={styles.page}>
      {dayColors && (
        <div className={styles.dayBg}>
          <GradientBlob
            c0={dayColors[0]}
            c1={dayColors[1]}
            size={800}
            scale={2.2}
            spread={energyToSpread(dayEnergy)}
            interactive={false}
            id="page-blob"
          />
        </div>
      )}
      <Header />
      <main className={styles.main}>
        <HeroPanel />
        <div className={styles.tabRow}>
          <ListTabs />
        </div>
        {showMyDayEmptyState ? (
          <MyDayEmptyState onSetup={openMyDayModal} />
        ) : (
          <TaskList />
        )}
      </main>
      <MyDayModal
        isOpen={isMyDayModalOpen}
        onClose={handleCloseMyDayModal}
        tasks={modalTasks}
        onCreateMyDay={handleCreateMyDay}
      />
      <EditTaskModal isOpen={showEditModal} />
    </div>
  );
}
