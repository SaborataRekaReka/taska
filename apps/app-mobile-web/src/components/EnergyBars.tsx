import { useState } from 'react';
import styles from './EnergyBars.module.css';

const BAR_COUNT = 20;

export function EnergyBars() {
  const [level, setLevel] = useState(12);

  return (
    <div className={styles.row}>
      {Array.from({ length: BAR_COUNT }, (_, i) => (
        <button
          key={i}
          className={`${styles.bar} ${i < level ? styles.filled : ''}`}
          onClick={() => setLevel(i + 1)}
        />
      ))}
    </div>
  );
}
