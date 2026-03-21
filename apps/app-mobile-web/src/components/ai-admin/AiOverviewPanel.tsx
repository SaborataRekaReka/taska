import type { AiHealthStatus, AiRuntimeInfo } from '../../lib/types';
import type { AiOperationMetrics } from './types';
import styles from './AiOverviewPanel.module.css';

interface AiOverviewPanelProps {
  metrics: AiOperationMetrics;
  health: AiHealthStatus | undefined;
  runtime: AiRuntimeInfo | undefined;
  isHealthLoading: boolean;
  isRuntimeLoading: boolean;
}

interface MetricCard {
  key: string;
  label: string;
  value: number | string;
}

export function AiOverviewPanel({
  metrics,
  health,
  runtime,
  isHealthLoading,
  isRuntimeLoading,
}: AiOverviewPanelProps) {
  const cards: MetricCard[] = [
    { key: 'planned', label: 'Planned', value: metrics.planned },
    { key: 'confirmed', label: 'Confirmed', value: metrics.confirmed },
    { key: 'executed', label: 'Executed', value: metrics.executed },
    { key: 'failed', label: 'Failed', value: metrics.failed },
    { key: 'undone', label: 'Undone', value: metrics.undone },
    { key: 'undoRate', label: 'Undo Rate', value: `${metrics.undoRate}%` },
    { key: 'failRate', label: 'Fail Rate', value: `${metrics.failRate}%` },
  ];

  return (
    <section className={styles.panel}>
      <header className={styles.header}>
        <h3 className={styles.title}>Assistant Runtime Overview</h3>
        <div className={styles.health}>
          <span className={styles.healthLabel}>Health</span>
          <span className={`${styles.healthValue} ${health?.status === 'active' ? styles.healthOk : styles.healthWarn}`}>
            {isHealthLoading ? 'checking...' : `${health?.module ?? 'ai'}: ${health?.status ?? 'unknown'}`}
          </span>
        </div>
      </header>

      <div className={styles.metrics}>
        {cards.map((card) => (
          <article key={card.key} className={styles.metricCard}>
            <p className={styles.metricLabel}>{card.label}</p>
            <p className={styles.metricValue}>{card.value}</p>
          </article>
        ))}
      </div>

      <div className={styles.runtimeCard}>
        <p className={styles.runtimeTitle}>Runtime</p>
        <p className={styles.runtimeLine}>
          planning model: {isRuntimeLoading ? 'loading...' : runtime?.planningModel ?? 'unknown'}
        </p>
        <p className={styles.runtimeLine}>
          chat model: {isRuntimeLoading ? 'loading...' : runtime?.chatModel ?? 'unknown'}
        </p>
        <p className={styles.runtimeLine}>
          trust boundary: {isRuntimeLoading ? 'loading...' : runtime?.trustBoundary.modelCanExecute ? 'model can execute' : 'backend executes only'}
        </p>
      </div>
    </section>
  );
}
