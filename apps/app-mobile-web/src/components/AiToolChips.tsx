import styles from './AiToolChips.module.css';

const TOOLS = [
  { label: 'Разбить на шаги', prompt: 'Разбей задачу на понятные шаги', color: '#34C759' },
  { label: 'Сделать план', prompt: 'Сделай безопасный план изменений', color: '#5856D6' },
  { label: 'Найти важное', prompt: 'Найди приоритетные задачи и предложи изменения', color: '#007AFF' },
  { label: 'Подзадачи', prompt: 'Предложи подзадачи и структуру выполнения', color: '#FF9500' },
  { label: 'Переписать MD', prompt: 'Перепиши это в более понятный markdown-план', color: '#FF3B30' },
  { label: 'Ещё идея', prompt: 'Предложи лучший следующий шаг', color: '#8E8E93' },
] as const;

interface AiToolChipsProps {
  onSelectPrompt?: (prompt: string) => void;
}

export function AiToolChips({ onSelectPrompt }: AiToolChipsProps) {
  return (
    <div className={styles.row}>
      {TOOLS.map((tool) => (
        <button
          key={tool.label}
          className={styles.chip}
          type="button"
          onClick={() => onSelectPrompt?.(tool.prompt)}
        >
          <span className={styles.dot} style={{ background: tool.color }} />
          {tool.label}
        </button>
      ))}
    </div>
  );
}
