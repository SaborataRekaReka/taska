import { useAuthStore } from '../stores/auth';
import styles from './Header.module.css';

export function Header() {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);

  return (
    <header className={styles.header}>
      <div className={styles.inner}>
        <div className={styles.left}>
          <span className={styles.logo}>TASKA</span>
          <span className={styles.day}>Мой день</span>
          <svg className={styles.sparkle} width="18" height="18" viewBox="0 0 18 18" fill="none">
            <path d="M9 0L10.8 6.3L17.1 4.5L12.6 9L17.1 13.5L10.8 11.7L9 18L7.2 11.7L0.9 13.5L5.4 9L0.9 4.5L7.2 6.3L9 0Z" fill="currentColor"/>
          </svg>
        </div>
        <div className={styles.right}>
          <button className={styles.logoutBtn} onClick={logout}>Выход</button>
          <div className={styles.avatar} />
        </div>
      </div>
    </header>
  );
}
