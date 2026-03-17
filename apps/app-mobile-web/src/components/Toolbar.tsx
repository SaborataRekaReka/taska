import { useEffect, useMemo, useRef, useState } from 'react';
import { useUiStore } from '../stores/ui';
import styles from './Toolbar.module.css';

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
  { id: 'CRITICAL', label: 'Критичный', color: '#ef4444' },
] as const;

type OpenMenu = 'urgency' | 'priority' | null;

export function Toolbar() {
  const query = useUiStore((s) => s.searchQuery);
  const setSearch = useUiStore((s) => s.setSearch);
  const filterUrgency = useUiStore((s) => s.filterUrgency);
  const setFilterUrgency = useUiStore((s) => s.setFilterUrgency);
  const filterPriority = useUiStore((s) => s.filterPriority);
  const setFilterPriority = useUiStore((s) => s.setFilterPriority);

  const [openMenu, setOpenMenu] = useState<OpenMenu>(null);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const shortcutLabel = useMemo(
    () => (navigator.platform.toLowerCase().includes('mac') ? '⌘K' : 'Ctrl K'),
    [],
  );

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpenMenu(null);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        inputRef.current?.focus();
        inputRef.current?.select();
        return;
      }

      if (event.key === 'Escape') {
        setOpenMenu(null);

        if (document.activeElement === inputRef.current) {
          if (query) {
            setSearch('');
          } else {
            inputRef.current?.blur();
          }
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [query, setSearch]);

  const urgencyLabel = URGENCY_OPTIONS.find((item) => item.id === filterUrgency)?.label ?? 'Любая';
  const priorityOption = PRIORITY_OPTIONS.find((item) => item.id === filterPriority) ?? PRIORITY_OPTIONS[0];

  return (
    <div className={styles.toolbar} ref={rootRef}>
      <div className={styles.searchWrap} onClick={() => inputRef.current?.focus()}>
        <svg className={styles.searchIcon} width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
          <circle cx="6" cy="6" r="5" stroke="currentColor" strokeWidth="1.5" />
          <path d="M10 10L13 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
        <input
          ref={inputRef}
          type="search"
          className={styles.searchInput}
          value={query}
          onChange={(event) => setSearch(event.target.value)}
          onKeyDown={(event) => {
            if (event.key !== 'Escape') {
              return;
            }

            if (query) {
              setSearch('');
            } else {
              inputRef.current?.blur();
            }
          }}
          placeholder="Поиск"
          aria-label="Поиск задач"
        />
        {query ? (
          <button
            type="button"
            className={styles.clearBtn}
            aria-label="Очистить поиск"
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => {
              setSearch('');
              inputRef.current?.focus();
              inputRef.current?.select();
            }}
          >
            ×
          </button>
        ) : (
          <span className={styles.kbd}>{shortcutLabel}</span>
        )}
      </div>

      <div className={styles.filterWrap}>
        <button
          type="button"
          className={`${styles.filterBtn} ${openMenu === 'urgency' ? styles.filterBtnOpen : ''}`}
          onClick={() => setOpenMenu((prev) => (prev === 'urgency' ? null : 'urgency'))}
          aria-haspopup="menu"
          aria-expanded={openMenu === 'urgency'}
        >
          <span className={styles.iconText}>
            <svg width="16" height="16" viewBox="0 0 18 18" fill="none" aria-hidden>
              <circle cx="9" cy="9" r="7.2" stroke="currentColor" strokeWidth="1.7" />
              <path d="M9 4.8V9H12.5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
            </svg>
            <span>{`Срочность · ${urgencyLabel}`}</span>
          </span>
          <span className={styles.caret}>▾</span>
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
          className={`${styles.filterBtn} ${openMenu === 'priority' ? styles.filterBtnOpen : ''}`}
          onClick={() => setOpenMenu((prev) => (prev === 'priority' ? null : 'priority'))}
          aria-haspopup="menu"
          aria-expanded={openMenu === 'priority'}
        >
          <span className={styles.priorityGroup}>
            <span className={styles.dot} style={{ background: priorityOption.color }} />
            <span>{`Приоритет · ${priorityOption.label}`}</span>
          </span>
          <span className={styles.caret}>▾</span>
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
                <span className={styles.priorityGroup}>
                  <span className={styles.dot} style={{ background: option.color }} />
                  <span>{option.label}</span>
                </span>
                {filterPriority === option.id && <span className={styles.check}>✓</span>}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
