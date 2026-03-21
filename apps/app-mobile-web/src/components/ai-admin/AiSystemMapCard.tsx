import styles from './AiSystemMapCard.module.css';

export function AiSystemMapCard() {
  return (
    <section className={styles.card}>
      <header className={styles.header}>
        <h3 className={styles.title}>System Map</h3>
        <span className={styles.badge}>Safe-Mode</span>
      </header>

      <div className={styles.map}>
        <div className={styles.node}>
          <p className={styles.nodeTitle}>Frontend</p>
          <p className={styles.nodeText}>Hero, Task Modal, My Day, AI Admin</p>
        </div>
        <span className={styles.arrow}>→</span>
        <div className={styles.node}>
          <p className={styles.nodeTitle}>/ai API</p>
          <p className={styles.nodeText}>plan, revise, confirm, execute, undo, get</p>
        </div>
        <span className={styles.arrow}>→</span>
        <div className={styles.node}>
          <p className={styles.nodeTitle}>AiAssistantService</p>
          <p className={styles.nodeText}>OpenAI proposes, backend normalizes</p>
        </div>
        <span className={styles.arrow}>→</span>
        <div className={styles.node}>
          <p className={styles.nodeTitle}>Domain Services</p>
          <p className={styles.nodeText}>Lists, Tasks, Subtasks, History</p>
        </div>
      </div>

      <div className={styles.lifecycle}>
        <span className={styles.step}>PLANNED</span>
        <span className={styles.stepArrow}>→</span>
        <span className={styles.step}>CONFIRMED</span>
        <span className={styles.stepArrow}>→</span>
        <span className={styles.step}>EXECUTED</span>
        <span className={styles.stepArrow}>→</span>
        <span className={styles.step}>UNDONE / FAILED</span>
      </div>
    </section>
  );
}
