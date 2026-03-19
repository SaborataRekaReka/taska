import { useEffect, useMemo, useRef, useState } from 'react';
import styles from './TaskChipMenu.module.css';

export interface TaskChipMenuOption {
  value: string;
  label: string;
  dotColor?: string;
}

interface TaskChipMenuProps {
  value: string;
  options: TaskChipMenuOption[];
  onChange: (nextValue: string) => void;
  ariaLabel: string;
  iconSrc?: string;
  showColorDot?: boolean;
}

export function TaskChipMenu({
  value,
  options,
  onChange,
  ariaLabel,
  iconSrc,
  showColorDot = false,
}: TaskChipMenuProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [isOpen, setIsOpen] = useState(false);

  const selectedOption = useMemo(
    () => options.find((option) => option.value === value) ?? options[0],
    [options, value],
  );

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
        aria-haspopup="menu"
        aria-expanded={isOpen}
        aria-label={ariaLabel}
        onMouseDown={(e) => e.stopPropagation()}
        onMouseUp={(e) => e.stopPropagation()}
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen((prev) => !prev);
        }}
      >
        {iconSrc && <img src={iconSrc} alt="" className={styles.icon} />}
        {showColorDot && (
          <span
            className={styles.dot}
            style={{ background: selectedOption?.dotColor ?? 'rgba(23, 23, 23, 0.28)' }}
          />
        )}
        <span>{selectedOption?.label ?? ''}</span>
      </button>

      {isOpen && (
        <>
          <button
            type="button"
            className={styles.dismissLayer}
            aria-label="Close dropdown menu"
            onMouseDown={(e) => e.stopPropagation()}
            onMouseUp={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation();
              setIsOpen(false);
            }}
          />

          <div className={styles.menu} role="menu" aria-label={ariaLabel}>
            {options.map((option) => {
              const isSelected = option.value === value;
              return (
                <button
                  key={option.value}
                  type="button"
                  role="menuitemradio"
                  aria-checked={isSelected}
                  className={`${styles.menuItem} ${isSelected ? styles.menuItemActive : ''}`}
                  onMouseDown={(e) => e.stopPropagation()}
                  onMouseUp={(e) => e.stopPropagation()}
                  onClick={(e) => {
                    e.stopPropagation();
                    onChange(option.value);
                    setIsOpen(false);
                  }}
                >
                  <span className={styles.menuItemMain}>
                    {showColorDot && (
                      <span
                        className={styles.dot}
                        style={{ background: option.dotColor ?? 'rgba(23, 23, 23, 0.28)' }}
                      />
                    )}
                    <span>{option.label}</span>
                  </span>
                  {isSelected && (
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                      <path d="M3 7.3L5.8 10L11 4.8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                    </svg>
                  )}
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
