import { useMemo } from 'react';

import aiStarsIcon from '../assests/ai_stars.svg';
import { useAuthStore } from '../stores/auth';
import { useUiStore } from '../stores/ui';
import styles from './Header.module.css';

function getInitials(displayName: string | null, email: string): string {
  const source = displayName?.trim() || email;
  return source
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
}

export function Header() {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const openMyDayModal = useUiStore((s) => s.openMyDayModal);

  const initials = useMemo(() => {
    if (!user) {
      return 'T';
    }
    return getInitials(user.displayName, user.email);
  }, [user]);

  return (
    <header className={styles.header}>
      <div className={styles.inner}>
        <div className={styles.left}>
          <span className={styles.logo}>TASKA</span>
        </div>
        <button type="button" className={styles.dayButton} onClick={openMyDayModal}>
          {'Мой день'}
          <img src={aiStarsIcon} alt="" className={styles.sparkle} />
        </button>
        <div className={styles.right}>
          {user && (
            <div className={styles.profileMeta}>
              <span className={styles.profileName}>{user.displayName || user.givenName || user.email}</span>
              <span className={styles.profileProvider}>{user.provider === 'GOOGLE' ? 'Google account' : 'Email account'}</span>
            </div>
          )}
          <button className={styles.logoutBtn} onClick={logout}>
            {'Выход'}
          </button>
          {user?.avatarUrl ? (
            <img className={styles.avatarImage} src={user.avatarUrl} alt={user.displayName || user.email} />
          ) : (
            <div className={styles.avatar}>{initials}</div>
          )}
        </div>
      </div>
    </header>
  );
}
