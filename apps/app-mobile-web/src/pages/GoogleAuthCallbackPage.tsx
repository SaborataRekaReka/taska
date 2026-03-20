import { useEffect, useMemo } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';

import { api } from '../lib/api';
import type { AuthResponse } from '../lib/types';
import { useAuthStore } from '../stores/auth';
import styles from './Auth.module.css';

export function GoogleAuthCallbackPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const setAuth = useAuthStore((state) => state.setAuth);

  const errorMessage = useMemo(() => params.get('error'), [params]);

  useEffect(() => {
    const accessToken = params.get('accessToken');
    const refreshToken = params.get('refreshToken');
    const rawUser = params.get('user');

    if (!accessToken || !refreshToken || !rawUser) {
      return;
    }

    let parsedUser: AuthResponse['user'];
    try {
      parsedUser = JSON.parse(rawUser) as AuthResponse['user'];
    } catch {
      navigate('/login?error=google_payload_invalid', { replace: true });
      return;
    }

    setAuth(parsedUser, accessToken, refreshToken);

    void (async () => {
      try {
        const freshUser = await api.get<AuthResponse['user']>('/auth/me');
        setAuth(freshUser, accessToken, refreshToken);
      } catch {
        // keep optimistic OAuth payload if /auth/me is temporarily unavailable
      } finally {
        navigate('/app', { replace: true });
      }
    })();
  }, [navigate, params, setAuth]);

  return (
    <div className={styles.wrapper}>
      <div className={styles.card}>
        <h1 className={styles.logo}>Google OAuth</h1>
        {errorMessage ? (
          <>
            <p className={styles.error}>Не удалось завершить вход: {errorMessage}</p>
            <Link className={styles.secondaryButton} to="/">Вернуться на главную</Link>
          </>
        ) : (
          <p className={styles.subtitle}>Завершаем вход и загружаем ваш профиль Google…</p>
        )}
      </div>
    </div>
  );
}
