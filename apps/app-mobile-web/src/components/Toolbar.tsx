import { useEffect, useMemo, useRef, useState } from 'react';
import { SMART_LISTS, getSmartListCount } from '../lib/smartLists';
import { useUiStore } from '../stores/ui';
import { DropdownMenu } from './DropdownMenu';
import styles from './Toolbar.module.css';

export function Toolbar() {
  const query = useUiStore((s) => s.searchQuery);
  const setSearch = useUiStore((s) => s.setSearch);
  const activeSmartListId = useUiStore((s) => s.activeSmartListId);
  const setActiveSmartList = useUiStore((s) => s.setActiveSmartList);
  const demoTasks = useUiStore((s) => s.demoTasks);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const searchPanelRef = useRef<HTMLDivElement | null>(null);
  const shortcutLabel = useMemo(() => (navigator.platform.toLowerCase().includes('mac') ? '⌘K' : 'Ctrl K'), []);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setIsSearchOpen(true);
        requestAnimationFrame(() => {
          inputRef.current?.focus();
          inputRef.current?.select();
        });
      }

      if (event.key === 'Escape' && isSearchOpen && !query) {
        setIsSearchOpen(false);
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isSearchOpen, query]);

  useEffect(() => {
    if (!isSearchOpen) {
      return;
    }

    function handleClickOutside(event: MouseEvent) {
      if (!searchPanelRef.current?.contains(event.target as Node)) {
        setIsSearchOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isSearchOpen]);

  return (
    <div className={styles.toolbar}>
      <div ref={searchPanelRef} className={styles.searchSlot}>
        <button
          type="button"
          className={`${styles.iconBtn} ${query || isSearchOpen ? styles.iconBtnActive : ''}`}
          aria-label="Поиск"
          onClick={() => {
            setIsSearchOpen((prev) => !prev);
            requestAnimationFrame(() => {
              inputRef.current?.focus();
              inputRef.current?.select();
            });
          }}
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <circle cx="6" cy="6" r="5" stroke="currentColor" strokeWidth="1.5"/>
            <path d="M10 10L13 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
        </button>

        {isSearchOpen && (
          <div className={styles.searchPanel}>
            <input
              ref={inputRef}
              type="search"
              className={styles.searchInput}
              value={query}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Поиск задач"
              aria-label="Поиск задач"
              onKeyDown={(e) => {
                if (e.key === 'Escape') {
                  if (query) {
                    setSearch('');
                  } else {
                    setIsSearchOpen(false);
                  }
                }
              }}
            />
            {query ? (
              <button
                type="button"
                className={styles.clearBtn}
                aria-label="Очистить поиск"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  setSearch('');
                  inputRef.current?.focus();
                }}
              >
                ×
              </button>
            ) : (
              <span className={styles.kbd}>{shortcutLabel}</span>
            )}
          </div>
        )}
      </div>

      <DropdownMenu
        triggerAriaLabel="Фильтры задач"
        triggerClassName={`${styles.iconBtn} ${activeSmartListId ? styles.iconBtnActive : ''}`}
        items={[
          {
            id: 'all',
            label: 'Все задачи',
            onSelect: () => setActiveSmartList(null),
          },
          ...SMART_LISTS.map((smartList) => ({
            id: smartList.id,
            label: `${activeSmartListId === smartList.id ? '✓ ' : ''}${smartList.label}${(() => {
              const count = getSmartListCount(demoTasks, smartList.id);
              return count > 0 ? ` (${count})` : '';
            })()}`,
            onSelect: () => setActiveSmartList(smartList.id),
          })),
        ]}
      />
    </div>
  );
}
