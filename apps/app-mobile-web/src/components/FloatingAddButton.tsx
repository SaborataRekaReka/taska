import styles from './FloatingAddButton.module.css';

export function FloatingAddButton() {
  return (
    <button className={styles.fab}>
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
        <path d="M7 1v12M1 7h12" stroke="white" strokeWidth="2.2" strokeLinecap="round"/>
      </svg>
    </button>
  );
}
