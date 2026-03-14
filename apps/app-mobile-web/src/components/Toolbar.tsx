import styles from './Toolbar.module.css';

export function Toolbar() {
  return (
    <div className={styles.toolbar}>
      <div className={styles.searchWrap}>
        <svg className={styles.searchIcon} width="14" height="14" viewBox="0 0 14 14" fill="none">
          <circle cx="6" cy="6" r="5" stroke="currentColor" strokeWidth="1.5"/>
          <path d="M10 10L13 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
        </svg>
        <span className={styles.searchText}>Поиск</span>
        <span className={styles.kbd}>&#x2318;K</span>
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
