import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';

import { GoogleAuthButton } from '../components/GoogleAuthButton';
import { useLogin } from '../hooks/queries';
import styles from './Auth.module.css';

export function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const login = useLogin();

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    login.mutate({ email, password });
  }

  return (
    <div className={styles.wrapper}>
      <form className={styles.card} onSubmit={handleSubmit}>
        <h1 className={styles.logo}>TASKA</h1>
        <p className={styles.subtitle}>Войдите в аккаунт</p>
        <GoogleAuthButton />
        <div className={styles.separator}><span>или</span></div>

        <input
          className={styles.input}
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          autoFocus
        />
        <input
          className={styles.input}
          type="password"
          placeholder="Пароль"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={6}
        />

        {login.error && (
          <p className={styles.error}>{login.error.message}</p>
        )}

        <button className={styles.button} type="submit" disabled={login.isPending}>
          {login.isPending ? 'Вход...' : 'Войти'}
        </button>

        <p className={styles.link}>
          Нет аккаунта? <Link to="/register">Зарегистрироваться</Link>
        </p>
      </form>
    </div>
  );
}
