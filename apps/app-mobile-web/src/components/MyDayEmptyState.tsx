import aiStarsIcon from '../assests/ai_stars.svg';
import styles from './MyDayEmptyState.module.css';

interface MyDayEmptyStateProps {
  onSetup: () => void;
}

export function MyDayEmptyState({ onSetup }: MyDayEmptyStateProps) {
  return (
    <div className={styles.root}>
      <img src={aiStarsIcon} className={styles.icon} alt="" aria-hidden />
      <h2 className={styles.title}>Настройте свой день</h2>
      <p className={styles.subtitle}>
        Расскажите, как вы себя чувствуете, и ассистент подберёт задачи под ваш ритм
      </p>
      <button type="button" className={styles.setupBtn} onClick={onSetup}>
        Создать мой день
        <img src={aiStarsIcon} className={styles.setupBtnIcon} alt="" aria-hidden />
      </button>
    </div>
  );
}
