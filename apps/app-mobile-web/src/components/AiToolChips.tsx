import styles from './AiToolChips.module.css';

const TOOLS = [
  { label: 'Create image', color: '#34C759' },
  { label: 'Analyze data', color: '#5856D6' },
  { label: 'Make a plan', color: '#007AFF' },
  { label: 'Summarize text', color: '#FF9500' },
  { label: 'Help me write', color: '#FF3B30' },
  { label: 'More', color: '#8E8E93' },
];

export function AiToolChips() {
  return (
    <div className={styles.row}>
      {TOOLS.map((t) => (
        <button key={t.label} className={styles.chip}>
          <span className={styles.dot} style={{ background: t.color }} />
          {t.label}
        </button>
      ))}
    </div>
  );
}
