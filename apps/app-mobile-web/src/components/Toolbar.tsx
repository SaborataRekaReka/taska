import { useUiStore } from '../stores/ui';
import styles from './Toolbar.module.css';

export function Toolbar() {
  const search = useUiStore((s) => s.searchQuery);
  const setSearch = useUiStore((s) => s.setSearch);
  const filterStatus = useUiStore((s) => s.filterStatus);
  const setFilterStatus = useUiStore((s) => s.setFilterStatus);
  const filterPriority = useUiStore((s) => s.filterPriority);
  const setFilterPriority = useUiStore((s) => s.setFilterPriority);

  return (
    <div className={styles.toolbar}>
      <div className={styles.searchWrap}>
        <span className={styles.searchIcon}>🔍</span>
        <input
          className={styles.searchInput}
          placeholder="Поиск"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        {search && (
          <button className={styles.clearBtn} onClick={() => setSearch('')}>×</button>
        )}
      </div>
      <div className={styles.filters}>
        <select
          className={styles.select}
          value={filterStatus ?? ''}
          onChange={(e) => setFilterStatus(e.target.value || null)}
        >
          <option value="">Статус</option>
          <option value="TODO">К выполнению</option>
          <option value="IN_PROGRESS">В работе</option>
          <option value="DONE">Готово</option>
        </select>
        <select
          className={styles.select}
          value={filterPriority ?? ''}
          onChange={(e) => setFilterPriority(e.target.value || null)}
        >
          <option value="">Приоритет</option>
          <option value="CRITICAL">Критический</option>
          <option value="HIGH">Высокий</option>
          <option value="MEDIUM">Средний</option>
          <option value="LOW">Низкий</option>
        </select>
      </div>
    </div>
  );
}
