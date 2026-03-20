import styles from './AiProcessIndicator.module.css';

interface AiProcessIndicatorProps {
  label?: string;
  tone?: 'default' | 'soft';
  compact?: boolean;
}

export function AiProcessIndicator({
  label = 'Думает...',
  tone = 'default',
  compact = false,
}: AiProcessIndicatorProps) {
  return (
    <div
      className={[
        styles.indicator,
        tone === 'soft' ? styles.soft : styles.default,
        compact ? styles.compact : '',
      ].join(' ')}
      role="status"
      aria-live="polite"
    >
      <span className={styles.dots} aria-hidden="true">
        <span className={styles.dot} />
        <span className={styles.dot} />
        <span className={styles.dot} />
      </span>
      <span className={styles.label}>{label}</span>
    </div>
  );
}
