import type { AiIncidentItem } from './types';
import styles from './AiLogsPanel.module.css';

interface AiLogsPanelProps {
  incidents: AiIncidentItem[];
  onOpenOperation: (operationId: string) => void;
}

function formatDate(value: string): string {
  return new Date(value).toLocaleString();
}

export function AiLogsPanel({ incidents, onOpenOperation }: AiLogsPanelProps) {
  return (
    <section className={styles.section}>
      <header className={styles.header}>
        <h3 className={styles.title}>Derived Logs</h3>
        <p className={styles.subtitle}>Failure, undo and fallback signals from loaded operations</p>
      </header>

      {incidents.length === 0 ? (
        <p className={styles.empty}>No incidents for current operation feed.</p>
      ) : (
        <ul className={styles.list}>
          {incidents.map((incident) => (
            <li key={incident.id} className={styles.item}>
              <div className={styles.itemHeader}>
                <span className={`${styles.type} ${styles[`type${incident.type}`]}`}>{incident.type}</span>
                <span className={styles.time}>{formatDate(incident.createdAt)}</span>
              </div>
              <p className={styles.itemTitle}>{incident.title}</p>
              <p className={styles.message}>{incident.message}</p>
              <button type="button" className={styles.linkBtn} onClick={() => onOpenOperation(incident.operationId)}>
                Open operation {incident.operationId}
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
