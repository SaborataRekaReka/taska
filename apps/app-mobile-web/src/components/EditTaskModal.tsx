import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useUiStore } from '../stores/ui';
import { useTasks, useUpdateTask } from '../hooks/queries';
import { TaskCard } from './TaskCard';
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

interface EditTaskModalProps {
  isOpen: boolean;
}

export function EditTaskModal({ isOpen }: EditTaskModalProps) {
  const selectedTaskId = useUiStore((s) => s.selectedTaskId);
  const closeTaskAssistantModal = useUiStore((s) => s.closeTaskAssistantModal);
  const demoTasks = useUiStore((s) => s.demoTasks);
  const { data: tasks } = useTasks();
  const updateTask = useUpdateTask();
  const selectedTask = useMemo(
    () => {
      if (!selectedTaskId) {
        return null;
      }

      const apiTask = tasks?.find((task) => task.id === selectedTaskId);
      if (apiTask) {
        return apiTask;
      }

      return demoTasks.find((task) => task.id === selectedTaskId) ?? null;
    },
    [demoTasks, selectedTaskId, tasks],
  );
  const [cachedTask, setCachedTask] = useState<typeof selectedTask>(null);
  const [activeTab, setActiveTab] = useState<'visual' | 'editor'>('visual');
  const [markdownValue, setMarkdownValue] = useState('');
  const [lastSavedMarkdown, setLastSavedMarkdown] = useState('');
  const [assistantPrompt, setAssistantPrompt] = useState('');
  const [autosaveState, setAutosaveState] = useState<AutosaveState>('idle');
  const [autosaveError, setAutosaveError] = useState<string | null>(null);
  const taskForView = selectedTask ?? cachedTask;

  useEffect(() => {
    if (!selectedTask) {
      return;
    }

    setCachedTask(selectedTask);
  }, [selectedTask]);

  useEffect(() => {
    if (!selectedTask) {
      return;
    }

    const initialMarkdown = selectedTask.description?.trim().length
      ? selectedTask.description
      : toMarkdown(selectedTask.title, selectedTask.subtasks, selectedTask.deadline);

    setMarkdownValue(initialMarkdown);
    setLastSavedMarkdown(initialMarkdown);
    setAssistantPrompt('');
    setActiveTab('visual');
    setAutosaveState('idle');
    setAutosaveError(null);
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
        : '\u041d\u0435 \u0443\u0434\u0430\u043b\u043e\u0441\u044c \u0441\u043e\u0445\u0440\u0430\u043d\u0438\u0442\u044c \u0438\u0437\u043c\u0435\u043d\u0435\u043d\u0438\u044f';
      setAutosaveState('error');
      setAutosaveError(message);
    }
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
                  {'\u0412\u0438\u0437\u0443\u0430\u043b\u044c\u043d\u043e'}
                </button>
                <button
                  className={`${styles.tab} ${activeTab === 'editor' ? styles.tabActive : ''}`}
                  onClick={() => setActiveTab('editor')}
                >
                  {'\u0420\u0435\u0434\u0430\u043a\u0442\u043e\u0440'}
                </button>
              </div>
              <button className={styles.closeBtn} onClick={closeTaskAssistantModal}>
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                  <path d="M5 5l10 10M15 5L5 15" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
                </svg>
              </button>
            </div>

            <div className={styles.body}>
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
                        onBlur={handleEditorBlur}
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

            <div className={styles.footer}>
              <AiToolChips />
              <div className={styles.footerInput}>
                <input
                  className={styles.inputField}
                  placeholder={'\u0427\u0442\u043e \u0431\u044b \u0432\u044b \u0445\u043e\u0442\u0435\u043b\u0438 \u0441\u0434\u0435\u043b\u0430\u0442\u044c?'}
                  value={assistantPrompt}
                  onChange={(e) => setAssistantPrompt(e.target.value)}
                />
                <button className={styles.sendBtn} type="button" aria-label="Send">
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
