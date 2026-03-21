import type { AiOperationDetail } from '../../lib/types';
import type { AiOperationView } from './types';
import styles from './AiOperationInspector.module.css';

interface AiOperationInspectorProps {
  operation: AiOperationDetail | null;
  view: AiOperationView | null;
}

function formatStamp(value: string | null | undefined): string {
  if (!value) {
    return 'not set';
  }
  return new Date(value).toLocaleString();
}

function stringifyPayload(payload: Record<string, unknown> | null | undefined): string {
  if (!payload) {
    return 'null';
  }
  try {
    return JSON.stringify(payload, null, 2);
  } catch {
    return String(payload);
  }
}

export function AiOperationInspector({ operation, view }: AiOperationInspectorProps) {
  if (!operation || !view) {
    return (
      <section className={styles.section}>
        <h3 className={styles.title}>Inspector</h3>
        <p className={styles.empty}>Select operation in the table to inspect payloads and lifecycle.</p>
      </section>
    );
  }

  return (
    <section className={styles.section}>
      <header className={styles.header}>
        <div>
          <h3 className={styles.title}>Inspector: {operation.operationId}</h3>
          <p className={styles.subtitle}>Scope {operation.scope} · Status {operation.status}</p>
        </div>
        <div className={styles.boundary}>
          <span className={styles.proposed}>AI proposed</span>
          <span className={styles.executed}>Backend executed</span>
        </div>
      </header>

      <div className={styles.metaGrid}>
        <article className={styles.metaCard}>
          <p className={styles.metaLabel}>Model</p>
          <p className={styles.metaValue}>{operation.model ?? 'n/a'}</p>
        </article>
        <article className={styles.metaCard}>
          <p className={styles.metaLabel}>Plan Kind</p>
          <p className={styles.metaValue}>{view.planKind}</p>
        </article>
        <article className={styles.metaCard}>
          <p className={styles.metaLabel}>Created</p>
          <p className={styles.metaValue}>{formatStamp(operation.createdAt)}</p>
        </article>
        <article className={styles.metaCard}>
          <p className={styles.metaLabel}>Approved</p>
          <p className={styles.metaValue}>{formatStamp(operation.approvedAt)}</p>
        </article>
        <article className={styles.metaCard}>
          <p className={styles.metaLabel}>Executed</p>
          <p className={styles.metaValue}>{formatStamp(operation.executedAt)}</p>
        </article>
        <article className={styles.metaCard}>
          <p className={styles.metaLabel}>Undone / Failed</p>
          <p className={styles.metaValue}>{operation.undoneAt ? formatStamp(operation.undoneAt) : formatStamp(operation.failedAt)}</p>
        </article>
      </div>

      <div className={styles.block}>
        <h4 className={styles.blockTitle}>Prompt</h4>
        <pre className={styles.prompt}>{operation.prompt}</pre>
      </div>

      <div className={styles.block}>
        <h4 className={styles.blockTitle}>Plan Summary</h4>
        <p className={styles.summary}>{operation.plan.summary}</p>
        <p className={styles.assistant}>{operation.plan.assistantMessage}</p>
        {operation.plan.warnings.length > 0 ? (
          <div className={styles.warningList}>
            {operation.plan.warnings.map((warning) => (
              <p key={warning}>{warning}</p>
            ))}
          </div>
        ) : null}
      </div>

      <div className={styles.block}>
        <h4 className={styles.blockTitle}>Operations</h4>
        <ul className={styles.operationList}>
          {operation.plan.operations.map((item) => (
            <li key={item.key} className={styles.operationItem}>
              <span className={styles.operationType}>{item.type}</span>
              <span className={styles.operationKey}>{item.key}</span>
              {item.taskId ? <span className={styles.operationMeta}>task: {item.taskId}</span> : null}
              {item.listId ? <span className={styles.operationMeta}>list: {item.listId}</span> : null}
              {item.subtaskId ? <span className={styles.operationMeta}>subtask: {item.subtaskId}</span> : null}
            </li>
          ))}
        </ul>
      </div>

      <div className={styles.payloadGrid}>
        <div className={styles.block}>
          <h4 className={styles.blockTitle}>Execution Payload</h4>
          <pre className={styles.json}>{stringifyPayload(operation.executionPayload)}</pre>
        </div>
        <div className={styles.block}>
          <h4 className={styles.blockTitle}>Undo Payload</h4>
          <pre className={styles.json}>{stringifyPayload(operation.undoPayload)}</pre>
        </div>
      </div>

      <div className={styles.timeline}>
        <span className={styles.timeNode}>PLANNED</span>
        <span className={styles.timeArrow}>→</span>
        <span className={`${styles.timeNode} ${operation.approvedAt ? styles.timeActive : ''}`}>CONFIRMED</span>
        <span className={styles.timeArrow}>→</span>
        <span className={`${styles.timeNode} ${operation.executedAt ? styles.timeActive : ''}`}>EXECUTED</span>
        <span className={styles.timeArrow}>→</span>
        <span className={`${styles.timeNode} ${operation.undoneAt || operation.failedAt ? styles.timeActive : ''}`}>
          {operation.failedAt ? 'FAILED' : 'UNDONE'}
        </span>
      </div>
    </section>
  );
}
