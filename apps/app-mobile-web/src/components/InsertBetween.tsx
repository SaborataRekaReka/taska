import styles from './InsertBetween.module.css';

export function InsertBetween() {
  return (
    <div className={styles.wrap}>
      <button className={styles.btn}>
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
          <path d="M6 1v10M1 6h10" stroke="white" strokeWidth="2" strokeLinecap="round"/>
        </svg>
      </button>
    </div>
  );
}
