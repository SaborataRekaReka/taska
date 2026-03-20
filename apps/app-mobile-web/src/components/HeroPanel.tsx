import { useEffect, useMemo, useRef, useState } from 'react';
import {
  useAllTasks,
  useConfirmAiOperation,
  useCreateAiPlan,
  useCreateTask,
  useExecuteAiOperation,
  useLists,
  useTasks,
  useReviseAiPlan,
  useUndoAiOperation,
} from '../hooks/queries';
import type { AiPlanResponse } from '../lib/types';
import { useUiStore } from '../stores/ui';
import { AiProposalCard, type AiProposalRevisionPayload } from './AiProposalCard';
import { AiProcessIndicator } from './AiProcessIndicator';
import styles from './HeroPanel.module.css';

const CHIPS = [
  'Разобрать задачи',
  'Предложить план на день',
  'Найти важное',
  'Забыть о задачах',
  'Покажи статистику',
];

type ChatMessage =
  | { id: string; role: 'user'; content: string }
  | {
      id: string;
      role: 'assistant';
      content: string;
      proposal?: AiPlanResponse;
      status?: 'DRAFT' | 'PLANNED' | 'CONFIRMED' | 'EXECUTED' | 'UNDONE' | 'FAILED';
      busyLabel?: string | null;
      executionCount?: number;
    };

function nextMessageId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function SendArrowIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 20 20"
      aria-hidden="true"
      className={className ? `${styles.sendIcon} ${className}` : styles.sendIcon}
    >
      <path
        d="M10 15.625a.781.781 0 0 1-.781-.781V7.043L6.177 10.084A.781.781 0 0 1 5.072 8.98l4.375-4.375a.782.782 0 0 1 1.106 0l4.375 4.375a.781.781 0 1 1-1.105 1.104L10.78 7.043v7.801c0 .431-.349.781-.781.781Z"
        fill="currentColor"
      />
    </svg>
  );
}

export function HeroPanel() {
  const activeListId = useUiStore((s) => s.activeListId);
  const searchQuery = useUiStore((s) => s.searchQuery);
  const [value, setValue] = useState('');
  const [isExpanded, setIsExpanded] = useState(false);
  const [isAiEnabled, setIsAiEnabled] = useState(true);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const [pendingLabel, setPendingLabel] = useState<string | null>(null);
  const createPlan = useCreateAiPlan();
  const revisePlan = useReviseAiPlan();
  const confirmOperation = useConfirmAiOperation();
  const executeOperation = useExecuteAiOperation();
  const undoOperation = useUndoAiOperation();
  const createTask = useCreateTask();
  const { data: tasks = [] } = useTasks();
  const { data: allTasks = [] } = useAllTasks();
  const { data: lists = [] } = useLists();
  const availableTaskLists = useMemo(
    () => lists.map((list) => ({ id: list.id, name: list.name, isDefault: list.isDefault })),
    [lists],
  );

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;

    el.style.height = 'auto';
    el.style.height = `${Math.max(el.scrollHeight, 24)}px`;
  }, [value]);

  useEffect(() => {
    function handlePointerDown(event: MouseEvent | TouchEvent): void {
      const root = panelRef.current;
      const target = event.target;

      if (!root || !(target instanceof Node)) {
        return;
      }

      if (!root.contains(target)) {
        setIsExpanded(false);
      }
    }

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('touchstart', handlePointerDown);

    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('touchstart', handlePointerDown);
    };
  }, []);

  const globalContext = useMemo(() => {
    const visibleTaskIds = tasks.slice(0, 12).map((task) => task.id);
    const selectedListIds = activeListId && !activeListId.startsWith('__') ? [activeListId] : undefined;
    const visibleLists = selectedListIds ?? lists.slice(0, 8).map((list) => list.id);

    return {
      taskIds: visibleTaskIds,
      listIds: visibleLists,
      search: searchQuery || undefined,
      limit: 12,
    };
  }, [activeListId, lists, searchQuery, tasks]);

  const listIdForNewTask = useMemo(() => {
    if (!activeListId || activeListId.startsWith('__')) {
      return undefined;
    }

    return activeListId;
  }, [activeListId]);

  async function submitAsNewTask(): Promise<void> {
    const trimmed = value.trim();
    if (!trimmed || createTask.isPending) {
      return;
    }

    try {
      await createTask.mutateAsync({
        title: trimmed,
        ...(listIdForNewTask ? { listId: listIdForNewTask } : {}),
      });
      setValue('');
    } catch {
      // TanStack Query surface; optional toast later
    }
  }

  async function submitPrompt(): Promise<void> {
    const trimmed = value.trim();
    if (!trimmed || pendingLabel) {
      return;
    }

    if (!isAiEnabled) {
      await submitAsNewTask();
      return;
    }

    const userMessageId = nextMessageId('user');
    setMessages((current) => [...current, { id: userMessageId, role: 'user', content: trimmed }]);
    setValue('');
    setIsExpanded(true);
    setPendingLabel('Размышляет над задачами...');  

    try {
      const proposal = await createPlan.mutateAsync({
        prompt: trimmed,
        scope: 'GLOBAL',
        context: globalContext,
      });

      setMessages((current) => [
        ...current,
        {
          id: nextMessageId('assistant'),
          role: 'assistant',
          content: proposal.assistantMessage,
          proposal,
          status: proposal.status,
        },
      ]);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Не удалось получить AI-план.';
      setMessages((current) => [
        ...current,
        {
          id: nextMessageId('assistant-error'),
          role: 'assistant',
          content: message,
          status: 'FAILED',
        },
      ]);
    } finally {
      setPendingLabel(null);
    }
  }

  async function handleApprove(messageId: string, proposal: AiPlanResponse): Promise<void> {
    setMessages((current) => current.map((message) => (
      message.id === messageId ? { ...message, busyLabel: 'Подтверждаем и применяем…' } : message
    )));

    try {
      await confirmOperation.mutateAsync({ operationId: proposal.operationId });
      const execution = await executeOperation.mutateAsync(proposal.operationId);
      setMessages((current) => current.map((message) => (
        message.id === messageId
          ? {
              ...message,
              status: execution.status,
              busyLabel: null,
              executionCount: execution.results.length,
            }
          : message
      )));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Не удалось применить AI-план.';
      setMessages((current) => current.map((item) => (
        item.id === messageId ? { ...item, status: 'FAILED', busyLabel: message } : item
      )));
    }
  }

  async function handleRevise(messageId: string, proposal: AiPlanResponse, revision: AiProposalRevisionPayload): Promise<void> {
    setMessages((current) => current.map((message) => (
      message.id === messageId ? { ...message, busyLabel: 'Пересобираем план…' } : message
    )));

    try {
      const revised = await revisePlan.mutateAsync({
        operationId: proposal.operationId,
        revisionPrompt: revision.revisionPrompt,
        operations: revision.operations,
        metadata: revision.metadata,
      });
      setMessages((current) => current.map((message) => (
        message.id === messageId
          ? { ...message, content: revised.assistantMessage, proposal: revised, status: revised.status, busyLabel: null }
          : message
      )));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Не удалось обновить план.';
      setMessages((current) => current.map((item) => (
        item.id === messageId ? { ...item, busyLabel: message, status: 'FAILED' } : item
      )));
    }
  }

  async function handleUndo(messageId: string, proposal: AiPlanResponse): Promise<void> {
    setMessages((current) => current.map((message) => (
      message.id === messageId ? { ...message, busyLabel: 'Откатываем…' } : message
    )));

    try {
      const result = await undoOperation.mutateAsync({ operationId: proposal.operationId });
      setMessages((current) => current.map((message) => (
        message.id === messageId ? { ...message, status: result.status, busyLabel: null } : message
      )));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Не удалось откатить изменения.';
      setMessages((current) => current.map((item) => (
        item.id === messageId ? { ...item, busyLabel: message, status: 'FAILED' } : item
      )));
    }
  }

  const isAiBusy = Boolean(pendingLabel);
  const isSendDisabled = isAiEnabled
    ? (isAiBusy || value.trim().length === 0)
    : (createTask.isPending || value.trim().length === 0);

  const showChat = isAiEnabled && messages.length > 0;
  const showExpandedChrome = isAiEnabled && (messages.length > 0 || isExpanded);

  return (
    <div
      ref={panelRef}
      className={`${styles.panel} ${showExpandedChrome ? styles.withHistory : ''}`.trim()}
      onMouseDown={() => {
        if (isAiEnabled) {
          setIsExpanded(true);
        }
      }}
    >
      <div className={styles.topRow}>
        <button
          type="button"
          className={`${styles.toggle} ${isAiEnabled ? styles.toggleOn : styles.toggleOff}`}
          aria-label={isAiEnabled ? 'Выключить AI' : 'Включить AI'}
          aria-pressed={isAiEnabled}
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => {
            setIsAiEnabled((current) => {
              const next = !current;
              if (!next) {
                setIsExpanded(false);
              }

              return next;
            });
          }}
        >
          <span className={styles.toggleTrack}>
            <span className={styles.toggleKnob} />
          </span>
          <span className={styles.toggleLabel}>AI</span>
        </button>
      </div>

      <div className={`${styles.messages} ${!showChat ? styles.messagesHidden : ''}`}>
        {messages.map((message) => (
          <div
            key={message.id}
            className={`${styles.messageRow} ${message.role === 'user' ? styles.userRow : styles.assistantRow}`}
          >
            <div className={`${styles.messageBubble} ${message.role === 'user' ? styles.userBubble : styles.assistantBubble}`}>
              <p>{message.content}</p>
            </div>
            {message.role === 'assistant' && message.proposal ? (
              <AiProposalCard
                proposal={message.proposal}
                status={message.status ?? 'DRAFT'}
                busyLabel={message.busyLabel}
                executionCount={message.executionCount}
                tasks={allTasks}
                availableLists={availableTaskLists}
                onApprove={() => handleApprove(message.id, message.proposal!)}
                onRevise={(revision) => handleRevise(message.id, message.proposal!, revision)}
                onUndo={() => handleUndo(message.id, message.proposal!)}
              />
            ) : null}
          </div>
        ))}
        {pendingLabel ? (
          <div className={`${styles.messageRow} ${styles.assistantRow}`}>
            <AiProcessIndicator label={pendingLabel} />
          </div>
        ) : null}
      </div>

      <div className={styles.searchRow}>
        <textarea
          ref={textareaRef}
          className={styles.input}
          placeholder={isAiEnabled ? 'Разбей эту задачу...' : 'Что бы вы хотели сделать сегодня?'}
          value={value}
          disabled={isAiEnabled ? isAiBusy : createTask.isPending}
          onChange={(e) => setValue(e.target.value)}
          onFocus={() => {
            if (isAiEnabled) {
              setIsExpanded(true);
            }
          }}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && !event.shiftKey) {
              event.preventDefault();
              void submitPrompt();
            }
          }}
          rows={1}
        />
        <button
          type="button"
          className={`${styles.sendBtn} ${!isAiEnabled ? styles.sendBtnNonAi : ''}`.trim()}
          aria-label={isAiEnabled ? 'Отправить' : 'Создать задачу'}
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => void submitPrompt()}
          disabled={isSendDisabled}
        >
          <SendArrowIcon className={!isAiEnabled ? styles.sendIconNonAi : undefined} />
        </button>
      </div>

      <div className={`${styles.chips} ${!isAiEnabled ? styles.chipsHidden : ''}`}>
        {CHIPS.map((chip) => (
          <button
            key={chip}
            type="button"
            className={styles.chip}
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => {
              setValue(chip);
              setIsExpanded(true);
              textareaRef.current?.focus();
            }}
          >
            {chip}
          </button>
        ))}
      </div>
    </div>
  );
}
