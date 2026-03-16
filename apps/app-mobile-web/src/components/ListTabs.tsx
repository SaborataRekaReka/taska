import { useState } from 'react';
import { useUiStore } from '../stores/ui';
import { DEMO_LISTS } from '../lib/demoData';
import styles from './ListTabs.module.css';

const BASE_TAB_ORDER = ['no-list', 'my-day', 'work', 'personal', 'study'] as const;

export function ListTabs() {
  const demoState = useUiStore((s) => s.demoState);
  const activeListId = useUiStore((s) => s.activeListId);
  const isMyDaySaved = useUiStore((s) => s.isMyDaySaved);
  const isTempListVisible = useUiStore((s) => s.isTempListVisible);
  const isTempListSaved = useUiStore((s) => s.isTempListSaved);
  const openMyDayModal = useUiStore((s) => s.openMyDayModal);
  const closeMyDayModal = useUiStore((s) => s.closeMyDayModal);
  const setActiveList = useUiStore((s) => s.setActiveList);
  const saveTempList = useUiStore((s) => s.saveTempList);

  const [activeTab, setActiveTab] = useState<string>('work');
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState('');

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

  const currentActiveTab = tabFromStore ?? activeTab;

  const noListCount = DEMO_LISTS.find((l) => l.id === 'no-list')?._count.tasks ?? 0;
  const tabOrder = isTempListVisible ? [...BASE_TAB_ORDER, 'temp'] : BASE_TAB_ORDER;

  const visibleTabs = isBalance
    ? tabOrder.filter((id) => id !== 'no-list')
    : tabOrder;

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
        {visibleTabs.map((id) => {
          const isActive = currentActiveTab === id;

          return (
            <button
              key={id}
              className={`${styles.tab} ${isActive ? styles.active : ''}`}
              onClick={() => handleTabClick(id)}
            >
              <span>{getLabel(id)}</span>
              {id === 'no-list' && noListCount > 0 && <span className={styles.badge}>{noListCount}</span>}
              {id === 'temp' && isTempListVisible && !isTempListSaved && (
                <span
                  className={styles.chevron}
                  role="button"
                  aria-label="Сохранить временный список"
                  onClick={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    saveTempList();
                  }}
                >
                  &#x2713;
                </span>
              )}
              {isActive && (
                <span className={styles.more} aria-hidden>
                  &#8942;
                </span>
              )}
            </button>
          );
        })}
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
