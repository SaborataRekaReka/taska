import balanceIcon from '../assests/balance.svg';
import checkIcon from '../assests/check.svg';
import styles from './DayCreatedActions.module.css';

interface DayCreatedActionsProps {
  onEditBalance?: () => void;
  onSave?: () => void;
}

export function DayCreatedActions({ onEditBalance, onSave }: DayCreatedActionsProps) {
  return (
    <div className={styles.bar}>
      <button type="button" className={styles.secondary} onClick={onEditBalance}>
        <img src={balanceIcon} alt="" className={styles.secondaryIcon} />
        {'\u0418\u0437\u043c\u0435\u043d\u0438\u0442\u044c \u0431\u0430\u043b\u0430\u043d\u0441'}
      </button>
      <button type="button" className={styles.primary} onClick={onSave}>
        <img src={checkIcon} alt="" className={styles.primaryIcon} />
        {'\u0421\u043e\u0445\u0440\u0430\u043d\u0438\u0442\u044c'}
      </button>
    </div>
  );
}
