import { useMemo, useState } from 'react';
import type { AiOperationStatus, AiPlanOperation, AiPlanResponse } from '../lib/types';
import styles from './AiProposalCard.module.css';

type ProposalViewState = AiOperationStatus | 'REJECTED' | 'DRAFT';

interface AiProposalCardProps {
  proposal: AiPlanResponse;
  status: ProposalViewState;
  busyLabel?: string | null;
  executionCount?: number;
  canUndo?: boolean;
  onApprove: () => void;
  onReject: () => void;
  onRevise: (revisionPrompt: string) => void;
  onUndo?: () => void;
}

function formatOperationTitle(operation: AiPlanOperation): string {
  if (operation.type === 'CREATE_LIST') return `Создать список “${operation.name ?? 'Без названия'}”`;
  if (operation.type === 'UPDATE_LIST') return `Переименовать список в “${operation.name ?? '…'}”`;
  if (operation.type === 'CREATE_TASK') return `Создать задачу “${operation.task?.title ?? 'Без названия'}”`;
  if (operation.type === 'UPDATE_TASK') return `Обновить задачу ${operation.taskId ?? ''}`.trim();
  if (operation.type === 'DELETE_TASK') return `Удалить задачу ${operation.taskId ?? ''}`.trim();
  if (operation.type === 'CREATE_SUBTASK') return `Добавить подзадачу “${operation.subtask?.title ?? 'Без названия'}”`;
  if (operation.type === 'UPDATE_SUBTASK') return `Обновить подзадачу ${operation.subtaskId ?? ''}`.trim();
  return `Удалить подзадачу ${operation.subtaskId ?? ''}`.trim();
}

function buildMarkdown(proposal: AiPlanResponse): string {
  const operationsBlock = proposal.operations.length > 0
    ? proposal.operations.map((operation) => {
        const details: string[] = [];
        if (operation.name) details.push(`name:: ${operation.name}`);
        if (operation.task?.title) details.push(`task.title:: ${operation.task.title}`);
        if (operation.task?.description) details.push(`task.description:: ${operation.task.description}`);
        if (operation.task?.priority) details.push(`task.priority:: ${operation.task.priority}`);
        if (operation.task?.status) details.push(`task.status:: ${operation.task.status}`);
        if (operation.task?.deadline) details.push(`task.deadline:: ${operation.task.deadline}`);
        if (operation.subtask?.title) details.push(`subtask.title:: ${operation.subtask.title}`);
        if (operation.subtask?.status) details.push(`subtask.status:: ${operation.subtask.status}`);
        return [`- op:: ${operation.type}`, ...details.map((detail) => `  - ${detail}`)].join('\n');
      }).join('\n')
    : '- op:: NO_CHANGES';

  return [
    `# ${proposal.summary}`,
    '',
    proposal.assistantMessage,
    '',
    '## Operations',
    operationsBlock,
    proposal.warnings.length > 0 ? `\n## Warnings\n${proposal.warnings.map((warning) => `- ${warning}`).join('\n')}` : '',
  ].filter(Boolean).join('\n');
}

function statusLabel(status: ProposalViewState): string {
  if (status === 'PLANNED') return 'План готов';
  if (status === 'CONFIRMED') return 'Подтверждено';
  if (status === 'EXECUTED') return 'Применено';
  if (status === 'UNDONE') return 'Отменено';
  if (status === 'FAILED') return 'Ошибка';
  if (status === 'REJECTED') return 'Отклонено';
  return 'Черновик';
}

export function AiProposalCard({
  proposal,
  status,
  busyLabel,
  executionCount,
  canUndo,
  onApprove,
  onReject,
  onRevise,
  onUndo,
}: AiProposalCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState(() => buildMarkdown(proposal));
  const statusText = useMemo(() => statusLabel(status), [status]);
  const isBusy = Boolean(busyLabel);
  const isTerminal = status === 'EXECUTED' || status === 'UNDONE' || status === 'REJECTED';

  return (
    <div className={styles.card}>
      <div className={styles.header}>
        <div>
          <div className={styles.eyebrow}>AI proposal</div>
          <h3 className={styles.title}>{proposal.summary}</h3>
        </div>
        <span className={`${styles.badge} ${styles[`status${status}`] ?? ''}`}>{busyLabel ?? statusText}</span>
      </div>

      <p className={styles.message}>{proposal.assistantMessage}</p>

      {executionCount && status === 'EXECUTED' ? (
        <div className={styles.metaRow}>Изменений применено: {executionCount}</div>
      ) : null}

      {proposal.warnings.length > 0 ? (
        <div className={styles.warningBox}>
          {proposal.warnings.map((warning) => (
            <p key={warning}>{warning}</p>
          ))}
        </div>
      ) : null}

      {isEditing ? (
        <textarea
          className={styles.editor}
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          spellCheck={false}
        />
      ) : (
        <div className={styles.operations}>
          {proposal.operations.map((operation) => (
            <div key={operation.key} className={styles.operationRow}>
              <div className={styles.operationTitle}>{formatOperationTitle(operation)}</div>
              <div className={styles.operationType}>{operation.type}</div>
            </div>
          ))}
          {proposal.operations.length === 0 ? <div className={styles.emptyState}>AI не предложил изменений.</div> : null}
        </div>
      )}

      <div className={styles.actions}>
        <button
          type="button"
          className={styles.secondaryButton}
          onClick={() => {
            if (isEditing) {
              onRevise(draft);
            }
            setIsEditing((current) => !current);
          }}
          disabled={isBusy || status === 'EXECUTED' || status === 'UNDONE'}
        >
          {isEditing ? 'Обновить план' : 'Править в MD'}
        </button>

        {!isTerminal ? (
          <>
            <button type="button" className={styles.ghostButton} onClick={onReject} disabled={isBusy}>
              Отклонить
            </button>
            <button type="button" className={styles.primaryButton} onClick={onApprove} disabled={isBusy}>
              Одобрить и применить
            </button>
          </>
        ) : null}

        {status === 'EXECUTED' && canUndo && onUndo ? (
          <button type="button" className={styles.ghostButton} onClick={onUndo} disabled={isBusy}>
            Undo
          </button>
        ) : null}
      </div>
    </div>
  );
}
