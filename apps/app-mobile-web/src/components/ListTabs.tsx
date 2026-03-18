import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { CSSProperties, PointerEvent as ReactPointerEvent } from 'react';
import clockIcon from '../assests/clock.svg';
import { useUiStore } from '../stores/ui';
import { DropdownMenu } from './DropdownMenu';
import styles from './ListTabs.module.css';

const BASE_TAB_ORDER = ['my-day', 'all', 'work', 'personal', 'study', 'no-list'] as const;
const STATIC_LIST_IDS = ['work', 'personal', 'study', 'no-list', 'temp'] as const;

const URGENCY_OPTIONS = [
  { id: null, label: 'Любая' },
  { id: 'OVERDUE', label: 'Просрочено' },
  { id: 'TODAY', label: 'Сегодня' },
  { id: 'NEXT_24_HOURS', label: '24 часа' },
] as const;

const PRIORITY_OPTIONS = [
  { id: null, label: 'Любой', color: '#94a3b8', bg: 'rgba(148, 163, 184, 0.20)' },
  { id: 'LOW', label: 'Низкий', color: '#22c55e', bg: 'rgba(34, 197, 94, 0.12)' },
  { id: 'MEDIUM', label: 'Средний', color: '#3b82f6', bg: 'rgba(59, 130, 246, 0.12)' },
  { id: 'HIGH', label: 'Высокий', color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.14)' },
  { id: 'CRITICAL', label: 'Критичный', color: '#e00000', bg: 'rgba(224, 0, 0, 0.07)' },
] as const;

type OpenMenu = 'urgency' | 'priority' | null;

interface IndicatorStyle {
  left: number;
  width: number;
  visible: boolean;
}

interface TabDragState {
  active: boolean;
  pointerId: number | null;
  startX: number;
  startScrollLeft: number;
  moved: boolean;
  captured: boolean;
}

const HIDDEN_INDICATOR: IndicatorStyle = {
  left: 0,
  width: 0,
  visible: false,
};

export function ListTabs() {
  const demoState = useUiStore((s) => s.demoState);
  const demoLists = useUiStore((s) => s.demoLists);
  const activeListId = useUiStore((s) => s.activeListId);
  const isMyDaySaved = useUiStore((s) => s.isMyDaySaved);
  const isTempListVisible = useUiStore((s) => s.isTempListVisible);
  const isTempListSaved = useUiStore((s) => s.isTempListSaved);
  const openMyDayModal = useUiStore((s) => s.openMyDayModal);
  const closeMyDayModal = useUiStore((s) => s.closeMyDayModal);
  const setActiveList = useUiStore((s) => s.setActiveList);
  const addDemoList = useUiStore((s) => s.addDemoList);
  const saveTempList = useUiStore((s) => s.saveTempList);
  const filterUrgency = useUiStore((s) => s.filterUrgency);
  const setFilterUrgency = useUiStore((s) => s.setFilterUrgency);
  const filterPriority = useUiStore((s) => s.filterPriority);
  const setFilterPriority = useUiStore((s) => s.setFilterPriority);

  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState('');
  const [openMenu, setOpenMenu] = useState<OpenMenu>(null);
  const [indicatorStyle, setIndicatorStyle] = useState<IndicatorStyle>(HIDDEN_INDICATOR);
  const [isIndicatorAnimated, setIsIndicatorAnimated] = useState(false);
  const [isTabsDragging, setIsTabsDragging] = useState(false);
  const [fixedActionsWidth, setFixedActionsWidth] = useState(0);

  const tabsRef = useRef<HTMLDivElement | null>(null);
  const tabRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const rootRef = useRef<HTMLDivElement | null>(null);
  const fixedActionsRef = useRef<HTMLDivElement | null>(null);
  const hasPrimedIndicatorRef = useRef(false);
  const dragStateRef = useRef<TabDragState>({
    active: false,
    pointerId: null,
    startX: 0,
    startScrollLeft: 0,
    moved: false,
    captured: false,
  });
  const suppressTabClickRef = useRef(false);
  const suppressClickTimeoutRef = useRef<number | null>(null);

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

  const currentActiveTab = tabFromStore ?? 'all';

  const noListCount = demoLists.find((l) => l.id === 'no-list')?._count.tasks ?? 0;
  const customTabIds = demoLists
    .map((list) => list.id)
    .filter((id) => !STATIC_LIST_IDS.includes(id as (typeof STATIC_LIST_IDS)[number]));
  const tabOrder = [
    ...BASE_TAB_ORDER.filter((id) => id !== 'no-list'),
    ...customTabIds,
    ...(isTempListVisible ? ['temp', 'no-list'] : ['no-list']),
  ];

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

    if (!hasPrimedIndicatorRef.current) {
      hasPrimedIndicatorRef.current = true;
      requestAnimationFrame(() => {
        setIsIndicatorAnimated(true);
      });
    }
  }, [currentActiveTab, visibleTabs]);

  useLayoutEffect(() => {
    let nestedFrameId = 0;
    const frameId = requestAnimationFrame(() => {
      updateIndicator();
      nestedFrameId = requestAnimationFrame(updateIndicator);
    });

    return () => {
      cancelAnimationFrame(frameId);
      cancelAnimationFrame(nestedFrameId);
    };
  }, [updateIndicator, adding, visibleTabs.length]);

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
    if (typeof ResizeObserver === 'undefined') {
      return;
    }

    const tabsNode = tabsRef.current;
    const activeId = currentActiveTab ?? visibleTabs[0] ?? null;
    const activeNode = activeId ? tabRefs.current[activeId] : null;

    if (!tabsNode) {
      return;
    }

    const observer = new ResizeObserver(() => {
      updateIndicator();
    });

    observer.observe(tabsNode);
    if (activeNode) {
      observer.observe(activeNode);
    }

    return () => observer.disconnect();
  }, [currentActiveTab, updateIndicator, visibleTabs]);

  useEffect(() => {
    if (!('fonts' in document)) {
      return;
    }

    const fonts = document.fonts;
    let disposed = false;

    const remeasure = () => {
      if (disposed) {
        return;
      }

      requestAnimationFrame(updateIndicator);
    };

    const onFontsUpdated = () => {
      remeasure();
    };

    fonts.addEventListener('loadingdone', onFontsUpdated);
    fonts.addEventListener('loadingerror', onFontsUpdated);
    fonts.ready.then(remeasure).catch(() => undefined);

    return () => {
      disposed = true;
      fonts.removeEventListener('loadingdone', onFontsUpdated);
      fonts.removeEventListener('loadingerror', onFontsUpdated);
    };
  }, [updateIndicator]);

  useEffect(() => {
    if (!openMenu) {
      return;
    }

    function handleKeyDown(event: KeyboardEvent): void {
      if (event.key === 'Escape') {
        setOpenMenu(null);
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [openMenu]);

  useLayoutEffect(() => {
    const node = fixedActionsRef.current;
    if (!node) {
      return;
    }

    const measure = () => {
      setFixedActionsWidth(Math.ceil(node.getBoundingClientRect().width));
    };

    measure();

    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', measure);
      return () => window.removeEventListener('resize', measure);
    }

    const observer = new ResizeObserver(() => {
      measure();
    });

    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    return () => {
      document.body.style.removeProperty('user-select');
      if (suppressClickTimeoutRef.current !== null) {
        window.clearTimeout(suppressClickTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    function handleWindowPointerEnd(): void {
      if (dragStateRef.current.active) {
        stopTabsDrag();
      }
    }

    window.addEventListener('pointerup', handleWindowPointerEnd);
    window.addEventListener('pointercancel', handleWindowPointerEnd);

    return () => {
      window.removeEventListener('pointerup', handleWindowPointerEnd);
      window.removeEventListener('pointercancel', handleWindowPointerEnd);
    };
  }, []);

  function stopTabsDrag(): void {
    const tabsNode = tabsRef.current;
    const dragState = dragStateRef.current;

    if (!dragState.active) {
      return;
    }

    if (tabsNode && dragState.pointerId !== null && dragState.captured) {
      try {
        tabsNode.releasePointerCapture(dragState.pointerId);
      } catch {
        // Pointer might already be released by the browser.
      }
    }

    const hasMoved = dragState.moved;
    dragStateRef.current = {
      active: false,
      pointerId: null,
      startX: 0,
      startScrollLeft: 0,
      moved: false,
      captured: false,
    };
    setIsTabsDragging(false);
    document.body.style.removeProperty('user-select');

    if (!hasMoved) {
      return;
    }

    suppressTabClickRef.current = true;
    if (suppressClickTimeoutRef.current !== null) {
      window.clearTimeout(suppressClickTimeoutRef.current);
    }

    suppressClickTimeoutRef.current = window.setTimeout(() => {
      suppressTabClickRef.current = false;
      suppressClickTimeoutRef.current = null;
    }, 0);
  }

  function handleTabsPointerDown(event: ReactPointerEvent<HTMLDivElement>): void {
    if (event.button !== 0) {
      return;
    }

    const target = event.target as HTMLElement | null;
    if (target?.closest('input, textarea, select')) {
      return;
    }

    const tabsNode = tabsRef.current;
    if (!tabsNode) {
      return;
    }

    dragStateRef.current = {
      active: true,
      pointerId: event.pointerId,
      startX: event.clientX,
      startScrollLeft: tabsNode.scrollLeft,
      moved: false,
      captured: false,
    };
  }

  function handleTabsPointerMove(event: ReactPointerEvent<HTMLDivElement>): void {
    const tabsNode = tabsRef.current;
    const dragState = dragStateRef.current;

    if (!tabsNode || !dragState.active || dragState.pointerId !== event.pointerId) {
      return;
    }

    const deltaX = event.clientX - dragState.startX;
    if (!dragState.moved && Math.abs(deltaX) > 4) {
      dragState.moved = true;
      document.body.style.userSelect = 'none';
      setIsTabsDragging(true);
    }

    if (dragState.moved && !dragState.captured) {
      tabsNode.setPointerCapture(event.pointerId);
      dragState.captured = true;
    }

    if (!dragState.moved) {
      return;
    }

    event.preventDefault();
    tabsNode.scrollLeft = dragState.startScrollLeft - deltaX;
  }

  function handleTabsPointerUp(event: ReactPointerEvent<HTMLDivElement>): void {
    if (dragStateRef.current.pointerId !== event.pointerId) {
      return;
    }

    stopTabsDrag();
  }

  function handleTabsPointerCancel(event: ReactPointerEvent<HTMLDivElement>): void {
    if (dragStateRef.current.pointerId !== event.pointerId) {
      return;
    }

    stopTabsDrag();
  }

  function getLabel(id: string): string {
    if (id === 'my-day') return 'Мой день';
    if (id === 'all') return 'Все';
    return demoLists.find((l) => l.id === id)?.name ?? id;
  }

  function closeAddInput(): void {
    setAdding(false);
    setNewName('');
  }

  function submitNewList(): void {
    const createdOrExistingListId = addDemoList(newName);

    if (!createdOrExistingListId) {
      return;
    }

    setActiveList(createdOrExistingListId);
    closeMyDayModal();
    closeAddInput();
  }

  function handleTabClick(id: string): void {
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
  const tabsViewportStyle = {
    '--fixed-actions-width': `${fixedActionsWidth}px`,
  } as CSSProperties;

  return (
    <div className={styles.bar} ref={rootRef}>
      {openMenu && (
        <div
          className={styles.menuBackdrop}
          aria-hidden
          onPointerDown={(event) => {
            event.preventDefault();
            setOpenMenu(null);
          }}
        />
      )}

      <div className={styles.tabsViewport} style={tabsViewportStyle}>
        <div
          className={`${styles.tabs} ${isTabsDragging ? styles.tabsDragging : ''}`}
          ref={tabsRef}
          onPointerDown={handleTabsPointerDown}
          onPointerMove={handleTabsPointerMove}
          onPointerUp={handleTabsPointerUp}
          onPointerCancel={handleTabsPointerCancel}
        >
          <span
            className={`${styles.activeIndicator} ${indicatorStyle.visible ? styles.activeIndicatorVisible : ''} ${!isIndicatorAnimated ? styles.activeIndicatorNoTransition : ''}`}
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
                <button
                  type="button"
                  className={styles.tabMain}
                  onClick={() => {
                    if (suppressTabClickRef.current) {
                      return;
                    }

                    handleTabClick(id);
                  }}
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
                  closeAddInput();
                }

                if (e.key === 'Enter') {
                  e.preventDefault();
                  submitNewList();
                }
              }}
              onBlur={closeAddInput}
              placeholder="Название..."
              autoFocus
            />
          )}
        </div>
      </div>

      <div className={styles.fixedActions} ref={fixedActionsRef}>
        <button
          type="button"
          className={styles.plusBtn}
          aria-label="Добавить список"
          onClick={() => {
            setNewName('');
            setAdding(true);
          }}
        >
          +
        </button>

        <DropdownMenu
          items={[
            {
              id: 'new-list',
              label: 'Новый список',
              onSelect: () => {
                setNewName('');
                setAdding(true);
              },
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
            <img src={clockIcon} className={styles.urgencyIcon} alt="" aria-hidden />
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
              className={`${styles.priorityDot} ${styles.priorityDotStrong}`}
              style={{ background: priorityOption.color }}
            />
          </button>

          {openMenu === 'priority' && (
            <div className={`${styles.menu} ${styles.priorityMenu}`} role="menu">
              {PRIORITY_OPTIONS.map((option) => (
                <button
                  key={option.id ?? 'all'}
                  type="button"
                  className={`${styles.priorityMenuItem} ${filterPriority === option.id ? styles.priorityMenuItemSelected : ''}`}
                  style={{ background: option.bg }}
                  aria-label={option.label}
                  onClick={() => {
                    setFilterPriority(option.id);
                    setOpenMenu(null);
                  }}
                >
                  <span
                    className={`${styles.priorityDot} ${styles.priorityDotStrong}`}
                    style={{ background: option.color }}
                  />
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
