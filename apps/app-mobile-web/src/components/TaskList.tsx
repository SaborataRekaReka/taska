import { useTasks } from '../hooks/queries';
import { TaskCard } from './TaskCard';
import styles from './TaskList.module.css';

export function TaskList() {
  const { data: tasks, isLoading, error } = useTasks();

  if (isLoading) {
    return <div className={styles.empty}>Загрузка...</div>;
  }

  if (error) {
    return <div className={styles.empty}>Ошибка загрузки задач</div>;
  }

  if (!tasks?.length) {
    return <div className={styles.empty}>Нет задач</div>;
  }

  return (
    <div className={styles.list}>
      {tasks.map((task) => (
        <TaskCard key={task.id} task={task} />
      ))}
    </div>
  );
}
