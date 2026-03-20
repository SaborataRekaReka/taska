import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { AssistantWishChips } from './AssistantWishChips';
import { DayProfileRadar } from './DayProfileRadar';
import { EnergyBars } from './EnergyBars';
import { MoodSelector } from './MoodSelector';
import { GradientBlob } from '../GradientBackground';
import { computeDayProfile } from './computeDayProfile';
import { profileToColors, energyToSpread } from '../../lib/profileColors';
import { useUiStore } from '../../stores/ui';
import aiStarsIcon from '../../assests/ai_stars.svg';
import type { DayProfile, DayTask, MoodLevel } from './types';
import styles from './MyDayModal.module.css';

interface MyDayModalProps {
  isOpen: boolean;
  onClose: () => void;
  tasks?: DayTask[];
  date?: Date;
  closeOnBackdrop?: boolean;
  onCreateMyDay?: (payload: {
    profile: DayProfile;
    mood: MoodLevel;
    energy: number;
    wishes: string[];
  }) => Promise<void> | void;
}

const MOCK_DAY_TASKS: DayTask[] = [
  {
    priority: 'high',
    dueDate: '2026-03-15T11:30:00.000Z',
    estimatedMinutes: 150,
    effort: 'high',
    tags: ['strategy', 'product'],
    isImportant: true,
  },
  {
    priority: 'high',
    dueDate: '2026-03-14T15:00:00.000Z',
    estimatedMinutes: 90,
    effort: 'medium',
    tags: ['client', 'review'],
    isOverdue: true,
  },
  {
    priority: 'medium',
    dueDate: '2026-03-16T10:00:00.000Z',
    estimatedMinutes: 60,
    effort: 'medium',
    tags: ['ops'],
  },
  {
    priority: 'medium',
    estimatedMinutes: 30,
    effort: 'low',
    tags: ['mailbox', 'small'],
  },
  {
    priority: 'low',
    estimatedMinutes: 25,
    effort: 'low',
    tags: ['admin'],
  },
];

function capitalize(value: string): string {
  if (!value) {
    return value;
  }
  return value[0].toUpperCase() + value.slice(1);
}

export function MyDayModal({
  isOpen,
  onClose,
  tasks = MOCK_DAY_TASKS,
  date = new Date(),
  closeOnBackdrop = true,
  onCreateMyDay,
}: MyDayModalProps) {
  const [mood, setMood] = useState<MoodLevel>(3);
  const [energy, setEnergy] = useState<number>(11);
  const [wishes, setWishes] = useState<string[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const setDayColors = useUiStore((s) => s.setDayColors);

  const effectiveTasks = tasks.length > 0 ? tasks : MOCK_DAY_TASKS;

  const profile = useMemo(
    () => computeDayProfile(effectiveTasks, mood, energy, wishes),
    [effectiveTasks, mood, energy, wishes],
  );

  const [c0, c1] = useMemo(() => profileToColors(profile, mood), [profile, mood]);
  const blobSpread = useMemo(() => energyToSpread(energy), [energy]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    setCreateError(null);
    setIsCreating(false);

    function onKeyDown(event: KeyboardEvent): void {
      if (event.key === 'Escape') {
        onClose();
      }
    }

    const previousOverflow = document.body.style.overflow;
    const previousPaddingRight = document.body.style.paddingRight;
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;

    if (scrollbarWidth > 0) {
      document.body.style.paddingRight = `${scrollbarWidth}px`;
    }

    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.body.style.paddingRight = previousPaddingRight;
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [isOpen, onClose]);

  const weekdayLabel = capitalize(
    date.toLocaleDateString('ru-RU', { weekday: 'long' }),
  );
  const dateLabel = date.toLocaleDateString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });

  async function handleCreateMyDay(): Promise<void> {
    if (isCreating) {
      return;
    }

    setCreateError(null);
    setIsCreating(true);

    try {
      await onCreateMyDay?.({
        profile,
        mood,
        energy,
        wishes,
      });
      setDayColors([c0, c1], energy);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Не удалось собрать "Мой день". Попробуйте еще раз.';
      setCreateError(message);
    } finally {
      setIsCreating(false);
    }
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className={styles.overlay}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.34, ease: [0.22, 1, 0.36, 1] }}
          onClick={(event) => {
            if (closeOnBackdrop && event.target === event.currentTarget) {
              onClose();
            }
          }}
        >
          <motion.div
            className={styles.modal}
            role="dialog"
            aria-modal="true"
            aria-label={'\u041c\u043e\u0439 \u0434\u0435\u043d\u044c'}
            initial={{ y: 80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 80, opacity: 0 }}
            transition={{ duration: 0.46, ease: [0.16, 1, 0.3, 1] }}
            onClick={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              className={styles.closeBtn}
              onClick={onClose}
              aria-label={'\u0417\u0430\u043a\u0440\u044b\u0442\u044c'}
            >
              <svg viewBox="0 0 20 20" width="20" height="20" fill="none">
                <path d="M5 5L15 15M15 5L5 15" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
              </svg>
            </button>

            <section className={styles.leftColumn}>
              <header className={styles.dateBlock}>
                <h2 className={styles.weekday}>{weekdayLabel}</h2>
                <span className={styles.date}>{dateLabel}</span>
              </header>

              <div className={styles.section}>
                <h3 className={styles.sectionTitle}>{'\u041a\u0430\u043a \u0432\u044b \u0441\u0435\u0431\u044f \u0447\u0443\u0432\u0441\u0442\u0432\u0443\u0435\u0442\u0435?'}</h3>
                <p className={styles.sectionSubtitle}>{'\u0412\u044b\u0431\u0435\u0440\u0438\u0442\u0435 \u0441\u0432\u043e\u0435 \u043d\u0430\u0441\u0442\u0440\u043e\u0435\u043d\u0438\u0435 \u0441\u0435\u0433\u043e\u0434\u043d\u044f'}</p>
                <MoodSelector value={mood} onChange={setMood} />
              </div>

              <div className={styles.section}>
                <h3 className={styles.sectionTitle}>{'\u0417\u0430\u0440\u044f\u0434 \u044d\u043d\u0435\u0440\u0433\u0438\u0438'}</h3>
                <p className={styles.sectionSubtitle}>{'\u041a\u0430\u043a \u0431\u043e\u0434\u0440\u043e \u0432\u044b \u0441\u0435\u0431\u044f \u0447\u0443\u0432\u0441\u0442\u0432\u0443\u0435\u0442\u0435?'}</p>
                <EnergyBars level={energy} onChange={setEnergy} />
              </div>

              <div className={styles.section}>
                <h3 className={styles.sectionTitle}>{'\u041f\u043e\u0436\u0435\u043b\u0430\u043d\u0438\u044f \u0434\u043b\u044f \u0430\u0441\u0441\u0438\u0441\u0442\u0435\u043d\u0442\u0430'}</h3>
                <p className={styles.sectionSubtitle}>{'\u0412\u044b\u0431\u0435\u0440\u0438\u0442\u0435 \u043f\u043e\u0434\u0445\u043e\u0434\u044f\u0449\u0438\u0435 \u043f\u0440\u0435\u0434\u043b\u043e\u0436\u0435\u043d\u0438\u044f'}</p>
                <AssistantWishChips selected={wishes} onChange={setWishes} />
              </div>

              <div className={styles.actionsRow}>
                <button
                  type="button"
                  className={styles.primaryAction}
                  onClick={() => void handleCreateMyDay()}
                  disabled={isCreating || !onCreateMyDay}
                >
                  {isCreating ? 'Собираем мой день...' : '\u0421\u043e\u0437\u0434\u0430\u0442\u044c \u043c\u043e\u0439 \u0434\u0435\u043d\u044c'}
                  <img src={aiStarsIcon} alt="" className={styles.primaryActionIcon} />
                </button>
              </div>
              {createError ? (
                <p className={styles.errorText}>{createError}</p>
              ) : null}
            </section>

            <section className={styles.rightColumn}>
              <GradientBlob c0={c0} c1={c1} size={360} scale={1.3} spread={blobSpread} />
              <DayProfileRadar profile={profile} />
            </section>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
