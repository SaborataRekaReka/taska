import type { MoodLevel } from './types';
import styles from './MoodSelector.module.css';

interface MoodSelectorProps {
  value: MoodLevel;
  onChange: (nextMood: MoodLevel) => void;
}

const MOODS: Array<{ value: MoodLevel; title: string }> = [
  { value: 1, title: 'Очень тяжело' },
  { value: 2, title: 'Ниже среднего' },
  { value: 3, title: 'Спокойно' },
  { value: 4, title: 'Хорошо' },
  { value: 5, title: 'Очень бодро' },
];

export function MoodSelector({ value, onChange }: MoodSelectorProps) {
  return (
    <div className={styles.row}>
      {MOODS.map((mood) => {
        const active = mood.value === value;
        return (
          <button
            key={mood.value}
            type="button"
            className={`${styles.circle} ${active ? styles.active : ''}`}
            onClick={() => onChange(mood.value)}
            aria-label={mood.title}
            title={mood.title}
          />
        );
      })}
    </div>
  );
}
