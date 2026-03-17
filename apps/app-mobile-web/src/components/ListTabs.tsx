import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useUiStore } from '../stores/ui';
import { DEMO_LISTS } from '../lib/demoData';
import { DropdownMenu } from './DropdownMenu';
import styles from './ListTabs.module.css';

const BASE_TAB_ORDER = ['my-day', 'all', 'work', 'personal', 'study', 'no-list'] as const;

const URGENCY_OPTIONS = [
  { id: null, label: 'Любая' },
  { id: 'OVERDUE', label: 'Просрочено' },
  { id: 'TODAY', label: 'Сегодня' },
  { id: 'NEXT_24_HOURS', label: '24 часа' },
] as const;

const PRIORITY_OPTIONS = [
  { id: null, label: 'Любой', color: 'transparent' },
  { id: 'LOW', label: 'Низкий', color: '#22c55e' },
  { id: 'MEDIUM', label: 'Средний', color: '#3b82f6' },
  { id: 'HIGH', label: 'Высокий', color: '#f59e0b' },
  { id: 'CRITICAL', label: 'Критичный', color: '#e00000' },
] as const;

type OpenMenu = 'urgency' | 'priority' | null;

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
  const isMyDaySaved = useUiStore((s) => s.isMyDaySaved);
  const isTempListVisible = useUiStore((s) => s.isTempListVisible);
  const isTempListSaved = useUiStore((s) => s.isTempListSaved);
  const openMyDayModal = useUiStore((s) => s.openMyDayModal);
  const closeMyDayModal = useUiStore((s) => s.closeMyDayModal);
  const setActiveList = useUiStore((s) => s.setActiveList);
  const saveTempList = useUiStore((s) => s.saveTempList);
  const filterUrgency = useUiStore((s) => s.filterUrgency);
  const setFilterUrgency = useUiStore((s) => s.setFilterUrgency);
  const filterPriority = useUiStore((s) => s.filterPriority);
  const setFilterPriority = useUiStore((s) => s.setFilterPriority);

  const [activeTab, setActiveTab] = useState<string>('work');
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState('');
  const [openMenu, setOpenMenu] = useState<OpenMenu>(null);
  const [indicatorStyle, setIndicatorStyle] = useState<IndicatorStyle>(HIDDEN_INDICATOR);

  const tabsRef = useRef<HTMLDivElement | null>(null);
  const tabRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const rootRef = useRef<HTMLDivElement | null>(null);

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
  const tabOrder = isTempListVisible
    ? [...BASE_TAB_ORDER.filter((id) => id !== 'no-list'), 'temp', 'no-list']
    : BASE_TAB_ORDER;

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
      left: activeRect.left - tabsRect.left + tabsNode.scrollLeft,
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

  useEffect(() => {
    const tabsNode = tabsRef.current;

    if (!tabsNode) {
      return;
    }

    function onScroll() {
      updateIndicator();
    }

    tabsNode.addEventListener('scroll', onScroll);

    return () => tabsNode.removeEventListener('scroll', onScroll);
  }, [updateIndicator]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpenMenu(null);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  function getLabel(id: string): string {
    if (id === 'my-day') return 'Мой день';
    if (id === 'all') return 'Все';
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

    if (id === 'all') {
      setActiveList(null);
      closeMyDayModal();
      return;
    }

    if (id === 'no-list') {
      setActiveList('__no_list__');
    } else {
      setActiveList(id);
    }

    closeMyDayModal();
  }

  const priorityOption = PRIORITY_OPTIONS.find((item) => item.id === filterPriority) ?? PRIORITY_OPTIONS[0];

  return (
    <div className={styles.bar} ref={rootRef}>
      <div className={styles.tabsViewport}>
        <div className={styles.tabs} ref={tabsRef}>
          <span
            className={`${styles.activeIndicator} ${indicatorStyle.visible ? styles.activeIndicatorVisible : ''}`}
            style={{
              left: `${indicatorStyle.left}px`,
              width: `${indicatorStyle.width}px`,
            }}
            aria-hidden
          />

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

          {adding && (
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
          )}
        </div>
      </div>

      <div className={styles.fixedActions}>
        <button type="button" className={styles.plusBtn} aria-label="Добавить список" onClick={() => setAdding(true)}>
          +
        </button>

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

        <div className={styles.filterWrap}>
          <button
            type="button"
            className={`${styles.iconBtn} ${openMenu === 'urgency' ? styles.iconBtnOpen : ''}`}
            onClick={() => setOpenMenu((prev) => (prev === 'urgency' ? null : 'urgency'))}
            aria-haspopup="menu"
            aria-expanded={openMenu === 'urgency'}
            aria-label="Фильтр по срочности"
          >
            <svg width="20" height="20" viewBox="0 0 18 18" fill="none" aria-hidden>
              <circle cx="9" cy="9" r="7.2" stroke="currentColor" strokeWidth="1.7" />
              <path d="M9 4.8V9H12.5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
            </svg>
          </button>

          {openMenu === 'urgency' && (
            <div className={styles.menu} role="menu">
              {URGENCY_OPTIONS.map((option) => (
                <button
                  key={option.id ?? 'all'}
                  type="button"
                  className={styles.menuItem}
                  onClick={() => {
                    setFilterUrgency(option.id);
                    setOpenMenu(null);
                  }}
                >
                  <span>{option.label}</span>
                  {filterUrgency === option.id && <span className={styles.check}>✓</span>}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className={styles.filterWrap}>
          <button
            type="button"
            className={`${styles.iconBtn} ${styles.priorityBtn} ${openMenu === 'priority' ? styles.iconBtnOpen : ''}`}
            onClick={() => setOpenMenu((prev) => (prev === 'priority' ? null : 'priority'))}
            aria-haspopup="menu"
            aria-expanded={openMenu === 'priority'}
            aria-label="Фильтр по приоритету"
          >
            <span
              className={`${styles.priorityDot} ${priorityOption.id ? styles.priorityDotStrong : ''}`}
              style={{ background: priorityOption.color }}
            />
          </button>

          {openMenu === 'priority' && (
            <div className={styles.menu} role="menu">
              {PRIORITY_OPTIONS.map((option) => (
                <button
                  key={option.id ?? 'all'}
                  type="button"
                  className={styles.menuItem}
                  onClick={() => {
                    setFilterPriority(option.id);
                    setOpenMenu(null);
                  }}
                >
                  <span className={styles.priorityItem}>
                    <span
                      className={`${styles.priorityDot} ${option.id ? styles.priorityDotStrong : ''}`}
                      style={{ background: option.color }}
                    />
                    <span>{option.label}</span>
                  </span>
                  {filterPriority === option.id && <span className={styles.check}>✓</span>}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
