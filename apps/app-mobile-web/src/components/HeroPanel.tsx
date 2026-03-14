import { useCallback, useEffect, useRef, useState } from 'react';
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
  const [value, setValue] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const [panelOpen, setPanelOpen] = useState(false);
  const [chipsVisible, setChipsVisible] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const collapseTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const wantOpen = isFocused || value.trim().length > 0;

  useEffect(() => {
    if (collapseTimer.current !== null) {
      clearTimeout(collapseTimer.current);
    }

    if (wantOpen) {
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
  }, [wantOpen]);

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;

    el.style.height = 'auto';
    el.style.height = `${Math.max(el.scrollHeight, 26)}px`;
  }, [value]);

  const handleBlur = useCallback(() => setIsFocused(false), []);
  const handleFocus = useCallback(() => setIsFocused(true), []);

  const panelClass = [
    styles.panel,
    panelOpen ? styles.expanded : styles.collapsed,
    chipsVisible ? styles.chipsShow : styles.chipsHide,
  ].join(' ');

  return (
    <div className={panelClass}>
      <textarea
        ref={textareaRef}
        className={styles.input}
        placeholder="Что бы вы хотели сделать?"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onFocus={handleFocus}
        onBlur={handleBlur}
        rows={1}
      />
      <div className={styles.chips}>
        {CHIPS.map((chip) => (
          <button
            key={chip}
            className={styles.chip}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => setValue(chip)}
          >
            {chip}
          </button>
        ))}
      </div>
    </div>
  );
}
