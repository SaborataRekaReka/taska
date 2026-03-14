import { useEffect, useMemo, useRef } from 'react';
import { useUiStore } from '../stores/ui';
import styles from './Toolbar.module.css';

export function Toolbar() {
  const query = useUiStore((s) => s.searchQuery);
  const setSearch = useUiStore((s) => s.setSearch);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const shortcutLabel = useMemo(() => (navigator.platform.toLowerCase().includes('mac') ? '⌘K' : 'Ctrl K'), []);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        inputRef.current?.focus();
        inputRef.current?.select();
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <div className={styles.toolbar}>
      <div className={styles.searchWrap} onClick={() => inputRef.current?.focus()}>
        <svg className={styles.searchIcon} width="14" height="14" viewBox="0 0 14 14" fill="none">
          <circle cx="6" cy="6" r="5" stroke="currentColor" strokeWidth="1.5"/>
          <path d="M10 10L13 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
        </svg>
        <input
          ref={inputRef}
          type="search"
          className={styles.searchInput}
          value={query}
          onChange={(e) => setSearch(e.target.value)}
          onClick={(e) => e.stopPropagation()}
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              if (query) {
                setSearch('');
              } else {
                inputRef.current?.blur();
              }
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
      <button className={styles.filterBtn}>
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <path d="M1 3h12M3 7h8M5 11h4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
        </svg>
        <span>Фильтр</span>
      </button>
    </div>
  );
}
