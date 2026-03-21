import type { AiOperationMetrics } from './types';
import type { AiAdminSection } from './types';
import styles from './AiAdminSidebar.module.css';

interface AiAdminSidebarProps {
  activeSection: AiAdminSection;
  onSelectSection: (section: AiAdminSection) => void;
  metrics: AiOperationMetrics;
}

interface SidebarItem {
  id: AiAdminSection;
  label: string;
  badge?: string | number;
}

export function AiAdminSidebar({ activeSection, onSelectSection, metrics }: AiAdminSidebarProps) {
  const items: SidebarItem[] = [
    { id: 'overview', label: 'Overview' },
    { id: 'operations', label: 'Operations', badge: metrics.total },
    { id: 'inspector', label: 'Inspector' },
    { id: 'my-day-policy', label: 'My Day Policy' },
    { id: 'prompt-rules', label: 'Prompt Rules' },
    { id: 'safety', label: 'Safety' },
    { id: 'logs', label: 'Logs', badge: metrics.failed + metrics.undone },
  ];

  return (
    <aside className={styles.sidebar}>
      <div className={styles.titleWrap}>
        <h2 className={styles.title}>AI Control Center</h2>
        <p className={styles.subtitle}>Centralized operator workspace</p>
      </div>

      <nav className={styles.nav} aria-label="AI admin navigation">
        {items.map((item) => {
          const isActive = item.id === activeSection;
          return (
            <button
              key={item.id}
              type="button"
              className={`${styles.navItem} ${isActive ? styles.navItemActive : ''}`}
              onClick={() => onSelectSection(item.id)}
            >
              <span className={styles.navLabel}>{item.label}</span>
              {item.badge !== undefined ? <span className={styles.badge}>{item.badge}</span> : null}
            </button>
          );
        })}
      </nav>
    </aside>
  );
}
