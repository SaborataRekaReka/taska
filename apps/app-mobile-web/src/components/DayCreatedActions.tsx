import styles from './DayCreatedActions.module.css';

export function DayCreatedActions() {
  return (
    <div className={styles.bar}>
      <button className={styles.secondary}>
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <path d="M8 2v12M3 5l5-3 5 3M3 11l5 3 5-3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
        Изменить баланс
      </button>
      <button className={styles.primary}>
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <path d="M2 7.5l3.5 3.5L12 4" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
        Сохранить
      </button>
    </div>
  );
}
