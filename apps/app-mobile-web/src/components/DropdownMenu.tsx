import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import styles from './DropdownMenu.module.css';

export interface DropdownMenuItem {
  id: string;
  label: string;
  onSelect: () => void;
  disabled?: boolean;
  danger?: boolean;
  icon?: string;
}

interface DropdownMenuProps {
  items: DropdownMenuItem[];
  triggerAriaLabel?: string;
  triggerLabel?: string;
  triggerClassName?: string;
  menuClassName?: string;
  iconPosition?: 'left' | 'right';
}

export function DropdownMenu({
  items,
  triggerAriaLabel = 'Открыть меню',
  triggerLabel,
  triggerClassName,
  menuClassName,
  iconPosition = 'left',
}: DropdownMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0, isReady: false });
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const menuId = useId();

  const updatePosition = useCallback(() => {
    const triggerElement = triggerRef.current;
    if (!triggerElement) {
      return;
    }

    const viewportPadding = 8;
    const gapFromTrigger = 6;
    const triggerRect = triggerElement.getBoundingClientRect();
    const menuWidth = menuRef.current?.offsetWidth ?? 170;
    const menuHeight = menuRef.current?.offsetHeight ?? 0;

    let left = triggerRect.right - menuWidth;
    let top = triggerRect.bottom + gapFromTrigger;

    if (left < viewportPadding) {
      left = viewportPadding;
    }

    if (left + menuWidth > window.innerWidth - viewportPadding) {
      left = Math.max(viewportPadding, window.innerWidth - viewportPadding - menuWidth);
    }

    if (menuHeight > 0 && top + menuHeight > window.innerHeight - viewportPadding) {
      top = Math.max(viewportPadding, triggerRect.top - menuHeight - gapFromTrigger);
    }

    setMenuPosition((prev) => {
      if (prev.top === top && prev.left === left && prev.isReady) {
        return prev;
      }

      return { top, left, isReady: true };
    });
  }, []);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    }

    document.addEventListener('keydown', onKeyDown);
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);

    return () => {
      document.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [isOpen, updatePosition]);

  useLayoutEffect(() => {
    if (!isOpen) {
      return;
    }

    updatePosition();
  }, [isOpen, items.length, updatePosition]);

  return (
    <div
      className={styles.root}
      data-dropdown-menu
      onMouseDown={(e) => e.stopPropagation()}
      onMouseUp={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
    >
      <button
        ref={triggerRef}
        type="button"
        className={`${styles.trigger} ${triggerLabel ? styles.triggerWithLabel : ''} ${isOpen ? styles.triggerOpen : ''} ${triggerClassName ?? ''}`.trim()}
        onMouseDown={(e) => e.stopPropagation()}
        onMouseUp={(e) => e.stopPropagation()}
        onClick={(event) => {
          event.stopPropagation();
          setIsOpen((prev) => !prev);
        }}
        aria-haspopup="menu"
        aria-expanded={isOpen}
        aria-label={triggerAriaLabel}
        aria-controls={isOpen ? menuId : undefined}
      >
        {triggerLabel ? <span className={styles.triggerLabel}>{triggerLabel}</span> : null}
        <svg width="4" height="16" viewBox="0 0 4 16" fill="none" aria-hidden>
          <circle cx="2" cy="2" r="1.3" fill="currentColor" />
          <circle cx="2" cy="8" r="1.3" fill="currentColor" />
          <circle cx="2" cy="14" r="1.3" fill="currentColor" />
        </svg>
      </button>

      {isOpen &&
        createPortal(
          <div
            className={styles.backdrop}
            onClick={() => setIsOpen(false)}
            onMouseDown={(e) => e.stopPropagation()}
            onMouseUp={(e) => e.stopPropagation()}
          >
            <div
              id={menuId}
              ref={menuRef}
              className={`${styles.menu} ${menuClassName ?? ''}`.trim()}
              role="menu"
              style={{
                top: `${menuPosition.top}px`,
                left: `${menuPosition.left}px`,
                visibility: menuPosition.isReady ? 'visible' : 'hidden',
              }}
              onClick={(event) => event.stopPropagation()}
            >
              {items.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  role="menuitem"
                  className={`${styles.item} ${item.danger ? styles.danger : ''}`.trim()}
                  disabled={item.disabled}
                  onMouseDown={(e) => e.stopPropagation()}
                  onMouseUp={(e) => e.stopPropagation()}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (item.disabled) {
                      return;
                    }

                    item.onSelect();
                    setIsOpen(false);
                  }}
                >
                  {iconPosition === 'left' && item.icon && (
                    <img src={item.icon} alt="" aria-hidden className={styles.iconLeft} />
                  )}
                  <span className={styles.label}>{item.label}</span>
                  {iconPosition === 'right' && item.icon && (
                    <img src={item.icon} alt="" aria-hidden className={styles.iconRight} />
                  )}
                </button>
              ))}
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}
