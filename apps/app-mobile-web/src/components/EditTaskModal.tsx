import { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  useAllTasks,
  useConfirmAiOperation,
  useCreateAiPlan,
  useExecuteAiOperation,
  useLists,
  useReviseAiPlan,
  useUndoAiOperation,
} from '../hooks/queries';
import type { AiPlanResponse } from '../lib/types';
import { useUiStore } from '../stores/ui';
import { TaskCard } from './TaskCard';
import { AiProposalCard, type AiProposalRevisionPayload } from './AiProposalCard';
import { AiToolChips } from './AiToolChips';
import { AiProcessIndicator } from './AiProcessIndicator';
import styles from './EditTaskModal.module.css';

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

interface EditTaskModalProps {
  isOpen: boolean;
}

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

export function EditTaskModal({ isOpen }: EditTaskModalProps) {
  const selectedTaskId = useUiStore((s) => s.selectedTaskId);
  const closeTaskAssistantModal = useUiStore((s) => s.closeTaskAssistantModal);
  const { data: allTasks = [] } = useAllTasks();
  const { data: lists = [] } = useLists();
  const createPlan = useCreateAiPlan();
  const revisePlan = useReviseAiPlan();
  const confirmOperation = useConfirmAiOperation();
  const executeOperation = useExecuteAiOperation();
  const undoOperation = useUndoAiOperation();
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const selectedTask = useMemo(
    () => {
      if (!selectedTaskId) {
        return null;
      }

      return allTasks.find((task) => task.id === selectedTaskId) ?? null;
    },
    [allTasks, selectedTaskId],
  );
  const [cachedTask, setCachedTask] = useState<typeof selectedTask>(null);
  const [assistantPrompt, setAssistantPrompt] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [pendingLabel, setPendingLabel] = useState<string | null>(null);
  const taskForView = selectedTask ?? cachedTask;
  const availableTaskLists = useMemo(
    () => lists.map((list) => ({ id: list.id, name: list.name, isDefault: list.isDefault })),
    [lists],
  );

  useEffect(() => {
    if (!selectedTask) {
      return;
    }

    setCachedTask(selectedTask);
  }, [selectedTask]);

  useEffect(() => {
    if (!selectedTaskId) {
      return;
    }

    setAssistantPrompt('');
    setMessages([]);
  }, [selectedTaskId]);

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) {
      return;
    }

    el.style.height = 'auto';
    el.style.height = `${Math.max(el.scrollHeight, 24)}px`;
  }, [assistantPrompt]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    function onKeyDown(event: KeyboardEvent): void {
      if (event.key === 'Escape') {
        closeTaskAssistantModal();
      }
    }

    const previousOverflow = document.body.style.overflow;
    const previousPaddingRight = document.body.style.paddingRight;
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;

    if (scrollbarWidth > 0) {
      document.body.style.paddingRight = `${scrollbarWidth}px`;
    }

    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.body.style.paddingRight = previousPaddingRight;
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [closeTaskAssistantModal, isOpen]);

  async function submitAssistantPrompt(): Promise<void> {
    const trimmed = assistantPrompt.trim();
    if (!trimmed || !taskForView || pendingLabel) {
      return;
    }

    setMessages((current) => [...current, { id: nextMessageId('task-user'), role: 'user', content: trimmed }]);
    setAssistantPrompt('');
    setPendingLabel('AI анализирует задачу...');

    try {
      const taskContext = [
        `Current task title: ${taskForView.title}`,
        taskForView.description ? `Current task description: ${taskForView.description}` : null,
        `Current status: ${taskForView.status}`,
        `Current priority: ${taskForView.priority}`,
      ].filter(Boolean).join('\n');

      const proposal = await createPlan.mutateAsync({
        prompt: `${trimmed}\n\nTask context:\n${taskContext}`,
        scope: 'TASK',
        taskId: taskForView.id,
        context: { taskIds: [taskForView.id], limit: 1 },
      });

      setMessages((current) => [
        ...current,
        {
          id: nextMessageId('task-assistant'),
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
        { id: nextMessageId('task-error'), role: 'assistant', content: message, status: 'FAILED' },
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
          ? { ...message, status: execution.status, executionCount: execution.results.length, busyLabel: null }
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
          ? { ...message, proposal: revised, content: revised.assistantMessage, status: revised.status, busyLabel: null }
          : message
      )));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Не удалось обновить план.';
      setMessages((current) => current.map((item) => (
        item.id === messageId ? { ...item, status: 'FAILED', busyLabel: message } : item
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
        item.id === messageId ? { ...item, status: 'FAILED', busyLabel: message } : item
      )));
    }
  }

  return (
    <AnimatePresence
      onExitComplete={() => {
        if (!isOpen) {
          setCachedTask(null);
        }
      }}
    >
      {isOpen && taskForView && (
        <motion.div
          className={styles.overlay}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.34, ease: [0.22, 1, 0.36, 1] }}
          onClick={closeTaskAssistantModal}
        >
          <motion.div
            className={styles.modal}
            initial={{ y: 80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 80, opacity: 0 }}
            transition={{ duration: 0.46, ease: [0.16, 1, 0.3, 1] }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className={styles.header}>
              <button className={styles.closeBtn} onClick={closeTaskAssistantModal}>
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                  <path d="M5 5l10 10M15 5L5 15" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
                </svg>
              </button>
            </div>

            <div className={styles.body}>
              <div className={styles.messages}>
                <div className={`${styles.messageRow} ${styles.assistantRow}`}>
                  <div className={styles.taskCardWrap}>
                    <TaskCard task={taskForView} />
                  </div>
                </div>


                {messages.map((message) => (
                  <div key={message.id} className={`${styles.messageRow} ${message.role === 'user' ? styles.userRow : styles.assistantRow}`}>
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
                        onApprove={() => void handleApprove(message.id, message.proposal!)}
                        onRevise={(revision) => void handleRevise(message.id, message.proposal!, revision)}
                        onUndo={() => void handleUndo(message.id, message.proposal!)}
                      />
                    ) : null}
                  </div>
                ))}

                {pendingLabel ? (
                  <div className={`${styles.messageRow} ${styles.assistantRow}`}>
                    <AiProcessIndicator label={pendingLabel} tone="soft" />
                  </div>
                ) : null}
              </div>
            </div>

            <div className={styles.footer}>
              <AiToolChips onSelectPrompt={(prompt) => setAssistantPrompt(prompt)} />
              <div className={styles.searchRow}>
                <textarea
                  ref={textareaRef}
                  className={styles.input}
                  placeholder="Что бы вы хотели сделать?"
                  value={assistantPrompt}
                  disabled={Boolean(pendingLabel)}
                  rows={1}
                  onChange={(e) => setAssistantPrompt(e.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' && !event.shiftKey) {
                      event.preventDefault();
                      void submitAssistantPrompt();
                    }
                  }}
                />
                <button
                  className={styles.sendBtn}
                  type="button"
                  aria-label="Send"
                  onClick={() => void submitAssistantPrompt()}
                  disabled={Boolean(pendingLabel)}
                >
                  <SendArrowIcon />
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
