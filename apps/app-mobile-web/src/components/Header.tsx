import { useEffect, useMemo, useRef, useState } from 'react';

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

function buildFullName(givenName: string | null, familyName: string | null): string | null {
  const fullName = [givenName, familyName]
    .filter((part): part is string => Boolean(part?.trim()))
    .join(' ')
    .trim();

  return fullName || null;
}

export function Header() {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const openMyDayModal = useUiStore((s) => s.openMyDayModal);
  const theme = useUiStore((s) => s.theme);
  const toggleTheme = useUiStore((s) => s.toggleTheme);
  const [isAccountMenuOpen, setIsAccountMenuOpen] = useState(false);
  const [isAvatarBroken, setIsAvatarBroken] = useState(false);
  const accountMenuRef = useRef<HTMLDivElement | null>(null);

  const initials = useMemo(() => {
    if (!user) {
      return 'T';
    }
    return getInitials(user.displayName, user.email);
  }, [user]);

  const accountLabel = useMemo(() => {
    if (!user) {
      return 'Account';
    }

    const googleFullName = buildFullName(user.givenName, user.familyName);
    return googleFullName || user.displayName || user.email;
  }, [user]);

  const accountEmail = user?.email ?? '';
  const avatarUrl = user?.avatarUrl?.trim() || null;

  useEffect(() => {
    setIsAvatarBroken(false);
  }, [avatarUrl]);

  useEffect(() => {
    if (!isAccountMenuOpen) {
      return;
    }

    function onWindowPointerDown(event: PointerEvent): void {
      const target = event.target;
      if (!accountMenuRef.current || !(target instanceof Node)) {
        return;
      }

      if (!accountMenuRef.current.contains(target)) {
        setIsAccountMenuOpen(false);
      }
    }

    function onWindowKeyDown(event: KeyboardEvent): void {
      if (event.key === 'Escape') {
        setIsAccountMenuOpen(false);
      }
    }

    window.addEventListener('pointerdown', onWindowPointerDown);
    window.addEventListener('keydown', onWindowKeyDown);

    return () => {
      window.removeEventListener('pointerdown', onWindowPointerDown);
      window.removeEventListener('keydown', onWindowKeyDown);
    };
  }, [isAccountMenuOpen]);

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
          <button
            type="button"
            className={styles.themeToggle}
            onClick={toggleTheme}
            aria-pressed={theme === 'quanta-night'}
            aria-label={theme === 'quanta-night' ? 'Switch to default theme' : 'Switch to Quanta night theme'}
            title={theme === 'quanta-night' ? 'Default theme' : 'Quanta night theme'}
          >
            <span className={styles.themeToggleTrack}>
              <span className={styles.themeToggleLabel}>Light</span>
              <span className={styles.themeToggleLabel}>Quanta</span>
              <span
                className={`${styles.themeToggleThumb} ${theme === 'quanta-night' ? styles.themeToggleThumbActive : ''}`}
                aria-hidden
              />
            </span>
          </button>
          {user ? (
            <div ref={accountMenuRef} className={styles.accountMenuRoot}>
              <button
                type="button"
                className={`${styles.accountTrigger} ${isAccountMenuOpen ? styles.accountTriggerActive : ''}`}
                aria-haspopup="menu"
                aria-expanded={isAccountMenuOpen}
                aria-label="Open account menu"
                onClick={() => setIsAccountMenuOpen((prev) => !prev)}
              >
                <div className={styles.profileMeta}>
                  <span className={styles.profileName}>{accountLabel}</span>
                  {accountLabel !== accountEmail ? (
                    <span className={styles.profileProvider}>{accountEmail}</span>
                  ) : null}
                </div>
                {avatarUrl && !isAvatarBroken ? (
                  <img
                    className={styles.avatarImage}
                    src={avatarUrl}
                    alt={accountLabel}
                    referrerPolicy="no-referrer"
                    onError={() => setIsAvatarBroken(true)}
                  />
                ) : (
                  <div className={styles.avatar}>{initials}</div>
                )}
                <span className={styles.accountCaret} aria-hidden>
                  <svg width="10" height="6" viewBox="0 0 10 6" fill="none">
                    <path
                      d="M1 1L5 5L9 1"
                      stroke="currentColor"
                      strokeWidth="1.4"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </span>
              </button>

              {isAccountMenuOpen && (
                <div className={styles.accountMenu} role="menu" aria-label="Account menu">
                  <button
                    type="button"
                    role="menuitem"
                    className={styles.accountMenuItem}
                    onClick={() => setIsAccountMenuOpen(false)}
                  >
                    Profile
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    className={styles.accountMenuItem}
                    onClick={() => setIsAccountMenuOpen(false)}
                  >
                    Settings
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    className={`${styles.accountMenuItem} ${styles.accountMenuItemDanger}`}
                    onClick={() => {
                      setIsAccountMenuOpen(false);
                      logout();
                    }}
                  >
                    Exit
                  </button>
                </div>
              )}
            </div>
          ) : null}
        </div>
      </div>
    </header>
  );
}
