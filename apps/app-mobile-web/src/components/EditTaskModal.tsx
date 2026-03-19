import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  useConfirmAiOperation,
  useCreateAiPlan,
  useExecuteAiOperation,
  useReviseAiPlan,
  useTasks,
  useUndoAiOperation,
  useUpdateTask,
} from '../hooks/queries';
import type { AiPlanResponse } from '../lib/types';
import { useUiStore } from '../stores/ui';
import { TaskCard } from './TaskCard';
import { AiProposalCard } from './AiProposalCard';
import { AiToolChips } from './AiToolChips';
import sendIcon from '../assests/send.svg';
import styles from './EditTaskModal.module.css';

function toMarkdown(taskTitle: string, subtasks: { title: string; status: string }[], dueDate?: string | null) {
  const dueLine = dueDate ? `\n- due:: ${dueDate.slice(0, 10)}` : '';
  const subtasksBlock = subtasks.length > 0
    ? `\n- subtasks::\n${subtasks.map((sub) => `  - [${sub.status === 'DONE' ? 'x' : ' '}] ${sub.title}`).join('\n')}`
    : '';

  return `- [ ] ${taskTitle}\n- priority:: medium${dueLine}\n- tags:: #taska #assistant${subtasksBlock}`;
}

function extractTitleFromMarkdown(markdown: string, fallbackTitle: string): string {
  const firstNonEmptyLine = markdown
    .split(/\r?\n/)
    .map((line) => line.trim())
    .find((line) => line.length > 0);

  if (!firstNonEmptyLine) {
    return fallbackTitle;
  }

  const checklistMatch = firstNonEmptyLine.match(/^- \[[ xX]\]\s+(.+)$/);
  const rawTitle = checklistMatch ? checklistMatch[1] : firstNonEmptyLine;
  const normalizedTitle = rawTitle.replace(/^-+\s*/, '').trim();

  return normalizedTitle || fallbackTitle;
}

type AutosaveState = 'idle' | 'dirty' | 'saving' | 'saved' | 'error';

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

interface EditTaskModalProps {
  isOpen: boolean;
}

function nextMessageId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function EditTaskModal({ isOpen }: EditTaskModalProps) {
  const selectedTaskId = useUiStore((s) => s.selectedTaskId);
  const closeTaskAssistantModal = useUiStore((s) => s.closeTaskAssistantModal);
  const { data: tasks } = useTasks();
  const updateTask = useUpdateTask();
  const createPlan = useCreateAiPlan();
  const revisePlan = useReviseAiPlan();
  const confirmOperation = useConfirmAiOperation();
  const executeOperation = useExecuteAiOperation();
  const undoOperation = useUndoAiOperation();
  const selectedTask = useMemo(
    () => {
      if (!selectedTaskId) {
        return null;
      }

      const apiTask = tasks?.find((task) => task.id === selectedTaskId);
      if (apiTask) {
        return apiTask;
      }

      return null;
    },
    [selectedTaskId, tasks],
  );
  const [cachedTask, setCachedTask] = useState<typeof selectedTask>(null);
  const [activeTab, setActiveTab] = useState<'visual' | 'editor'>('visual');
  const [markdownValue, setMarkdownValue] = useState('');
  const [lastSavedMarkdown, setLastSavedMarkdown] = useState('');
  const [assistantPrompt, setAssistantPrompt] = useState('');
  const [autosaveState, setAutosaveState] = useState<AutosaveState>('idle');
  const [autosaveError, setAutosaveError] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const taskForView = selectedTask ?? cachedTask;

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
    setActiveTab('visual');
    setAutosaveState('idle');
    setAutosaveError(null);
  }, [selectedTaskId]);

  useEffect(() => {
    if (!selectedTask) {
      return;
    }

    const initialMarkdown = selectedTask.description?.trim().length
      ? selectedTask.description
      : toMarkdown(selectedTask.title, selectedTask.subtasks, selectedTask.deadline);

    setMarkdownValue(initialMarkdown);
    setLastSavedMarkdown(initialMarkdown);
  }, [selectedTask]);

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

  async function handleEditorBlur(): Promise<void> {
    if (!selectedTask || !isOpen) {
      return;
    }

    if (markdownValue === lastSavedMarkdown || updateTask.isPending) {
      if (markdownValue === lastSavedMarkdown) {
        setAutosaveState('saved');
      }
      return;
    }

    setAutosaveState('saving');
    setAutosaveError(null);

    try {
      const nextTitle = extractTitleFromMarkdown(markdownValue, selectedTask.title);
      await updateTask.mutateAsync({
        id: selectedTask.id,
        title: nextTitle,
        description: markdownValue,
      });

      setLastSavedMarkdown(markdownValue);
      setAutosaveState('saved');
    } catch (error) {
      const message = error instanceof Error
        ? error.message
        : 'Не удалось сохранить изменения';
      setAutosaveState('error');
      setAutosaveError(message);
    }
  }

  async function submitAssistantPrompt(): Promise<void> {
    const trimmed = assistantPrompt.trim();
    if (!trimmed || !taskForView) {
      return;
    }

    setMessages((current) => [...current, { id: nextMessageId('task-user'), role: 'user', content: trimmed }]);
    setAssistantPrompt('');

    try {
      const proposal = await createPlan.mutateAsync({
        prompt: `${trimmed}\n\nCurrent markdown:\n${markdownValue}`,
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

  async function handleRevise(messageId: string, proposal: AiPlanResponse, revisionPrompt: string): Promise<void> {
    setMessages((current) => current.map((message) => (
      message.id === messageId ? { ...message, busyLabel: 'Пересобираем план…' } : message
    )));

    try {
      const revised = await revisePlan.mutateAsync({ operationId: proposal.operationId, revisionPrompt });
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

  function handleReject(messageId: string): void {
    setMessages((current) => current.map((message) => (
      message.id === messageId ? { ...message, status: 'REJECTED', busyLabel: null } : message
    )));
  }

  const autosaveLabel = (() => {
    if (autosaveState === 'saving') return 'Saving...';
    if (autosaveState === 'saved') return 'Saved';
    if (autosaveState === 'dirty') return 'Unsaved changes';
    if (autosaveState === 'error') return 'Save failed';
    return 'Autosave on blur';
  })();

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
              <div className={styles.tabs}>
                <button
                  className={`${styles.tab} ${activeTab === 'visual' ? styles.tabActive : ''}`}
                  onClick={() => setActiveTab('visual')}
                >
                  Визуально
                </button>
                <button
                  className={`${styles.tab} ${activeTab === 'editor' ? styles.tabActive : ''}`}
                  onClick={() => setActiveTab('editor')}
                >
                  Редактор
                </button>
              </div>
              <button className={styles.closeBtn} onClick={closeTaskAssistantModal}>
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                  <path d="M5 5l10 10M15 5L5 15" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
                </svg>
              </button>
            </div>

            <div className={styles.body}>
              <div className={styles.workspace}>
                <div className={styles.leftPane}>
                  {activeTab === 'visual' ? (
                    <div className={styles.visualContent}>
                      <div className={styles.contentPanel}>
                        <div className={styles.taskPreview}>
                          <TaskCard task={taskForView} />
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className={styles.editorContent}>
                      <div className={styles.contentPanel}>
                        <div className={styles.editorArea}>
                          <textarea
                            className={styles.editorInput}
                            value={markdownValue}
                            onChange={(e) => {
                              const nextValue = e.target.value;
                              setMarkdownValue(nextValue);
                              setAutosaveError(null);
                              setAutosaveState(nextValue === lastSavedMarkdown ? 'saved' : 'dirty');
                            }}
                            onBlur={() => void handleEditorBlur()}
                          />
                          <span
                            className={`${styles.savedLabel} ${autosaveState === 'error' ? styles.savedLabelError : ''}`}
                            title={autosaveError ?? undefined}
                          >
                            {autosaveLabel}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <aside className={styles.chatPane}>
                  <div className={styles.chatHeader}>
                    <p className={styles.chatEyebrow}>Task AI</p>
                    <h3 className={styles.chatTitle}>Контекстная работа по этой задаче</h3>
                  </div>
                  <div className={styles.chatMessages}>
                    {messages.length === 0 ? (
                      <div className={styles.chatEmptyState}>
                        Спроси AI про эту задачу: разбить на подзадачи, переписать markdown или предложить безопасный план изменений.
                      </div>
                    ) : null}
                    {messages.map((message) => (
                      <div key={message.id} className={`${styles.chatRow} ${message.role === 'user' ? styles.chatRowUser : styles.chatRowAssistant}`}>
                        <div className={`${styles.chatBubble} ${message.role === 'user' ? styles.chatBubbleUser : styles.chatBubbleAssistant}`}>
                          <p>{message.content}</p>
                        </div>
                        {message.role === 'assistant' && message.proposal ? (
                          <AiProposalCard
                            proposal={message.proposal}
                            status={message.status ?? 'DRAFT'}
                            busyLabel={message.busyLabel}
                            executionCount={message.executionCount}
                            canUndo={message.status === 'EXECUTED'}
                            onApprove={() => void handleApprove(message.id, message.proposal!)}
                            onReject={() => handleReject(message.id)}
                            onRevise={(revisionPrompt) => void handleRevise(message.id, message.proposal!, revisionPrompt)}
                            onUndo={message.status === 'EXECUTED' ? () => void handleUndo(message.id, message.proposal!) : undefined}
                          />
                        ) : null}
                      </div>
                    ))}
                  </div>
                </aside>
              </div>
            </div>

            <div className={styles.footer}>
              <AiToolChips onSelectPrompt={(prompt) => setAssistantPrompt(prompt)} />
              <div className={styles.footerInput}>
                <input
                  className={styles.inputField}
                  placeholder="Что бы вы хотели сделать?"
                  value={assistantPrompt}
                  onChange={(e) => setAssistantPrompt(e.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                      event.preventDefault();
                      void submitAssistantPrompt();
                    }
                  }}
                />
                <button className={styles.sendBtn} type="button" aria-label="Send" onClick={() => void submitAssistantPrompt()}>
                  <img src={sendIcon} alt="" className={styles.sendIcon} />
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
