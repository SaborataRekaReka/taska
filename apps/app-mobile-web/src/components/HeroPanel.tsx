import { useEffect, useMemo, useRef, useState } from 'react';
import {
  useConfirmAiOperation,
  useCreateAiPlan,
  useExecuteAiOperation,
  useLists,
  useReviseAiPlan,
  useTasks,
  useUndoAiOperation,
} from '../hooks/queries';
import type { AiPlanResponse } from '../lib/types';
import { useUiStore } from '../stores/ui';
import sendIcon from '../assests/send.svg';
import { AiProposalCard } from './AiProposalCard';
import styles from './HeroPanel.module.css';

const CHIPS = [
  'Разобрать задачи',
  'Предложить план на день',
  'Найти важное',
  'Перенести всё срочное в один список',
  'Покажи, что можно закрыть сегодня',
];

const CHIPS_FADE_MS = 180;

type ChatMessage =
  | { id: string; role: 'user'; content: string }
  | {
      id: string;
      role: 'assistant';
      content: string;
      proposal?: AiPlanResponse;
      status?: 'DRAFT' | 'PLANNED' | 'CONFIRMED' | 'EXECUTED' | 'UNDONE' | 'FAILED' | 'REJECTED';
      busyLabel?: string | null;
      executionCount?: number;
    };

function nextMessageId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function HeroPanel() {
  const activeListId = useUiStore((s) => s.activeListId);
  const searchQuery = useUiStore((s) => s.searchQuery);
  const [value, setValue] = useState('');
  const [isExpanded, setIsExpanded] = useState(false);
  const [panelOpen, setPanelOpen] = useState(false);
  const [chipsVisible, setChipsVisible] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const collapseTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const createPlan = useCreateAiPlan();
  const revisePlan = useReviseAiPlan();
  const confirmOperation = useConfirmAiOperation();
  const executeOperation = useExecuteAiOperation();
  const undoOperation = useUndoAiOperation();
  const { data: tasks = [] } = useTasks();
  const { data: lists = [] } = useLists();

  useEffect(() => {
    if (collapseTimer.current !== null) {
      clearTimeout(collapseTimer.current);
    }

    if (isExpanded || messages.length > 0) {
      setPanelOpen(true);
      const id = setTimeout(() => setChipsVisible(true), 80);
      return () => clearTimeout(id);
    }

    setChipsVisible(false);
    collapseTimer.current = setTimeout(() => setPanelOpen(false), CHIPS_FADE_MS + 40);
    return () => {
      if (collapseTimer.current !== null) {
        clearTimeout(collapseTimer.current);
      }
    };
  }, [isExpanded, messages.length]);

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;

    el.style.height = 'auto';
    el.style.height = `${Math.max(el.scrollHeight, 37)}px`;
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

  async function submitPrompt(): Promise<void> {
    const trimmed = value.trim();
    if (!trimmed) {
      return;
    }

    const userMessageId = nextMessageId('user');
    setMessages((current) => [...current, { id: userMessageId, role: 'user', content: trimmed }]);
    setValue('');
    setIsExpanded(true);

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

  async function handleRevise(messageId: string, proposal: AiPlanResponse, revisionPrompt: string): Promise<void> {
    setMessages((current) => current.map((message) => (
      message.id === messageId ? { ...message, busyLabel: 'Пересобираем план…' } : message
    )));

    try {
      const revised = await revisePlan.mutateAsync({ operationId: proposal.operationId, revisionPrompt });
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

  function handleReject(messageId: string): void {
    setMessages((current) => current.map((message) => (
      message.id === messageId ? { ...message, status: 'REJECTED', busyLabel: null } : message
    )));
  }

  const panelClass = [
    styles.panel,
    panelOpen ? styles.expanded : styles.collapsed,
    chipsVisible ? styles.chipsShow : styles.chipsHide,
  ].join(' ');

  return (
    <div
      ref={panelRef}
      className={panelClass}
      onMouseDown={() => setIsExpanded(true)}
    >
      {messages.length > 0 ? (
        <div className={styles.messages}>
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
                  canUndo={message.status === 'EXECUTED'}
                  onApprove={() => handleApprove(message.id, message.proposal!)}
                  onReject={() => handleReject(message.id)}
                  onRevise={(revisionPrompt) => handleRevise(message.id, message.proposal!, revisionPrompt)}
                  onUndo={message.status === 'EXECUTED' ? () => handleUndo(message.id, message.proposal!) : undefined}
                />
              ) : null}
            </div>
          ))}
        </div>
      ) : null}

      <div className={styles.inputRow}>
        <textarea
          ref={textareaRef}
          className={styles.input}
          placeholder="Что бы вы хотели сделать?"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onFocus={() => setIsExpanded(true)}
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
          className={styles.sendBtn}
          aria-label="Отправить"
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => void submitPrompt()}
        >
          <img src={sendIcon} alt="" className={styles.sendIcon} />
        </button>
      </div>
      <div className={styles.chips}>
        {CHIPS.map((chip) => (
          <button
            key={chip}
            className={styles.chip}
            onMouseDown={(e) => e.preventDefault()}
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
