import { useEffect, useMemo, useRef, useState } from 'react';
import clockIcon from '../assests/clock.svg';
import styles from './TaskDeadlinePicker.module.css';

interface TaskDeadlinePickerProps {
  value: string | null;
  onChange: (nextValue: string | null) => void;
}

function formatDeadlineLabel(value: string | null): string {
  if (!value) {
    return 'Без срока';
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return 'Без срока';
  }

  return parsed.toLocaleDateString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

function dateStamp(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function toStableIsoDate(year: number, month: number, day: number): string {
  // Use local noon to avoid day shifts caused by timezone conversion.
  return new Date(year, month, day, 12, 0, 0, 0).toISOString();
}

function parseDate(value: string | null): Date | null {
  if (!value) {
    return null;
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return parsed;
}

export function TaskDeadlinePicker({ value, onChange }: TaskDeadlinePickerProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [isOpen, setIsOpen] = useState(false);
  const parsedSelectedDate = useMemo(() => parseDate(value), [value]);
  const [viewDate, setViewDate] = useState<Date>(() => parsedSelectedDate ?? new Date());

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    setViewDate(parsedSelectedDate ?? new Date());
  }, [isOpen, parsedSelectedDate]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    function onWindowKeyDown(event: KeyboardEvent): void {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    }

    function onWindowPointerDown(event: PointerEvent): void {
      if (!rootRef.current) {
        return;
      }

      const target = event.target;
      if (target instanceof Node && !rootRef.current.contains(target)) {
        setIsOpen(false);
      }
    }

    window.addEventListener('keydown', onWindowKeyDown);
    window.addEventListener('pointerdown', onWindowPointerDown);

    return () => {
      window.removeEventListener('keydown', onWindowKeyDown);
      window.removeEventListener('pointerdown', onWindowPointerDown);
    };
  }, [isOpen]);

  const selectedStamp = parsedSelectedDate ? dateStamp(parsedSelectedDate) : null;
  const todayStamp = dateStamp(new Date());
  const monthLabel = viewDate.toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' });
  const weekdayLabels = useMemo(() => {
    const formatter = new Intl.DateTimeFormat('ru-RU', { weekday: 'short' });
    return Array.from({ length: 7 }, (_, index) => {
      const date = new Date(2024, 0, index + 1); // 2024-01-01 is Monday.
      return formatter.format(date).replace('.', '');
    });
  }, []);

  const currentMonth = viewDate.getMonth();
  const currentYear = viewDate.getFullYear();
  const firstDayIndex = (new Date(currentYear, currentMonth, 1).getDay() + 6) % 7;
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const leadingEmptyDays = Array.from({ length: firstDayIndex }, (_, index) => `empty-${index}`);
  const monthDays = Array.from({ length: daysInMonth }, (_, index) => index + 1);

  return (
    <div
      ref={rootRef}
      className={styles.root}
      onClick={(event) => event.stopPropagation()}
      onKeyDown={(event) => event.stopPropagation()}
    >
      <button
        type="button"
        className={`${styles.trigger} ${isOpen ? styles.triggerActive : ''}`}
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        onClick={() => setIsOpen((prev) => !prev)}
      >
        <img src={clockIcon} alt="" className={styles.icon} />
        <span>{formatDeadlineLabel(value)}</span>
      </button>

      {isOpen && (
        <>
          <button
            type="button"
            className={styles.dismissLayer}
            aria-label="Закрыть календарь"
            onClick={() => setIsOpen(false)}
          />

          <div className={styles.popover} role="dialog" aria-label="Выбор дедлайна">
            <div className={styles.header}>
              <button
                type="button"
                className={styles.navButton}
                aria-label="Предыдущий месяц"
                onClick={() => setViewDate(new Date(currentYear, currentMonth - 1, 1))}
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path d="M9.75 3.5L5.25 8L9.75 12.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
                </svg>
              </button>

              <span className={styles.monthLabel}>{monthLabel}</span>

              <button
                type="button"
                className={styles.navButton}
                aria-label="Следующий месяц"
                onClick={() => setViewDate(new Date(currentYear, currentMonth + 1, 1))}
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path d="M6.25 3.5L10.75 8L6.25 12.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
                </svg>
              </button>
            </div>

            <div className={styles.weekdays}>
              {weekdayLabels.map((label) => (
                <span key={label} className={styles.weekdayCell}>{label}</span>
              ))}
            </div>

            <div className={styles.daysGrid}>
              {leadingEmptyDays.map((emptyId) => (
                <span key={emptyId} className={styles.emptyCell} />
              ))}

              {monthDays.map((day) => {
                const stamp = dateStamp(new Date(currentYear, currentMonth, day));
                const isSelected = selectedStamp === stamp;
                const isToday = todayStamp === stamp;

                return (
                  <button
                    key={`${currentYear}-${currentMonth}-${day}`}
                    type="button"
                    className={`${styles.dayButton} ${isSelected ? styles.dayButtonSelected : ''} ${isToday ? styles.dayButtonToday : ''}`}
                    onClick={() => {
                      onChange(toStableIsoDate(currentYear, currentMonth, day));
                      setIsOpen(false);
                    }}
                  >
                    {day}
                  </button>
                );
              })}
            </div>

            <div className={styles.footer}>
              <button
                type="button"
                className={styles.clearButton}
                onClick={() => {
                  onChange(null);
                  setIsOpen(false);
                }}
              >
                Удалить дедлайн
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
