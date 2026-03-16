import { useState } from 'react';
import { useUiStore } from '../stores/ui';
import { DEMO_LISTS } from '../lib/demoData';
import styles from './ListTabs.module.css';

const TAB_ORDER = ['no-list', 'my-day', 'work', 'personal', 'study', 'temp'] as const;

export function ListTabs() {
  const demoState = useUiStore((s) => s.demoState);
  const activeListId = useUiStore((s) => s.activeListId);
  const isMyDaySaved = useUiStore((s) => s.isMyDaySaved);
  const openMyDayModal = useUiStore((s) => s.openMyDayModal);
  const closeMyDayModal = useUiStore((s) => s.closeMyDayModal);
  const setActiveList = useUiStore((s) => s.setActiveList);

  const [activeTab, setActiveTab] = useState<string>('work');
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState('');

  const isTemp = demoState === 'tempAiList';
  const isBalance = demoState === 'balanceModalOpen' || demoState === 'dayCreated';
  const tabFromStore = (() => {
    if (activeListId === '__my_day__') {
      return 'my-day';
    }

    if (activeListId === '__no_list__') {
      return 'no-list';
    }

    return activeListId;
  })();

  const currentActiveTab = isTemp ? 'temp' : tabFromStore ?? activeTab;

  const noListCount = DEMO_LISTS.find((l) => l.id === 'no-list')?._count.tasks ?? 0;

  const visibleTabs = isBalance
    ? TAB_ORDER.filter((id) => id !== 'no-list')
    : TAB_ORDER;

  function getLabel(id: string): string {
    if (id === 'my-day') return 'Мой день';
    return DEMO_LISTS.find((l) => l.id === id)?.name ?? id;
  }

  function handleTabClick(id: string): void {
    setActiveTab(id);

    if (id === 'my-day') {
      setActiveList('__my_day__');
      if (isMyDaySaved) {
        closeMyDayModal();
      } else {
        openMyDayModal();
      }
      return;
    }

    if (id === 'no-list') {
      setActiveList('__no_list__');
    } else {
      setActiveList(id);
    }

    closeMyDayModal();
  }

  return (
    <div className={styles.bar}>
      <div className={styles.tabs}>
        {visibleTabs.map((id) => (
          <button
            key={id}
            className={`${styles.tab} ${currentActiveTab === id ? styles.active : ''}`}
            onClick={() => handleTabClick(id)}
          >
            {getLabel(id)}
            {id === 'no-list' && noListCount > 0 && <span className={styles.badge}>{noListCount}</span>}
            {id === 'temp' && isTemp && <span className={styles.chevron}>&#x2713;</span>}
          </button>
        ))}
        {adding ? (
          <input
            className={styles.addInput}
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Escape') setAdding(false); }}
            onBlur={() => setAdding(false)}
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
