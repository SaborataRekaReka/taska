import { useState, type KeyboardEvent } from 'react';
import { useCreateTask } from '../hooks/queries';
import { useUiStore } from '../stores/ui';
import styles from './QuickAddTask.module.css';

export function QuickAddTask() {
  const [title, setTitle] = useState('');
  const createTask = useCreateTask();
  const activeListId = useUiStore((s) => s.activeListId);
  const toggle = useUiStore((s) => s.toggleAddTask);

  function handleKeyDown(e: KeyboardEvent) {
    if (e.key === 'Enter' && title.trim()) {
      const listId =
        activeListId && activeListId !== '__no_list__' && activeListId !== '__my_day__'
          ? activeListId
          : undefined;
      createTask.mutate({ title: title.trim(), listId }, {
        onSuccess: () => { setTitle(''); },
      });
    }
    if (e.key === 'Escape') {
      toggle();
    }
  }

  return (
    <div className={styles.wrapper}>
      <input
        className={styles.input}
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Новая задача... (Enter для создания, Esc для отмены)"
        autoFocus
      />
    </div>
  );
}
