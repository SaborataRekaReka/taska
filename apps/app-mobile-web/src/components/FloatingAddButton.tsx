import { useUiStore } from '../stores/ui';
import styles from './FloatingAddButton.module.css';

export function FloatingAddButton() {
  const toggle = useUiStore((s) => s.toggleAddTask);

  return (
    <button className={styles.fab} onClick={toggle} aria-label="Добавить задачу">
      +
    </button>
  );
}
