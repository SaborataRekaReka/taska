import { useState } from 'react';
import { useUiStore } from '../stores/ui';
import styles from './HeroPanel.module.css';

const CHIPS = [
  'Разобрать задачи',
  'Предложить план на день',
  'Найти важное',
  'Забыть о задачах',
  'Покажи статистику',
];

export function HeroPanel() {
  const demoState = useUiStore((s) => s.demoState);
  const [value, setValue] = useState('');

  const isInactive = demoState === 'inactiveInput';
  const isFilled = demoState === 'tempAiList';
  const showChips = !isInactive;
  const displayValue = isFilled
    ? 'Найди все дела , которые я долго откладывал'
    : value;

  return (
    <div className={`${styles.panel} ${isInactive ? styles.inactive : styles.active}`}>
      <textarea
        className={styles.input}
        placeholder="Что бы вы хотели сделать?"
        value={displayValue}
        onChange={(e) => setValue(e.target.value)}
        rows={1}
        readOnly={isFilled}
      />
      {showChips && (
        <div className={styles.chips}>
          {CHIPS.map((chip) => (
            <button key={chip} className={styles.chip} onClick={() => setValue(chip)}>
              {chip}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
