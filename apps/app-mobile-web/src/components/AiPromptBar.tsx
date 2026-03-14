import { useState } from 'react';
import styles from './AiPromptBar.module.css';

const CHIPS = [
  'Разобрать задачи',
  'Предложить план на день',
  'Найти важное',
  'Забыть о задачах',
  'Покажи статистику',
];

export function AiPromptBar() {
  const [value, setValue] = useState('');

  return (
    <div className={styles.wrapper}>
      <textarea
        className={styles.textarea}
        placeholder="Что бы вы хотели сделать?"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        rows={1}
      />
      <div className={styles.chips}>
        {CHIPS.map((chip) => (
          <button
            key={chip}
            className={styles.chip}
            onClick={() => setValue(chip)}
          >
            {chip}
          </button>
        ))}
      </div>
    </div>
  );
}
