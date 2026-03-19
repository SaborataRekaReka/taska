import { getGoogleAuthStartUrl } from '../lib/api';
import styles from './GoogleAuthButton.module.css';

interface GoogleAuthButtonProps {
  label?: string;
}

export function GoogleAuthButton({ label = 'Войти через Google' }: GoogleAuthButtonProps) {
  function handleClick() {
    window.location.href = getGoogleAuthStartUrl();
  }

  return (
    <button type="button" className={styles.button} onClick={handleClick}>
      <span className={styles.icon} aria-hidden="true">G</span>
      <span>{label}</span>
    </button>
  );
}
