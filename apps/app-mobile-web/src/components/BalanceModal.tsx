import { MoodSelector } from './MoodSelector';
import { EnergyBars } from './EnergyBars';
import { RadarChart } from './RadarChart';
import { useUiStore } from '../stores/ui';
import styles from './BalanceModal.module.css';

const WISHES = [
  'Одно большое дело',
  'Ничего сложного',
  'Только срочное',
  'Побольше поработать',
  'Часто откладываемые',
];

function getWeekday(): string {
  const days = ['Воскресенье', 'Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота'];
  return days[new Date().getDay()] ?? 'Среда';
}

function getDate(): string {
  return new Date().toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export function BalanceModal() {
  const setDemoState = useUiStore((s) => s.setDemoState);

  return (
    <div className={styles.overlay}>
      <div className={styles.modal}>
        <button className={styles.closeBtn} onClick={() => setDemoState('workListHover')}>
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path d="M5 5l10 10M15 5L5 15" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
          </svg>
        </button>

        <div className={styles.left}>
          <div className={styles.dateBlock}>
            <span className={styles.weekday}>{getWeekday()}</span>
            <span className={styles.date}>{getDate()}</span>
          </div>

          <div className={styles.section}>
            <h3 className={styles.sectionTitle}>Как вы себя чувствуете?</h3>
            <p className={styles.sectionSub}>Выберите свое настроение сегодня</p>
            <MoodSelector />
          </div>

          <div className={styles.section}>
            <h3 className={styles.sectionTitle}>Заряд энергии</h3>
            <p className={styles.sectionSub}>Как бодро вы себя чувствуете?</p>
            <EnergyBars />
          </div>

          <div className={styles.section}>
            <h3 className={styles.sectionTitle}>Пожелания для ассистента</h3>
            <p className={styles.sectionSub}>Выберите подходящие предложения</p>
            <div className={styles.wishes}>
              {WISHES.map((w) => (
                <button key={w} className={styles.wishChip}>{w}</button>
              ))}
              <button className={styles.wishAdd}>+</button>
            </div>
          </div>

          <div className={styles.cta}>
            <button className={styles.primaryBtn} onClick={() => setDemoState('dayCreated')}>
              Создать мой день
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M7 0L8.4 4.9L13.3 3.5L9.8 7L13.3 10.5L8.4 9.1L7 14L5.6 9.1L0.7 10.5L4.2 7L0.7 3.5L5.6 4.9L7 0Z" fill="white"/>
              </svg>
            </button>
            <button className={styles.secondaryBtn}>Смотреть</button>
          </div>
        </div>

        <div className={styles.right}>
          <div className={styles.bloom} />
          <RadarChart />
        </div>
      </div>
    </div>
  );
}
