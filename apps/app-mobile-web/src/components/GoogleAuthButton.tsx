import { getGoogleAuthStartUrl } from '../lib/api';
import styles from './GoogleAuthButton.module.css';

interface GoogleAuthButtonProps {
  label?: string;
}

export function GoogleAuthButton({ label = '\u0412\u043e\u0439\u0442\u0438 \u0447\u0435\u0440\u0435\u0437 Google' }: GoogleAuthButtonProps) {
  function handleClick() {
    window.location.href = getGoogleAuthStartUrl();
  }

  return (
    <button type="button" className={styles.button} onClick={handleClick}>
      <span className={styles.icon} aria-hidden="true">
        <svg width="18" height="18" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg">
          <path
            fill="#4285F4"
            d="M17.64 9.2045c0-.638-.0573-1.2518-.1636-1.8409H9v3.4818h4.8436c-.2086 1.125-.8427 2.0782-1.796 2.7164v2.2582h2.9081c1.7027-1.5673 2.6843-3.8741 2.6843-6.6155z"
          />
          <path
            fill="#34A853"
            d="M9 18c2.43 0 4.4673-.8064 5.9564-2.1809l-2.9081-2.2582c-.8064.54-1.8373.8591-3.0483.8591-2.3441 0-4.3282-1.5832-5.0364-3.7091H.9573v2.3327C2.4382 15.9832 5.4818 18 9 18z"
          />
          <path
            fill="#FBBC05"
            d="M3.9636 10.7109C3.7836 10.17 3.6818 9.5927 3.6818 9c0-.5927.1018-1.17.2818-1.7109V4.9564H.9573A8.996 8.996 0 0 0 0 9c0 1.4523.3477 2.8273.9573 4.0436l3.0063-2.3327z"
          />
          <path
            fill="#EA4335"
            d="M9 3.5795c1.3214 0 2.5077.4541 3.4405 1.3459l2.5813-2.5814C13.4632.8918 11.4259 0 9 0 5.4818 0 2.4382 2.0168.9573 4.9564l3.0063 2.3327C4.6718 5.1627 6.6559 3.5795 9 3.5795z"
          />
        </svg>
      </span>
      <span>{label}</span>
    </button>
  );
}
