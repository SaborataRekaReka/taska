import { useState } from 'react';
import { useLists, useCreateList } from '../hooks/queries';
import { useUiStore } from '../stores/ui';
import styles from './ListTabs.module.css';

export function ListTabs() {
  const { data: lists } = useLists();
  const activeListId = useUiStore((s) => s.activeListId);
  const setActiveList = useUiStore((s) => s.setActiveList);
  const createList = useCreateList();
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState('');

  const noListCount = lists
    ?.find((l) => l.name === 'Без списка')
    ?._count.tasks ?? 0;

  function handleAdd() {
    if (!newName.trim()) return;
    createList.mutate(newName.trim(), {
      onSuccess: () => { setNewName(''); setAdding(false); },
    });
  }

  return (
    <div className={styles.bar}>
      <div className={styles.tabs}>
        <button
          className={`${styles.tab} ${activeListId === null ? styles.active : ''}`}
          onClick={() => setActiveList(null)}
        >
          Все задачи
        </button>
        <button
          className={`${styles.tab} ${activeListId === '__no_list__' ? styles.active : ''}`}
          onClick={() => setActiveList('__no_list__')}
        >
          Без списка{noListCount > 0 && <span className={styles.badge}>{noListCount}</span>}
        </button>
        <button
          className={`${styles.tab} ${activeListId === '__my_day__' ? styles.active : ''}`}
          onClick={() => setActiveList('__my_day__')}
        >
          Мой день
        </button>
        {lists
          ?.filter((l) => l.name !== 'Без списка')
          .map((list) => (
            <button
              key={list.id}
              className={`${styles.tab} ${activeListId === list.id ? styles.active : ''}`}
              onClick={() => setActiveList(list.id)}
            >
              {list.name}
              {list._count.tasks > 0 && <span className={styles.badge}>{list._count.tasks}</span>}
            </button>
          ))}
        {adding ? (
          <input
            className={styles.addInput}
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleAdd(); if (e.key === 'Escape') setAdding(false); }}
            onBlur={() => { if (!newName.trim()) setAdding(false); }}
            placeholder="Название..."
            autoFocus
          />
        ) : (
          <button className={styles.addBtn} onClick={() => setAdding(true)}>+</button>
        )}
      </div>
    </div>
  );
}
