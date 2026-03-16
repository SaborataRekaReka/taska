import { useState } from 'react';
import { ASSISTANT_WISH_PRESETS } from './computeDayProfile';
import styles from './AssistantWishChips.module.css';

interface AssistantWishChipsProps {
  selected: string[];
  onChange: (wishes: string[]) => void;
}

export function AssistantWishChips({ selected, onChange }: AssistantWishChipsProps) {
  const [addingCustom, setAddingCustom] = useState(false);
  const [customWish, setCustomWish] = useState('');

  function toggleWish(wish: string): void {
    if (selected.includes(wish)) {
      onChange(selected.filter((item) => item !== wish));
      return;
    }

    onChange([...selected, wish]);
  }

  function commitCustomWish(): void {
    const normalized = customWish.trim();
    if (!normalized) {
      setAddingCustom(false);
      setCustomWish('');
      return;
    }

    if (!selected.includes(normalized)) {
      onChange([...selected, normalized]);
    }

    setAddingCustom(false);
    setCustomWish('');
  }

  return (
    <div className={styles.wrap}>
      {ASSISTANT_WISH_PRESETS.map((wish) => {
        const active = selected.includes(wish);
        return (
          <button
            key={wish}
            type="button"
            className={`${styles.chip} ${active ? styles.active : ''}`}
            onClick={() => toggleWish(wish)}
          >
            {wish}
          </button>
        );
      })}

      {addingCustom ? (
        <input
          className={styles.customInput}
          value={customWish}
          placeholder="Свой вариант"
          onChange={(event) => setCustomWish(event.target.value)}
          onBlur={commitCustomWish}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault();
              commitCustomWish();
            }
            if (event.key === 'Escape') {
              setAddingCustom(false);
              setCustomWish('');
            }
          }}
          autoFocus
        />
      ) : (
        <button
          type="button"
          className={styles.addChip}
          onClick={() => setAddingCustom(true)}
          aria-label="Добавить пожелание"
          title="Добавить пожелание"
        >
          +
        </button>
      )}
    </div>
  );
}
