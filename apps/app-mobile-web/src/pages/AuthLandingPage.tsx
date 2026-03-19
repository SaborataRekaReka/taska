import { Link, Navigate } from 'react-router-dom';

import { GoogleAuthButton } from '../components/GoogleAuthButton';
import { useAuthStore } from '../stores/auth';
import styles from './Auth.module.css';

export function AuthLandingPage() {
  const user = useAuthStore((state) => state.user);

  if (user) {
    return <Navigate to="/app" replace />;
  }

  return (
    <div className={styles.wrapper}>
      <div className={styles.card}>
        <h1 className={styles.logo}>TASKA</h1>
        <p className={styles.subtitle}>Главная точка входа: обычный логин или стандартный Google OAuth.</p>
        <GoogleAuthButton label="Продолжить через Google" />
        <div className={styles.separator}><span>или</span></div>
        <Link className={styles.secondaryButton} to="/login">Войти по email</Link>
        <Link className={styles.ghostButton} to="/register">Создать аккаунт</Link>
      </div>
    </div>
  );
}
