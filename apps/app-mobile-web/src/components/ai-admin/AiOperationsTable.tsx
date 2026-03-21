import type { AiOperationStatus, AiScope } from '../../lib/types';
import type { AiOperationView } from './types';
import styles from './AiOperationsTable.module.css';

interface AiOperationsTableProps {
  operations: AiOperationView[];
  totalCount: number;
  selectedOperationId: string | null;
  statusFilter: AiOperationStatus | 'ALL';
  scopeFilter: AiScope | 'ALL';
  search: string;
  hasActiveFilters: boolean;
  actionInFlight: { operationId: string; type: 'confirm' | 'execute' | 'undo' } | null;
  onSelectOperation: (operationId: string) => void;
  onStatusFilterChange: (status: AiOperationStatus | 'ALL') => void;
  onScopeFilterChange: (scope: AiScope | 'ALL') => void;
  onSearchChange: (search: string) => void;
  onClearFilters: () => void;
  onConfirm: (operationId: string) => void;
  onExecute: (operationId: string) => void;
  onUndo: (operationId: string) => void;
}

function formatDate(iso: string): string {
  const date = new Date(iso);
  return `${date.toLocaleDateString()} ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
}

export function AiOperationsTable({
  operations,
  totalCount,
  selectedOperationId,
  statusFilter,
  scopeFilter,
  search,
  hasActiveFilters,
  actionInFlight,
  onSelectOperation,
  onStatusFilterChange,
  onScopeFilterChange,
  onSearchChange,
  onClearFilters,
  onConfirm,
  onExecute,
  onUndo,
}: AiOperationsTableProps) {
  return (
    <section className={styles.section}>
      <header className={styles.header}>
        <h3 className={styles.title}>Operations</h3>
        <p className={styles.subtitle}>Inspect and control safe-mode lifecycle</p>
        <div className={styles.metaRow}>
          <span className={styles.metaText}>shown: {operations.length} / {totalCount}</span>
          {hasActiveFilters ? (
            <button type="button" className={styles.clearBtn} onClick={onClearFilters}>
              Clear filters
            </button>
          ) : null}
        </div>
      </header>

      <div className={styles.filters}>
        <label className={styles.field}>
          <span>Status</span>
          <select value={statusFilter} onChange={(event) => onStatusFilterChange(event.target.value as AiOperationStatus | 'ALL')}>
            <option value="ALL">ALL</option>
            <option value="PLANNED">PLANNED</option>
            <option value="CONFIRMED">CONFIRMED</option>
            <option value="EXECUTED">EXECUTED</option>
            <option value="UNDONE">UNDONE</option>
            <option value="FAILED">FAILED</option>
          </select>
        </label>
        <label className={styles.field}>
          <span>Scope</span>
          <select value={scopeFilter} onChange={(event) => onScopeFilterChange(event.target.value as AiScope | 'ALL')}>
            <option value="ALL">ALL</option>
            <option value="GLOBAL">GLOBAL</option>
            <option value="TASK">TASK</option>
          </select>
        </label>
        <label className={`${styles.field} ${styles.searchField}`}>
          <span>Search</span>
          <input
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="operation id or prompt"
          />
        </label>
      </div>

      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Created</th>
              <th>Operation ID</th>
              <th>Scope</th>
              <th>Status</th>
              <th>Plan</th>
              <th>Model</th>
              <th>Ops</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {operations.length === 0 ? (
              <tr>
                <td colSpan={8} className={styles.empty}>No operations found for current filters.</td>
              </tr>
            ) : (
              operations.map((operation) => {
                const isSelected = selectedOperationId === operation.operationId;
                const actionType = actionInFlight?.operationId === operation.operationId ? actionInFlight.type : null;
                return (
                  <tr
                    key={operation.operationId}
                    className={isSelected ? styles.selected : ''}
                    onClick={() => onSelectOperation(operation.operationId)}
                  >
                    <td>{formatDate(operation.createdAt)}</td>
                    <td className={styles.idCell}>{operation.operationId}</td>
                    <td>{operation.scope}</td>
                    <td>
                      <span className={`${styles.status} ${styles[`status${operation.status}`]}`}>{operation.status}</span>
                    </td>
                    <td>{operation.planKind}</td>
                    <td>{operation.model ?? 'n/a'}</td>
                    <td>{operation.operationsCount}</td>
                    <td>
                      <div className={styles.actions}>
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            onSelectOperation(operation.operationId);
                          }}
                        >
                          Inspect
                        </button>
                        <button
                          type="button"
                          disabled={operation.status !== 'PLANNED' || Boolean(actionType)}
                          onClick={(event) => {
                            event.stopPropagation();
                            onConfirm(operation.operationId);
                          }}
                        >
                          {actionType === 'confirm' ? 'Confirming...' : 'Confirm'}
                        </button>
                        <button
                          type="button"
                          disabled={operation.status !== 'CONFIRMED' || Boolean(actionType)}
                          onClick={(event) => {
                            event.stopPropagation();
                            onExecute(operation.operationId);
                          }}
                        >
                          {actionType === 'execute' ? 'Executing...' : 'Execute'}
                        </button>
                        <button
                          type="button"
                          disabled={operation.status !== 'EXECUTED' || Boolean(actionType)}
                          onClick={(event) => {
                            event.stopPropagation();
                            onUndo(operation.operationId);
                          }}
                        >
                          {actionType === 'undo' ? 'Undoing...' : 'Undo'}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
