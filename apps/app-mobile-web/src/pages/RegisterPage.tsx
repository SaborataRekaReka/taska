import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { useRegister } from '../hooks/queries';
import styles from './Auth.module.css';

export function RegisterPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const register = useRegister();

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    register.mutate({ email, password, displayName: displayName || undefined });
  }

  return (
    <div className={styles.wrapper}>
      <form className={styles.card} onSubmit={handleSubmit}>
        <h1 className={styles.logo}>TASKA</h1>
        <p className={styles.subtitle}>Создайте аккаунт</p>

        <input
          className={styles.input}
          type="text"
          placeholder="Имя (необязательно)"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          autoFocus
        />
        <input
          className={styles.input}
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <input
          className={styles.input}
          type="password"
          placeholder="Пароль (мин. 6 символов)"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={6}
        />

        {register.error && (
          <p className={styles.error}>{register.error.message}</p>
        )}

        <button className={styles.button} type="submit" disabled={register.isPending}>
          {register.isPending ? 'Создание...' : 'Зарегистрироваться'}
        </button>

        <p className={styles.link}>
          Уже есть аккаунт? <Link to="/login">Войти</Link>
        </p>
      </form>
    </div>
  );
}
