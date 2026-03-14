import { useState } from 'react';
import styles from './MoodSelector.module.css';

export function MoodSelector() {
  const [selected, setSelected] = useState<number | null>(null);

  return (
    <div className={styles.row}>
      {[0, 1, 2, 3, 4].map((i) => (
        <button
          key={i}
          className={`${styles.circle} ${selected === i ? styles.active : ''}`}
          onClick={() => setSelected(i)}
        />
      ))}
    </div>
  );
}
