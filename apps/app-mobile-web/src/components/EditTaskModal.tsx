import { useEffect, useMemo, useState } from 'react';
import { useUiStore } from '../stores/ui';
import { DEMO_TASKS } from '../lib/demoData';
import { TaskCard } from './TaskCard';
import { AiToolChips } from './AiToolChips';
import styles from './EditTaskModal.module.css';

function toMarkdown(taskTitle: string, subtasks: { title: string; status: string }[], dueDate?: string | null) {
  const dueLine = dueDate ? `\n- due:: ${dueDate.slice(0, 10)}` : '';
  const subtasksBlock = subtasks.length > 0
    ? `\n- subtasks::\n${subtasks.map((sub) => `  - [${sub.status === 'DONE' ? 'x' : ' '}] ${sub.title}`).join('\n')}`
    : '';

  return `- [ ] ${taskTitle}\n- priority:: medium${dueLine}\n- tags:: #taska #assistant${subtasksBlock}`;
}

export function EditTaskModal() {
  const selectedTaskId = useUiStore((s) => s.selectedTaskId);
  const closeTaskAssistantModal = useUiStore((s) => s.closeTaskAssistantModal);
  const selectedTask = useMemo(
    () => DEMO_TASKS.find((task) => task.id === selectedTaskId) ?? DEMO_TASKS[0],
    [selectedTaskId],
  );
  const [activeTab, setActiveTab] = useState<'visual' | 'editor'>('visual');
  const [markdownValue, setMarkdownValue] = useState('');
  const [assistantPrompt, setAssistantPrompt] = useState('');

  useEffect(() => {
    if (!selectedTask) {
      return;
    }

    setMarkdownValue(toMarkdown(selectedTask.title, selectedTask.subtasks, selectedTask.deadline));
    setAssistantPrompt('');
    setActiveTab('visual');
  }, [selectedTask]);

  if (!selectedTaskId || !selectedTask) {
    return null;
  }

  return (
    <div className={styles.overlay} onClick={closeTaskAssistantModal}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
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
          {activeTab === 'visual' ? (
            <div className={styles.visualContent}>
              <div className={styles.contentPanel}>
                <div className={styles.taskPreview}>
                  <TaskCard task={selectedTask} />
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
                    onChange={(e) => setMarkdownValue(e.target.value)}
                  />
                  <span className={styles.savedLabel}>Saved...</span>
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
              placeholder="Что бы вы хотели сделать?"
              value={assistantPrompt}
              onChange={(e) => setAssistantPrompt(e.target.value)}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
