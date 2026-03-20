import balanceIcon from '../assests/balance.svg';
import checkIcon from '../assests/check.svg';
import styles from './DayCreatedActions.module.css';

interface DayCreatedActionsProps {
  onEditBalance?: () => void;
  onSave?: () => void;
  isSaving?: boolean;
  saveError?: string | null;
}

export function DayCreatedActions({
  onEditBalance,
  onSave,
  isSaving = false,
  saveError = null,
}: DayCreatedActionsProps) {
  return (
    <div className={styles.wrap}>
      <div className={styles.bar}>
        <button type="button" className={styles.secondary} onClick={onEditBalance} disabled={isSaving}>
          <img src={balanceIcon} alt="" className={styles.secondaryIcon} />
          {'\u0418\u0437\u043c\u0435\u043d\u0438\u0442\u044c \u0431\u0430\u043b\u0430\u043d\u0441'}
        </button>
        <button type="button" className={styles.primary} onClick={onSave} disabled={isSaving}>
          <img src={checkIcon} alt="" className={styles.primaryIcon} />
          {isSaving ? '\u0421\u043e\u0445\u0440\u0430\u043d\u044f\u0435\u043c...' : '\u0421\u043e\u0445\u0440\u0430\u043d\u0438\u0442\u044c'}
        </button>
      </div>
      {saveError ? <p className={styles.errorText}>{saveError}</p> : null}
    </div>
  );
}
