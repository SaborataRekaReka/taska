import { useRef } from 'react';
import styles from './EditableText.module.css';

interface EditableTextProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
  placeholder?: string;
  multiline?: boolean;
}

export function EditableText({ value, onChange, className = '', placeholder, multiline = false }: EditableTextProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const originalRef = useRef<string>(value);

  function handleFocus() {
    originalRef.current = ref.current?.textContent ?? value;
  }

  function handleBlur() {
    const text = ref.current?.textContent?.trim() ?? '';
    if (text.length === 0) {
      if (ref.current) ref.current.textContent = originalRef.current;
      onChange(originalRef.current);
    } else {
      onChange(text);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Escape') {
      e.preventDefault();
      if (ref.current) ref.current.textContent = originalRef.current;
      ref.current?.blur();
      return;
    }
    if (!multiline && e.key === 'Enter') {
      e.preventDefault();
      ref.current?.blur();
    }
  }

  return (
    <span
      ref={ref}
      contentEditable
      suppressContentEditableWarning
      onFocus={handleFocus}
      onBlur={handleBlur}
      onKeyDown={handleKeyDown}
      className={`${styles.editable} ${className}`}
      data-placeholder={placeholder}
      role="textbox"
      aria-multiline={multiline}
    >
      {value}
    </span>
  );
}
