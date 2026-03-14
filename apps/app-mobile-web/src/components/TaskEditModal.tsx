import { useState, useEffect } from 'react';
import { useUiStore } from '../stores/ui';
import { useTasks, useUpdateTask, useCreateSubtask, useLists } from '../hooks/queries';
import styles from './TaskEditModal.module.css';

export function TaskEditModal() {
  const editingTaskId = useUiStore((s) => s.editingTaskId);
  const setEditingTask = useUiStore((s) => s.setEditingTask);
  const { data: tasks } = useTasks();
  const { data: lists } = useLists();
  const updateTask = useUpdateTask();
  const createSubtask = useCreateSubtask();

  const task = tasks?.find((t) => t.id === editingTaskId);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState('MEDIUM');
  const [status, setStatus] = useState('TODO');
  const [deadline, setDeadline] = useState('');
  const [listId, setListId] = useState<string>('');
  const [newSubtask, setNewSubtask] = useState('');

  useEffect(() => {
    if (task) {
      setTitle(task.title);
      setDescription(task.description ?? '');
      setPriority(task.priority);
      setStatus(task.status);
      setDeadline(task.deadline ? task.deadline.slice(0, 10) : '');
      setListId(task.listId ?? '');
    }
  }, [task]);

  if (!task) return null;

  function handleSave() {
    updateTask.mutate({
      id: task!.id,
      title,
      description: description || undefined,
      priority,
      status,
      deadline: deadline || undefined,
      listId: listId || null,
    }, {
      onSuccess: () => setEditingTask(null),
    });
  }

  function handleAddSubtask() {
    if (!newSubtask.trim()) return;
    createSubtask.mutate({ taskId: task!.id, title: newSubtask.trim() }, {
      onSuccess: () => setNewSubtask(''),
    });
  }

  return (
    <div className={styles.overlay} onClick={() => setEditingTask(null)}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <h2>Редактировать задачу</h2>
          <button className={styles.closeBtn} onClick={() => setEditingTask(null)}>×</button>
        </div>

        <div className={styles.body}>
          <input
            className={styles.titleInput}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Название задачи"
          />

          <textarea
            className={styles.descInput}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Описание (необязательно)"
            rows={3}
          />

          <div className={styles.fields}>
            <div className={styles.field}>
              <label>Приоритет</label>
              <select value={priority} onChange={(e) => setPriority(e.target.value)}>
                <option value="LOW">Низкий</option>
                <option value="MEDIUM">Средний</option>
                <option value="HIGH">Высокий</option>
                <option value="CRITICAL">Критический</option>
              </select>
            </div>

            <div className={styles.field}>
              <label>Статус</label>
              <select value={status} onChange={(e) => setStatus(e.target.value)}>
                <option value="TODO">К выполнению</option>
                <option value="IN_PROGRESS">В работе</option>
                <option value="DONE">Готово</option>
              </select>
            </div>

            <div className={styles.field}>
              <label>Дедлайн</label>
              <input type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} />
            </div>

            <div className={styles.field}>
              <label>Список</label>
              <select value={listId} onChange={(e) => setListId(e.target.value)}>
                <option value="">Без списка</option>
                {lists?.map((l) => (
                  <option key={l.id} value={l.id}>{l.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className={styles.subtasksSection}>
            <h3>Подзадачи</h3>
            {task.subtasks.map((sub) => (
              <div key={sub.id} className={styles.subtaskRow}>
                <span className={sub.status === 'DONE' ? styles.subDone : ''}>
                  {sub.status === 'DONE' ? '✓ ' : '○ '}{sub.title}
                </span>
              </div>
            ))}
            <div className={styles.addSubRow}>
              <input
                value={newSubtask}
                onChange={(e) => setNewSubtask(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleAddSubtask(); }}
                placeholder="Добавить подзадачу..."
                className={styles.subInput}
              />
            </div>
          </div>
        </div>

        <div className={styles.footer}>
          <button className={styles.cancelBtn} onClick={() => setEditingTask(null)}>
            Отмена
          </button>
          <button className={styles.saveBtn} onClick={handleSave} disabled={updateTask.isPending}>
            {updateTask.isPending ? 'Сохранение...' : 'Сохранить'}
          </button>
        </div>
      </div>
    </div>
  );
}
