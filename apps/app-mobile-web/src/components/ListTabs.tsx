import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useUiStore } from '../stores/ui';
import { DEMO_LISTS } from '../lib/demoData';
import { SMART_LISTS, getSmartListCount, type SmartListId } from '../lib/smartLists';
import { DropdownMenu } from './DropdownMenu';
import styles from './ListTabs.module.css';

const BASE_TAB_ORDER = ['no-list', 'my-day', 'work', 'personal', 'study'] as const;

interface IndicatorStyle {
  left: number;
  width: number;
  visible: boolean;
}

const HIDDEN_INDICATOR: IndicatorStyle = {
  left: 0,
  width: 0,
  visible: false,
};

export function ListTabs() {
  const demoState = useUiStore((s) => s.demoState);
  const activeListId = useUiStore((s) => s.activeListId);
  const activeSmartListId = useUiStore((s) => s.activeSmartListId);
  const isMyDaySaved = useUiStore((s) => s.isMyDaySaved);
  const isTempListVisible = useUiStore((s) => s.isTempListVisible);
  const isTempListSaved = useUiStore((s) => s.isTempListSaved);
  const openMyDayModal = useUiStore((s) => s.openMyDayModal);
  const closeMyDayModal = useUiStore((s) => s.closeMyDayModal);
  const setActiveList = useUiStore((s) => s.setActiveList);
  const setActiveSmartList = useUiStore((s) => s.setActiveSmartList);
  const saveTempList = useUiStore((s) => s.saveTempList);
  const demoTasks = useUiStore((s) => s.demoTasks);

  const [activeTab, setActiveTab] = useState<string>('work');
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState('');
  const [indicatorStyle, setIndicatorStyle] = useState<IndicatorStyle>(HIDDEN_INDICATOR);

  const tabsRef = useRef<HTMLDivElement | null>(null);
  const tabRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const isBalance = demoState === 'balanceModalOpen' || demoState === 'dayCreated';
  const tabFromStore = (() => {
    if (activeSmartListId) {
      return `smart:${activeSmartListId}`;
    }

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

  const updateIndicator = useCallback(() => {
    const tabsNode = tabsRef.current;
    const activeId = currentActiveTab ?? visibleTabs[0] ?? null;

    if (!tabsNode || !activeId) {
      setIndicatorStyle(HIDDEN_INDICATOR);
      return;
    }

    const activeNode = tabRefs.current[activeId];

    if (!activeNode) {
      setIndicatorStyle(HIDDEN_INDICATOR);
      return;
    }

    const tabsRect = tabsNode.getBoundingClientRect();
    const activeRect = activeNode.getBoundingClientRect();

    setIndicatorStyle({
      left: activeRect.left - tabsRect.left,
      width: activeRect.width,
      visible: true,
    });
  }, [currentActiveTab, visibleTabs]);

  useLayoutEffect(() => {
    const frameId = requestAnimationFrame(updateIndicator);

    return () => cancelAnimationFrame(frameId);
  }, [updateIndicator, adding]);

  useEffect(() => {
    function onResize() {
      updateIndicator();
    }

    window.addEventListener('resize', onResize);

    return () => {
      window.removeEventListener('resize', onResize);
    };
  }, [updateIndicator]);

  function getLabel(id: string): string {
    if (id === 'my-day') return 'Мой день';
    return DEMO_LISTS.find((l) => l.id === id)?.name ?? id;
  }

  function handleTabClick(id: string): void {
    setActiveTab(id);

    if (id.startsWith('smart:')) {
      setActiveSmartList(id.replace('smart:', '') as SmartListId);
      closeMyDayModal();
      return;
    }

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
      <div className={styles.tabs} ref={tabsRef}>
        <span
          className={`${styles.activeIndicator} ${indicatorStyle.visible ? styles.activeIndicatorVisible : ''}`}
          style={{
            left: `${indicatorStyle.left}px`,
            width: `${indicatorStyle.width}px`,
          }}
          aria-hidden
        />

        <div className={styles.metaGroup}>
          {SMART_LISTS.map((smartList) => {
            const tabId = `smart:${smartList.id}`;
            const isActive = currentActiveTab === tabId;
            const count = getSmartListCount(demoTasks, smartList.id);

            return (
              <div
                key={smartList.id}
                ref={(node) => {
                  tabRefs.current[tabId] = node;
                }}
                className={`${styles.tab} ${isActive ? styles.active : ''}`}
              >
                <button type="button" className={styles.tabMain} onClick={() => handleTabClick(tabId)}>
                  <span>{smartList.label}</span>
                  {count > 0 && <span className={styles.badge}>{count}</span>}
                </button>
              </div>
            );
          })}
        </div>

        <span className={styles.groupDivider} aria-hidden />

        {visibleTabs.map((id) => {
          const isActive = currentActiveTab === id;

          return (
            <div
              key={id}
              ref={(node) => {
                tabRefs.current[id] = node;
              }}
              className={`${styles.tab} ${isActive ? styles.active : ''}`}
            >
              <button type="button" className={styles.tabMain} onClick={() => handleTabClick(id)}>
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
              </button>
            </div>
          );
        })}

        {adding ? (
          <input
            className={styles.addInput}
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                setAdding(false);
              }
            }}
            onBlur={() => setAdding(false)}
            placeholder="Название..."
            autoFocus
          />
        ) : (
          <DropdownMenu
            items={[
              {
                id: 'new-list',
                label: 'Новый список',
                onSelect: () => setAdding(true),
              },
              {
                id: 'rename-list',
                label: 'Переименовать',
                onSelect: () => undefined,
              },
              {
                id: 'delete-list',
                label: 'Удалить',
                onSelect: () => undefined,
                danger: true,
              },
            ]}
            triggerAriaLabel="Действия списков"
            triggerClassName={styles.panelMenuTrigger}
          />
        )}
      </div>
    </div>
  );
}
