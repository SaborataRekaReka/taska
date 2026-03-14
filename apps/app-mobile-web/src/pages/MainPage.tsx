import { Header } from '../components/Header';
import { HeroPanel } from '../components/HeroPanel';
import { ListTabs } from '../components/ListTabs';
import { Toolbar } from '../components/Toolbar';
import { TaskList } from '../components/TaskList';
import { DayCreatedActions } from '../components/DayCreatedActions';
import { EditTaskModal } from '../components/EditTaskModal';
import { BalanceModal } from '../components/BalanceModal';
import { useUiStore } from '../stores/ui';
import styles from './MainPage.module.css';

export function MainPage() {
  const demoState = useUiStore((s) => s.demoState);
  const isDayCreated = demoState === 'dayCreated';
  const showBalance = demoState === 'balanceModalOpen';
  const showEditModal = demoState === 'visualEditModal' || demoState === 'markdownEditModal';

  return (
    <div className={`${styles.page} ${isDayCreated ? styles.emotional : ''}`}>
      {isDayCreated && <div className={styles.emotionalBloom} />}
      <Header />
      <main className={styles.main}>
        <HeroPanel />
        <div className={styles.tabRow}>
          <ListTabs />
          <Toolbar />
        </div>
        {isDayCreated && <DayCreatedActions />}
        <TaskList />
      </main>
      {showBalance && <BalanceModal />}
      {showEditModal && <EditTaskModal />}
    </div>
  );
}
