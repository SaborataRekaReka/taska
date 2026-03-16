import styles from './EnergyBars.module.css';

interface EnergyBarsProps {
  level: number;
  onChange: (nextLevel: number) => void;
  barsCount?: number;
}

export function EnergyBars({ level, onChange, barsCount = 20 }: EnergyBarsProps) {
  return (
    <div className={styles.row}>
      {Array.from({ length: barsCount }, (_, index) => {
        const barLevel = index + 1;
        const filled = barLevel <= level;
        return (
          <button
            key={barLevel}
            type="button"
            className={`${styles.bar} ${filled ? styles.filled : ''}`}
            onClick={() => onChange(barLevel)}
            aria-label={`Энергия ${barLevel} из ${barsCount}`}
          />
        );
      })}
    </div>
  );
}
