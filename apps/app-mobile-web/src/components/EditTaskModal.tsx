import { useState } from 'react';
import { useUiStore } from '../stores/ui';
import { DEMO_TASKS, MARKDOWN_EDITOR_CONTENT } from '../lib/demoData';
import { TaskCard } from './TaskCard';
import { AiToolChips } from './AiToolChips';
import { InsertBetween } from './InsertBetween';
import styles from './EditTaskModal.module.css';

export function EditTaskModal() {
  const demoState = useUiStore((s) => s.demoState);
  const isMarkdown = demoState === 'markdownEditModal';
  const [activeTab, setActiveTab] = useState<'visual' | 'editor'>(isMarkdown ? 'editor' : 'visual');
  const setDemoState = useUiStore((s) => s.setDemoState);

  return (
    <div className={styles.overlay}>
      <div className={styles.modal}>
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
          <button className={styles.closeBtn} onClick={() => setDemoState('workListHover')}>
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M5 5l10 10M15 5L5 15" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
            </svg>
          </button>
        </div>

        <div className={styles.body}>
          {activeTab === 'visual' ? (
            <div className={styles.visualContent}>
              <div className={styles.taskPreview}>
                <TaskCard task={DEMO_TASKS[0]!} />
                <InsertBetween />
              </div>
            </div>
          ) : (
            <div className={styles.editorContent}>
              <div className={styles.editorArea}>
                <pre className={styles.editorText}>{MARKDOWN_EDITOR_CONTENT}</pre>
                <span className={styles.savedLabel}>Saved...</span>
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
              readOnly
            />
          </div>
        </div>
      </div>
    </div>
  );
}
