import { Header } from '../components/Header';
import { AiPromptBar } from '../components/AiPromptBar';
import { ListTabs } from '../components/ListTabs';
import { Toolbar } from '../components/Toolbar';
import { TaskList } from '../components/TaskList';
import { FloatingAddButton } from '../components/FloatingAddButton';
import { QuickAddTask } from '../components/QuickAddTask';
import { TaskEditModal } from '../components/TaskEditModal';
import { useUiStore } from '../stores/ui';
import styles from './MainPage.module.css';

export function MainPage() {
  const showAddTask = useUiStore((s) => s.showAddTask);
  const editingTaskId = useUiStore((s) => s.editingTaskId);

  return (
    <div className={styles.page}>
      <Header />
      <main className={styles.main}>
        <AiPromptBar />
        <ListTabs />
        <Toolbar />
        {showAddTask && <QuickAddTask />}
        <TaskList />
      </main>
      <FloatingAddButton />
      {editingTaskId && <TaskEditModal />}
    </div>
  );
}
