import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';

import logo from '../assests/logo.svg';
import { GoogleAuthButton } from '../components/GoogleAuthButton';
import { useLogin } from '../hooks/queries';
import styles from './LoginPage.module.css';

export function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const login = useLogin();

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    login.mutate({ email, password });
  }

  return (
    <div className={styles.page}>
      <div className={styles.shell}>
        <aside className={styles.heroPane}>
          <div className={styles.brandRow}>
            <img src={logo} alt="TASKA" className={styles.brandLogo} />
          </div>

          <div className={styles.heroCopy}>
            <p className={styles.heroKicker}>smart focus workspace</p>
            <h2>{'\u041f\u043b\u0430\u043d\u0438\u0440\u0443\u0439\u0442\u0435 \u0434\u0435\u043d\u044c \u0441\u043f\u043e\u043a\u043e\u0439\u043d\u0435\u0435, \u0437\u0430\u0432\u0435\u0440\u0448\u0430\u0439\u0442\u0435 \u0431\u043e\u043b\u044c\u0448\u0435.'}</h2>
          </div>
        </aside>

        <section className={styles.formPane}>
          <form className={styles.form} onSubmit={handleSubmit}>
            <header className={styles.header}>
              <h1>{'\u0412\u0445\u043e\u0434 \u0432 \u0430\u043a\u043a\u0430\u0443\u043d\u0442'}</h1>
              <p>{'\u0412\u043e\u0439\u0434\u0438\u0442\u0435, \u0447\u0442\u043e\u0431\u044b \u043f\u0440\u043e\u0434\u043e\u043b\u0436\u0438\u0442\u044c \u0440\u0430\u0431\u043e\u0442\u0443 \u0441 \u0437\u0430\u0434\u0430\u0447\u0430\u043c\u0438.'}</p>
            </header>

            <label className={styles.field}>
              <span>Email</span>
              <input
                className={styles.input}
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoFocus
                autoComplete="email"
              />
            </label>

            <label className={styles.field}>
              <span>{'\u041f\u0430\u0440\u043e\u043b\u044c'}</span>
              <input
                className={styles.input}
                type="password"
                placeholder={'\u0412\u0432\u0435\u0434\u0438\u0442\u0435 \u043f\u0430\u0440\u043e\u043b\u044c'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                autoComplete="current-password"
              />
            </label>

            {login.error && <p className={styles.error}>{login.error.message}</p>}

            <button className={styles.submitButton} type="submit" disabled={login.isPending}>
              {login.isPending
                ? '\u0412\u0445\u043e\u0434\u0438\u043c...'
                : '\u0412\u043e\u0439\u0442\u0438'}
            </button>

            <p className={styles.signupLink}>
              {'\u041d\u0435\u0442 \u0430\u043a\u043a\u0430\u0443\u043d\u0442\u0430? '}
              <Link to="/register">{'\u0417\u0430\u0440\u0435\u0433\u0438\u0441\u0442\u0440\u0438\u0440\u043e\u0432\u0430\u0442\u044c\u0441\u044f'}</Link>
            </p>

            <p className={styles.supportText}>
              {'\u041f\u0440\u043e\u0431\u043b\u0435\u043c\u0430 \u0441\u043e \u0432\u0445\u043e\u0434\u043e\u043c? \u041f\u043e\u043f\u0440\u043e\u0431\u0443\u0439\u0442\u0435 \u0430\u0432\u0442\u043e\u0440\u0438\u0437\u0430\u0446\u0438\u044e \u0447\u0435\u0440\u0435\u0437 Google.'}
            </p>

            <div className={styles.separator}>
              <span>{'\u0438\u043b\u0438'}</span>
            </div>

            <GoogleAuthButton label={'\u041f\u0440\u043e\u0434\u043e\u043b\u0436\u0438\u0442\u044c \u0447\u0435\u0440\u0435\u0437 Google'} />
          </form>
        </section>
      </div>
    </div>
  );
}
