import { useEffect, useMemo, useState } from 'react';

import { AiProcessIndicator } from '../components/AiProcessIndicator';
import { Header } from '../components/Header';
import { AiAdminSidebar } from '../components/ai-admin/AiAdminSidebar';
import { AiLogsPanel } from '../components/ai-admin/AiLogsPanel';
import { AiOperationInspector } from '../components/ai-admin/AiOperationInspector';
import { AiOperationsTable } from '../components/ai-admin/AiOperationsTable';
import { AiOverviewPanel } from '../components/ai-admin/AiOverviewPanel';
import { AiSystemMapCard } from '../components/ai-admin/AiSystemMapCard';
import type {
  AiAdminSection,
  AiIncidentItem,
  AiOperationMetrics,
  AiOperationView,
  AiPolicyDraftState,
} from '../components/ai-admin/types';
import {
  useAiAdminConfig,
  useAiOperationHealth,
  useAiOperationsFeed,
  useAiRuntime,
  useConfirmAiOperation,
  useExecuteAiOperation,
  useUndoAiOperation,
  useUpdateAiAdminConfig,
} from '../hooks/queries';
import { isFallbackMyDayOperation } from '../lib/ai-admin';
import type { AiAdminConfig, AiOperationDetail, AiOperationStatus, AiScope } from '../lib/types';
import styles from './AiAdminPage.module.css';

const DEFAULT_POLICY_DRAFT: AiPolicyDraftState = {
  myDayAutoConfirm: true,
  myDayAutoExecute: true,
  myDayTaskLimit: 4,
  blockDeleteOperations: false,
  requireUndoReason: true,
  operatorNotes: '',
  promptGuardrails: [
    'Never create physical list "Мой день".',
    'Prefer UPDATE_TASK over DELETE_TASK in My Day flows.',
    'Always keep ownership and list protection constraints.',
  ].join('\n'),
};

function mapConfigToDraft(config: AiAdminConfig): AiPolicyDraftState {
  return {
    myDayAutoConfirm: config.myDayAutoConfirm,
    myDayAutoExecute: config.myDayAutoExecute,
    myDayTaskLimit: config.myDayTaskLimit,
    blockDeleteOperations: config.blockDeleteOperations,
    requireUndoReason: config.requireUndoReason,
    operatorNotes: config.operatorNotes ?? '',
    promptGuardrails: config.promptGuardrails ?? '',
  };
}

function normalizeDraftValue(value: string): string {
  return value.trim();
}

function areDraftsEqual(a: AiPolicyDraftState, b: AiPolicyDraftState): boolean {
  return (
    a.myDayAutoConfirm === b.myDayAutoConfirm
    && a.myDayAutoExecute === b.myDayAutoExecute
    && a.myDayTaskLimit === b.myDayTaskLimit
    && a.blockDeleteOperations === b.blockDeleteOperations
    && a.requireUndoReason === b.requireUndoReason
    && normalizeDraftValue(a.operatorNotes) === normalizeDraftValue(b.operatorNotes)
    && normalizeDraftValue(a.promptGuardrails) === normalizeDraftValue(b.promptGuardrails)
  );
}

function toRate(part: number, total: number): number {
  if (total === 0) {
    return 0;
  }
  return Math.round((part / total) * 100);
}

function mapToView(detail: AiOperationDetail): AiOperationView {
  const planKind = detail.plan.planKind ?? 'UNKNOWN';
  return {
    operationId: detail.operationId,
    createdAt: detail.createdAt,
    scope: detail.scope,
    status: detail.status,
    planKind,
    model: detail.model ?? null,
    operationsCount: detail.plan.operations.length,
    prompt: detail.prompt,
    hasWarnings: detail.plan.warnings.length > 0,
    isFallbackMyDay: isFallbackMyDayOperation(detail),
    source: detail,
  };
}

function buildMetrics(operations: AiOperationView[]): AiOperationMetrics {
  const planned = operations.filter((item) => item.status === 'PLANNED').length;
  const confirmed = operations.filter((item) => item.status === 'CONFIRMED').length;
  const executed = operations.filter((item) => item.status === 'EXECUTED').length;
  const failed = operations.filter((item) => item.status === 'FAILED').length;
  const undone = operations.filter((item) => item.status === 'UNDONE').length;

  return {
    total: operations.length,
    planned,
    confirmed,
    executed,
    failed,
    undone,
    failRate: toRate(failed, operations.length),
    undoRate: toRate(undone, Math.max(executed + undone, 1)),
  };
}

function buildIncidents(operations: AiOperationView[]): AiIncidentItem[] {
  const items: AiIncidentItem[] = [];

  for (const operation of operations) {
    if (operation.status === 'FAILED') {
      items.push({
        id: `${operation.operationId}_failed`,
        type: 'FAILED',
        title: 'Execution failed',
        message: operation.source.errorMessage ?? 'No backend error message available.',
        createdAt: operation.createdAt,
        operationId: operation.operationId,
      });
    }

    if (operation.status === 'UNDONE') {
      items.push({
        id: `${operation.operationId}_undone`,
        type: 'UNDONE',
        title: 'Operation was undone',
        message: 'Review execution/undo payloads to understand rollback scope.',
        createdAt: operation.createdAt,
        operationId: operation.operationId,
      });
    }

    if (operation.isFallbackMyDay) {
      items.push({
        id: `${operation.operationId}_fallback`,
        type: 'MY_DAY_FALLBACK',
        title: 'My Day fallback path used',
        message: 'Prompt indicates deterministic fallback revise was triggered.',
        createdAt: operation.createdAt,
        operationId: operation.operationId,
      });
    }
  }

  return items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

function matchesFilters(
  operation: AiOperationView,
  statusFilter: AiOperationStatus | 'ALL',
  scopeFilter: AiScope | 'ALL',
  search: string,
): boolean {
  if (statusFilter !== 'ALL' && operation.status !== statusFilter) {
    return false;
  }

  if (scopeFilter !== 'ALL' && operation.scope !== scopeFilter) {
    return false;
  }

  const normalizedSearch = search.trim().toLowerCase();
  if (!normalizedSearch) {
    return true;
  }

  return operation.operationId.toLowerCase().includes(normalizedSearch)
    || operation.prompt.toLowerCase().includes(normalizedSearch);
}

export function AiAdminPage() {
  const [activeSection, setActiveSection] = useState<AiAdminSection>('overview');
  const [selectedOperationId, setSelectedOperationId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<AiOperationStatus | 'ALL'>('ALL');
  const [scopeFilter, setScopeFilter] = useState<AiScope | 'ALL'>('ALL');
  const [search, setSearch] = useState('');
  const [actionInFlight, setActionInFlight] = useState<{ operationId: string; type: 'confirm' | 'execute' | 'undo' } | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [policyDraft, setPolicyDraft] = useState<AiPolicyDraftState>(DEFAULT_POLICY_DRAFT);
  const [policySavedDraft, setPolicySavedDraft] = useState<AiPolicyDraftState>(DEFAULT_POLICY_DRAFT);
  const [isPolicyHydrated, setIsPolicyHydrated] = useState(false);
  const [policyMessage, setPolicyMessage] = useState<string | null>(null);
  const [policyError, setPolicyError] = useState<string | null>(null);
  const [policyUpdatedAt, setPolicyUpdatedAt] = useState<string | null>(null);

  const operationsFeed = useAiOperationsFeed(80);
  const operationHealth = useAiOperationHealth();
  const runtimeInfo = useAiRuntime();
  const adminConfig = useAiAdminConfig();

  const confirmMutation = useConfirmAiOperation();
  const executeMutation = useExecuteAiOperation();
  const undoMutation = useUndoAiOperation();
  const updateAdminConfig = useUpdateAiAdminConfig();

  const operations = useMemo(
    () => (operationsFeed.data ?? []).map(mapToView),
    [operationsFeed.data],
  );

  const metrics = useMemo(() => buildMetrics(operations), [operations]);
  const incidents = useMemo(() => buildIncidents(operations), [operations]);

  const filteredOperations = useMemo(
    () => operations.filter((item) => matchesFilters(item, statusFilter, scopeFilter, search)),
    [operations, scopeFilter, search, statusFilter],
  );

  const hasActiveFilters = statusFilter !== 'ALL' || scopeFilter !== 'ALL' || search.trim().length > 0;
  const isPolicyDirty = !areDraftsEqual(policyDraft, policySavedDraft);

  const selectedOperationView = useMemo(
    () => operations.find((item) => item.operationId === selectedOperationId) ?? null,
    [operations, selectedOperationId],
  );

  const selectedOperation = selectedOperationView?.source ?? null;

  useEffect(() => {
    if (!adminConfig.data || isPolicyHydrated) {
      return;
    }
    const mapped = mapConfigToDraft(adminConfig.data);
    setPolicyDraft(mapped);
    setPolicySavedDraft(mapped);
    setPolicyUpdatedAt(adminConfig.data.updatedAt);
    setIsPolicyHydrated(true);
    setPolicyError(null);
  }, [adminConfig.data, isPolicyHydrated]);

  useEffect(() => {
    if (!adminConfig.isError) {
      return;
    }
    if (!isPolicyHydrated) {
      setIsPolicyHydrated(true);
    }
    setPolicyError((adminConfig.error as Error)?.message ?? 'Failed to load persisted AI admin config');
  }, [adminConfig.error, adminConfig.isError, isPolicyHydrated]);

  useEffect(() => {
    if (isPolicyDirty) {
      setPolicyMessage(null);
    }
  }, [isPolicyDirty]);

  useEffect(() => {
    if (selectedOperationId && operations.some((item) => item.operationId === selectedOperationId)) {
      return;
    }
    if (filteredOperations.length > 0) {
      setSelectedOperationId(filteredOperations[0].operationId);
      return;
    }
    if (operations.length > 0) {
      setSelectedOperationId(operations[0].operationId);
      return;
    }
    setSelectedOperationId(null);
  }, [filteredOperations, operations, selectedOperationId]);

  async function runAction(
    type: 'confirm' | 'execute' | 'undo',
    operationId: string,
    action: () => Promise<unknown>,
  ): Promise<void> {
    setActionError(null);
    setActionInFlight({ operationId, type });

    try {
      await action();
      await operationsFeed.refetch();
      setActiveSection(type === 'undo' ? 'logs' : 'inspector');
      setSelectedOperationId(operationId);
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'Action failed');
    } finally {
      setActionInFlight(null);
    }
  }

  function handleConfirm(operationId: string): void {
    void runAction('confirm', operationId, () => confirmMutation.mutateAsync({
      operationId,
      note: 'Confirmed from AI Admin',
    }));
  }

  function handleExecute(operationId: string): void {
    void runAction('execute', operationId, () => executeMutation.mutateAsync(operationId));
  }

  function handleUndo(operationId: string): void {
    const shouldUndo = window.confirm('Undo this executed operation?');
    if (!shouldUndo) {
      return;
    }

    const reason = policyDraft.requireUndoReason
      ? window.prompt('Undo reason (required by local safety draft):')?.trim()
      : undefined;

    if (policyDraft.requireUndoReason && !reason) {
      return;
    }

    void runAction('undo', operationId, () => undoMutation.mutateAsync({
      operationId,
      reason,
    }));
  }

  function handleOpenOperation(operationId: string): void {
    setSelectedOperationId(operationId);
    setActiveSection('inspector');
  }

  async function handleSavePolicy(): Promise<void> {
    setPolicyError(null);
    setPolicyMessage(null);
    try {
      const updated = await updateAdminConfig.mutateAsync({
        myDayAutoConfirm: policyDraft.myDayAutoConfirm,
        myDayAutoExecute: policyDraft.myDayAutoExecute,
        myDayTaskLimit: policyDraft.myDayTaskLimit,
        blockDeleteOperations: policyDraft.blockDeleteOperations,
        requireUndoReason: policyDraft.requireUndoReason,
        operatorNotes: normalizeDraftValue(policyDraft.operatorNotes) || null,
        promptGuardrails: normalizeDraftValue(policyDraft.promptGuardrails) || null,
      });
      const mapped = mapConfigToDraft(updated);
      setPolicyDraft(mapped);
      setPolicySavedDraft(mapped);
      setPolicyUpdatedAt(updated.updatedAt);
      setPolicyMessage('Configuration saved.');
    } catch (error) {
      setPolicyError(error instanceof Error ? error.message : 'Failed to save config');
    }
  }

  function handleResetPolicy(): void {
    setPolicyDraft(policySavedDraft);
    setPolicyMessage(null);
    setPolicyError(null);
  }

  function formatTimestamp(iso: string | null): string {
    if (!iso) {
      return 'not saved yet';
    }
    return new Date(iso).toLocaleString();
  }

  const policyConnectionLabel = adminConfig.isError ? 'backend unavailable' : 'backend connected';

  function renderSection() {
    if (activeSection === 'overview') {
      return (
        <div className={styles.stack}>
          <AiOverviewPanel
            metrics={metrics}
            health={operationHealth.data}
            runtime={runtimeInfo.data}
            isHealthLoading={operationHealth.isLoading}
            isRuntimeLoading={runtimeInfo.isLoading}
          />
          <AiSystemMapCard />
        </div>
      );
    }

    if (activeSection === 'operations') {
      return (
        <AiOperationsTable
          operations={filteredOperations}
          totalCount={operations.length}
          selectedOperationId={selectedOperationId}
          statusFilter={statusFilter}
          scopeFilter={scopeFilter}
          search={search}
          hasActiveFilters={hasActiveFilters}
          actionInFlight={actionInFlight}
          onSelectOperation={setSelectedOperationId}
          onStatusFilterChange={setStatusFilter}
          onScopeFilterChange={setScopeFilter}
          onSearchChange={setSearch}
          onClearFilters={() => {
            setStatusFilter('ALL');
            setScopeFilter('ALL');
            setSearch('');
          }}
          onConfirm={handleConfirm}
          onExecute={handleExecute}
          onUndo={handleUndo}
        />
      );
    }

    if (activeSection === 'inspector') {
      return (
        <div className={styles.stack}>
          <AiOperationsTable
            operations={filteredOperations}
            totalCount={operations.length}
            selectedOperationId={selectedOperationId}
            statusFilter={statusFilter}
            scopeFilter={scopeFilter}
            search={search}
            hasActiveFilters={hasActiveFilters}
            actionInFlight={actionInFlight}
            onSelectOperation={setSelectedOperationId}
            onStatusFilterChange={setStatusFilter}
            onScopeFilterChange={setScopeFilter}
            onSearchChange={setSearch}
            onClearFilters={() => {
              setStatusFilter('ALL');
              setScopeFilter('ALL');
              setSearch('');
            }}
            onConfirm={handleConfirm}
            onExecute={handleExecute}
            onUndo={handleUndo}
          />
          <AiOperationInspector operation={selectedOperation} view={selectedOperationView} />
        </div>
      );
    }

    if (activeSection === 'logs') {
      return (
        <AiLogsPanel incidents={incidents} onOpenOperation={handleOpenOperation} />
      );
    }

    if (activeSection === 'my-day-policy') {
      return (
        <section className={styles.draftSection}>
          <header className={styles.draftHeader}>
            <h3>My Day Policy</h3>
            <span className={`${styles.draftBadge} ${adminConfig.isError ? styles.badgeWarn : styles.badgeOk}`}>{policyConnectionLabel}</span>
          </header>
          <p className={styles.draftText}>Persisted operator controls for My Day flow.</p>
          <div className={styles.policyToolbar}>
            <span className={styles.policyState}>
              {isPolicyDirty ? 'unsaved changes' : `saved at ${formatTimestamp(policyUpdatedAt)}`}
            </span>
            <div className={styles.policyActions}>
              <button type="button" className={styles.policyButton} disabled={!isPolicyDirty || updateAdminConfig.isPending} onClick={handleResetPolicy}>
                Reset
              </button>
              <button
                type="button"
                className={`${styles.policyButton} ${styles.policyButtonPrimary}`}
                disabled={!isPolicyDirty || updateAdminConfig.isPending}
                onClick={() => void handleSavePolicy()}
              >
                {updateAdminConfig.isPending ? 'Saving...' : 'Save to backend'}
              </button>
            </div>
          </div>
          <label className={styles.check}>
            <input
              type="checkbox"
              checked={policyDraft.myDayAutoConfirm}
              onChange={(event) => setPolicyDraft((prev) => ({ ...prev, myDayAutoConfirm: event.target.checked }))}
            />
            Auto-confirm My Day plans
          </label>
          <label className={styles.check}>
            <input
              type="checkbox"
              checked={policyDraft.myDayAutoExecute}
              onChange={(event) => setPolicyDraft((prev) => ({ ...prev, myDayAutoExecute: event.target.checked }))}
            />
            Auto-execute My Day after confirm
          </label>
          <label className={styles.field}>
            <span>Target task limit</span>
            <input
              type="number"
              min={1}
              max={12}
              value={policyDraft.myDayTaskLimit}
              onChange={(event) => {
                const parsed = Number(event.target.value);
                const nextLimit = Number.isFinite(parsed) ? Math.max(1, Math.min(12, Math.round(parsed))) : 1;
                setPolicyDraft((prev) => ({
                  ...prev,
                  myDayTaskLimit: nextLimit,
                }));
              }}
            />
          </label>
        </section>
      );
    }

    if (activeSection === 'prompt-rules') {
      return (
        <section className={styles.draftSection}>
          <header className={styles.draftHeader}>
            <h3>Prompt Rules</h3>
            <span className={`${styles.draftBadge} ${adminConfig.isError ? styles.badgeWarn : styles.badgeOk}`}>{policyConnectionLabel}</span>
          </header>
          <p className={styles.draftText}>Persisted prompt guardrails and operator notes.</p>
          <div className={styles.policyToolbar}>
            <span className={styles.policyState}>
              {isPolicyDirty ? 'unsaved changes' : `saved at ${formatTimestamp(policyUpdatedAt)}`}
            </span>
            <div className={styles.policyActions}>
              <button type="button" className={styles.policyButton} disabled={!isPolicyDirty || updateAdminConfig.isPending} onClick={handleResetPolicy}>
                Reset
              </button>
              <button
                type="button"
                className={`${styles.policyButton} ${styles.policyButtonPrimary}`}
                disabled={!isPolicyDirty || updateAdminConfig.isPending}
                onClick={() => void handleSavePolicy()}
              >
                {updateAdminConfig.isPending ? 'Saving...' : 'Save to backend'}
              </button>
            </div>
          </div>
          <label className={styles.field}>
            <span>Guardrails</span>
            <textarea
              value={policyDraft.promptGuardrails}
              onChange={(event) => setPolicyDraft((prev) => ({ ...prev, promptGuardrails: event.target.value }))}
            />
          </label>
          <label className={styles.field}>
            <span>Operator notes</span>
            <textarea
              value={policyDraft.operatorNotes}
              onChange={(event) => setPolicyDraft((prev) => ({ ...prev, operatorNotes: event.target.value }))}
            />
          </label>
        </section>
      );
    }

    return (
      <section className={styles.draftSection}>
        <header className={styles.draftHeader}>
          <h3>Safety</h3>
          <span className={`${styles.draftBadge} ${adminConfig.isError ? styles.badgeWarn : styles.badgeOk}`}>{policyConnectionLabel}</span>
        </header>
        <p className={styles.draftText}>
          Runtime guarantees below are active in backend now. Toggles are future-facing operator controls.
        </p>
        <div className={styles.policyToolbar}>
          <span className={styles.policyState}>
            {isPolicyDirty ? 'unsaved changes' : `saved at ${formatTimestamp(policyUpdatedAt)}`}
          </span>
          <div className={styles.policyActions}>
            <button type="button" className={styles.policyButton} disabled={!isPolicyDirty || updateAdminConfig.isPending} onClick={handleResetPolicy}>
              Reset
            </button>
            <button
              type="button"
              className={`${styles.policyButton} ${styles.policyButtonPrimary}`}
              disabled={!isPolicyDirty || updateAdminConfig.isPending}
              onClick={() => void handleSavePolicy()}
            >
              {updateAdminConfig.isPending ? 'Saving...' : 'Save to backend'}
            </button>
          </div>
        </div>
        <ul className={styles.invariants}>
          <li>AI proposes; backend executes deterministically.</li>
          <li>Ownership checks apply on every mutation.</li>
          <li>Undo payload is required for reversible actions.</li>
          <li>My Day remains virtual via task deadlines.</li>
        </ul>
        <label className={styles.check}>
          <input
            type="checkbox"
            checked={policyDraft.blockDeleteOperations}
            onChange={(event) => setPolicyDraft((prev) => ({ ...prev, blockDeleteOperations: event.target.checked }))}
          />
          Block DELETE_* operations by policy (draft)
        </label>
        <label className={styles.check}>
          <input
            type="checkbox"
            checked={policyDraft.requireUndoReason}
            onChange={(event) => setPolicyDraft((prev) => ({ ...prev, requireUndoReason: event.target.checked }))}
          />
          Require undo reason in admin UI (draft)
        </label>
      </section>
    );
  }

  return (
    <div className={styles.page}>
      <Header />
      <main className={styles.main}>
        <div className={styles.layout}>
          <AiAdminSidebar
            activeSection={activeSection}
            onSelectSection={setActiveSection}
            metrics={metrics}
          />

          <section className={styles.workspace}>
            <header className={styles.workspaceHeader}>
              <div>
                <h1>AI Administration</h1>
                <p>
                  Centralized operational surface for plan lifecycle, inspection, safety context and logs.
                </p>
              </div>
              <div className={styles.feedMeta}>
                <span>
                  feed: {operationsFeed.isLoading ? 'loading...' : `${operations.length} ops`}
                </span>
                <span className={styles.adapterBadge}>source: /ai/operations (+legacy fallback)</span>
                <button type="button" onClick={() => void operationsFeed.refetch()}>
                  Refresh
                </button>
              </div>
            </header>

            {operationsFeed.isLoading ? (
              <div className={styles.loadingRow}>
                <AiProcessIndicator label="Loading operation feed..." tone="soft" compact />
              </div>
            ) : null}

            {actionInFlight ? (
              <div className={styles.loadingRow}>
                <AiProcessIndicator
                  label={`${actionInFlight.type} in progress for ${actionInFlight.operationId.slice(0, 10)}...`}
                  compact
                />
              </div>
            ) : null}

            {operationsFeed.isError ? (
              <div className={styles.error}>
                Failed to load operations feed. {(operationsFeed.error as Error)?.message ?? ''}
              </div>
            ) : null}

            {actionError ? <div className={styles.error}>{actionError}</div> : null}
            {policyError ? <div className={styles.error}>{policyError}</div> : null}
            {policyMessage ? <div className={styles.success}>{policyMessage}</div> : null}

            {renderSection()}
          </section>
        </div>
      </main>
    </div>
  );
}
