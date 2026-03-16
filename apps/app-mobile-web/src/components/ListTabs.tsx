import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useUiStore } from '../stores/ui';
import { DEMO_LISTS } from '../lib/demoData';
import eyeIcon from '../assests/eye.svg';
import editIcon from '../assests/edit.svg';
import trashIcon from '../assests/trash.svg';
import { DropdownMenu } from './DropdownMenu';
import styles from './ListTabs.module.css';

const BASE_TAB_ORDER = ['no-list', 'my-day', 'work', 'personal', 'study'] as const;
const PRIMARY_VISIBLE_COUNT = 4;
const MORE_TAB_KEY = '__more__';

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
  const [indicatorStyle, setIndicatorStyle] = useState({ left: 0, width: 0, visible: false });

  const tabsRef = useRef<HTMLDivElement | null>(null);
  const tabRefs = useRef<Record<string, HTMLDivElement | null>>({});

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

  const primaryTabs = visibleTabs.slice(0, PRIMARY_VISIBLE_COUNT);
  const secondaryTabs = visibleTabs.slice(PRIMARY_VISIBLE_COUNT);

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

  const isSecondaryActive = secondaryTabs.includes(currentActiveTab ?? '');
  const activeIndicatorKey = isSecondaryActive ? MORE_TAB_KEY : currentActiveTab;

  const moreItems = useMemo(() => {
    const baseItems = secondaryTabs.map((id) => ({
      id: `more-open-${id}`,
      label: getLabel(id),
      onSelect: () => handleTabClick(id),
      icon: eyeIcon,
    }));

    if (secondaryTabs.includes('temp') && !isTempListSaved) {
      return [
        {
          id: 'more-save-temp',
          label: 'Сохранить временный список',
          onSelect: () => saveTempList(),
          icon: editIcon,
        },
        ...baseItems,
      ];
    }

    return baseItems;
  }, [secondaryTabs, isTempListSaved]);

  useLayoutEffect(() => {
    if (!activeIndicatorKey) {
      setIndicatorStyle((prev) => ({ ...prev, visible: false }));
      return;
    }

    const container = tabsRef.current;
    const activeElement = tabRefs.current[activeIndicatorKey];

    if (!container || !activeElement) {
      setIndicatorStyle((prev) => ({ ...prev, visible: false }));
      return;
    }

    const containerRect = container.getBoundingClientRect();
    const activeRect = activeElement.getBoundingClientRect();

    setIndicatorStyle({
      left: activeRect.left - containerRect.left + container.scrollLeft,
      width: activeRect.width,
      visible: true,
    });
  }, [activeIndicatorKey, visibleTabs.join('|'), adding]);

  useEffect(() => {
    const handleResize = () => {
      const container = tabsRef.current;
      const activeElement = activeIndicatorKey ? tabRefs.current[activeIndicatorKey] : null;

      if (!container || !activeElement) {
        return;
      }

      const containerRect = container.getBoundingClientRect();
      const activeRect = activeElement.getBoundingClientRect();

      setIndicatorStyle({
        left: activeRect.left - containerRect.left + container.scrollLeft,
        width: activeRect.width,
        visible: true,
      });
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [activeIndicatorKey]);

  return (
    <div className={styles.bar}>
      <div ref={tabsRef} className={styles.tabs}>
        <span
          className={`${styles.activeIndicator} ${indicatorStyle.visible ? styles.activeIndicatorVisible : ''}`}
          style={{ left: `${indicatorStyle.left}px`, width: `${indicatorStyle.width}px` }}
          aria-hidden
        />

        {primaryTabs.map((id) => {
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
              {isActive && (
                <DropdownMenu
                  items={[
                    {
                      id: `open-${id}`,
                      label: 'Открыть список',
                      onSelect: () => handleTabClick(id),
                      icon: eyeIcon,
                    },
                    {
                      id: `rename-${id}`,
                      label: 'Переименовать (скоро)',
                      onSelect: () => undefined,
                      disabled: true,
                      icon: editIcon,
                    },
                    {
                      id: `delete-${id}`,
                      label: 'Удалить (скоро)',
                      onSelect: () => undefined,
                      disabled: true,
                      danger: true,
                      icon: trashIcon,
                    },
                  ]}
                  triggerAriaLabel={`Меню списка ${getLabel(id)}`}
                  triggerClassName={styles.moreTrigger}
                />
              )}
            </div>
          );
        })}

        {secondaryTabs.length > 0 && (
          <div
            ref={(node) => {
              tabRefs.current[MORE_TAB_KEY] = node;
            }}
            className={`${styles.tab} ${styles.moreTab} ${isSecondaryActive ? styles.active : ''}`}
          >
            <DropdownMenu
              items={moreItems}
              triggerLabel={`Ещё (${secondaryTabs.length})`}
              triggerAriaLabel="Открыть дополнительные списки"
              triggerClassName={styles.moreListsTrigger}
            />
          </div>
        )}

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
          <button type="button" className={styles.addBtn} onClick={() => setAdding(true)}>+</button>
        )}
      </div>
    </div>
  );
}
