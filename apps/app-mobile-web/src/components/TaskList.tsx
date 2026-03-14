import { DEMO_TASKS } from '../lib/demoData';
import { useUiStore } from '../stores/ui';
import { TaskCard } from './TaskCard';
import { InsertBetween } from './InsertBetween';
import styles from './TaskList.module.css';

export function TaskList() {
  const demoState = useUiStore((s) => s.demoState);
  const showInsert = demoState === 'workListHover' || demoState === 'tempAiList';

  return (
    <div className={styles.list}>
      {DEMO_TASKS.map((task, i) => (
        <div key={task.id}>
          <TaskCard task={task} />
          {showInsert && i < DEMO_TASKS.length - 1 && <InsertBetween />}
        </div>
      ))}
    </div>
  );
}
