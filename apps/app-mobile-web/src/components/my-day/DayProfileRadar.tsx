import { motion } from 'framer-motion';
import type { DayProfile } from './types';
import styles from './DayProfileRadar.module.css';

interface DayProfileRadarProps {
  profile: DayProfile;
}

type AxisName = 'top' | 'right' | 'bottom' | 'left';

const CHART_SIZE = 360;
const CENTER = CHART_SIZE / 2;
const RADIUS = 128;
const GRID_LEVELS = Array.from({ length: 10 }, (_, index) => (index + 1) / 10);
const SHAPE_TRANSITION = {
  type: 'spring' as const,
  stiffness: 120,
  damping: 20,
  mass: 0.85,
};

function clampRatio(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function axisPoint(axis: AxisName, ratio: number): { x: number; y: number } {
  const distance = RADIUS * ratio;

  if (axis === 'top') {
    return { x: CENTER, y: CENTER - distance };
  }

  if (axis === 'right') {
    return { x: CENTER + distance, y: CENTER };
  }

  if (axis === 'bottom') {
    return { x: CENTER, y: CENTER + distance };
  }

  return { x: CENTER - distance, y: CENTER };
}

function polygonPath(top: { x: number; y: number }, right: { x: number; y: number }, bottom: { x: number; y: number }, left: { x: number; y: number }): string {
  return `M ${top.x} ${top.y} L ${right.x} ${right.y} L ${bottom.x} ${bottom.y} L ${left.x} ${left.y} Z`;
}

export function DayProfileRadar({ profile }: DayProfileRadarProps) {
  const top = axisPoint('top', clampRatio(profile.duration / 100));
  const right = axisPoint('right', clampRatio(profile.urgency / 100));
  const bottom = axisPoint('bottom', clampRatio(profile.load / 100));
  const left = axisPoint('left', clampRatio(profile.importance / 100));
  const dataPath = polygonPath(top, right, bottom, left);

  return (
    <div className={styles.wrap}>
      <h3 className={styles.title}>Профиль дня</h3>
      <div className={styles.chartShell}>
        <svg className={styles.svg} viewBox={`0 0 ${CHART_SIZE} ${CHART_SIZE}`} aria-label="Профиль дня: важность, срочность, длительность и нагрузка">
          <defs>
            <linearGradient id="profileFill" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="rgba(138, 195, 255, 0.42)" />
              <stop offset="100%" stopColor="rgba(112, 129, 240, 0.25)" />
            </linearGradient>
            <filter id="profileGlow">
              <feGaussianBlur stdDeviation="7" result="blurred" />
              <feMerge>
                <feMergeNode in="blurred" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {GRID_LEVELS.map((level) => {
            const levelPath = polygonPath(
              axisPoint('top', level),
              axisPoint('right', level),
              axisPoint('bottom', level),
              axisPoint('left', level),
            );

            return <path key={level} d={levelPath} className={styles.grid} />;
          })}

          <motion.path
            className={styles.dataFill}
            initial={false}
            animate={{ d: dataPath }}
            transition={SHAPE_TRANSITION}
          />
          <motion.path
            className={styles.dataStroke}
            filter="url(#profileGlow)"
            initial={false}
            animate={{ d: dataPath }}
            transition={SHAPE_TRANSITION}
          />
        </svg>

        <span className={`${styles.axisLabel} ${styles.topLabel}`}>Длительность</span>
        <span className={`${styles.axisLabel} ${styles.rightLabel}`}>Срочность</span>
        <span className={`${styles.axisLabel} ${styles.bottomLabel}`}>Нагрузка</span>
        <span className={`${styles.axisLabel} ${styles.leftLabel}`}>Важность</span>
      </div>

      <p className={styles.dayLabel}>{profile.dayLabel}</p>

      <div className={styles.stats}>
        <div className={styles.stat}>
          <span>Важность</span>
          <strong>{profile.importance}</strong>
        </div>
        <div className={styles.stat}>
          <span>Срочность</span>
          <strong>{profile.urgency}</strong>
        </div>
        <div className={styles.stat}>
          <span>Длительность</span>
          <strong>{profile.duration}</strong>
        </div>
        <div className={styles.stat}>
          <span>Нагрузка</span>
          <strong>{profile.load}</strong>
        </div>
      </div>
    </div>
  );
}
