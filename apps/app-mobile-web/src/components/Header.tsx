import { useAuthStore } from '../stores/auth';
import { useUiStore } from '../stores/ui';
import aiStarsIcon from '../assests/ai_stars.svg';
import styles from './Header.module.css';

export function Header() {
  const logout = useAuthStore((s) => s.logout);
  const openMyDayModal = useUiStore((s) => s.openMyDayModal);

  return (
    <header className={styles.header}>
      <div className={styles.inner}>
        <div className={styles.left}>
          <span className={styles.logo}>TASKA</span>
        </div>
        <button type="button" className={styles.dayButton} onClick={openMyDayModal}>
          {'\u041c\u043e\u0439 \u0434\u0435\u043d\u044c'}
          <img src={aiStarsIcon} alt="" className={styles.sparkle} />
        </button>
        <div className={styles.right}>
          <button className={styles.logoutBtn} onClick={logout}>
            {'\u0412\u044b\u0445\u043e\u0434'}
          </button>
          <div className={styles.avatar} />
        </div>
      </div>
    </header>
  );
}
