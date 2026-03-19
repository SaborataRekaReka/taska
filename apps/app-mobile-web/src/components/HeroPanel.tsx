import { useCallback, useEffect, useRef, useState } from 'react';
import { useCreateTask } from '../hooks/queries';
import { useUiStore } from '../stores/ui';
import sendIcon from '../assests/send.svg';
import styles from './HeroPanel.module.css';

const CHIPS = [
  'Разобрать задачи',
  'Предложить план на день',
  'Найти важное',
  'Забыть о задачах',
  'Покажи статистику',
];

const CHIPS_FADE_MS = 180;

export function HeroPanel() {
  const createTask = useCreateTask();
  const activeListId = useUiStore((s) => s.activeListId);
  const [value, setValue] = useState('');
  const [isExpanded, setIsExpanded] = useState(false);
  const [panelOpen, setPanelOpen] = useState(false);
  const [chipsVisible, setChipsVisible] = useState(false);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const collapseTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (collapseTimer.current !== null) {
      clearTimeout(collapseTimer.current);
    }

    if (isExpanded) {
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
  }, [isExpanded]);

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

  const submitPrompt = useCallback(() => {
    const trimmed = value.trim();
    if (!trimmed) {
      return;
    }

    const listId = activeListId && !activeListId.startsWith('__') ? activeListId : undefined;
    createTask.mutate({ title: trimmed, listId });

    setValue('');
    setIsExpanded(false);
  }, [activeListId, createTask, value]);

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
              submitPrompt();
            }
          }}
          rows={1}
        />
        <button
          type="button"
          className={styles.sendBtn}
          aria-label="Отправить"
          onMouseDown={(event) => event.preventDefault()}
          onClick={submitPrompt}
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
