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
        </div>
        <div className={styles.right}>
          <span className={styles.name}>{user?.displayName ?? user?.email}</span>
          <button className={styles.logoutBtn} onClick={logout}>
            Выход
          </button>
        </div>
      </div>
    </header>
  );
}
