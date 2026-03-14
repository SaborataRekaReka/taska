import type { Task, List, Subtask } from './types';

export type DemoState =
  | 'inactiveInput'
  | 'activeInput'
  | 'tempAiList'
  | 'workListHover'
  | 'balanceModalOpen'
  | 'dayCreated'
  | 'visualEditModal'
  | 'markdownEditModal';

export const CURRENT_DEMO_STATE: DemoState = 'workListHover';

export const DEMO_LISTS: List[] = [
  { id: 'no-list', userId: 'u1', name: 'Без списка', isDefault: true, createdAt: '2025-01-01', _count: { tasks: 2 } },
  { id: 'work', userId: 'u1', name: 'Работа', isDefault: true, createdAt: '2025-01-01', _count: { tasks: 4 } },
  { id: 'personal', userId: 'u1', name: 'Личное', isDefault: true, createdAt: '2025-01-01', _count: { tasks: 1 } },
  { id: 'study', userId: 'u1', name: 'Учеба', isDefault: false, createdAt: '2025-01-01', _count: { tasks: 0 } },
  { id: 'temp', userId: 'u1', name: 'Временный список', isDefault: false, createdAt: '2025-03-14', _count: { tasks: 3 } },
];

const SUB_1: Subtask[] = [
  {
    id: 's1',
    taskId: 't1',
    title: 'Create a booth banner design for the company\'s exhibition stand. The design must follow the company\'s brand guidelines, include the logo, slogan, and key benefits. The banner dimensions are 3\u00d72 meters.',
    status: 'TODO',
    createdAt: '2025-03-08',
  },
  {
    id: 's2',
    taskId: 't1',
    title: 'Create a booth banner design for the company\'s exhibition stand.',
    status: 'TODO',
    createdAt: '2025-03-08',
  },
];

export const DEMO_TASKS: Task[] = [
  {
    id: 't1',
    title: 'Create a booth banner design for the company\'s exhibition stand. The design must follow the company\'s brand guidelines, include the logo, slogan, and key benefits. The banner dimensions are 3\u00d72 meters.',
    description: null,
    priority: 'HIGH',
    deadline: '2025-03-08T00:00:00.000Z',
    status: 'TODO',
    listId: 'work',
    list: { id: 'work', name: 'Работа' },
    subtasks: SUB_1,
    createdAt: '2025-03-01',
  },
  {
    id: 't2',
    title: 'Create a booth banner design for the company\'s exhibition stand. The design must follow the company\'s brand guidelines, include the logo, slogan, and key benefits. The banner dimensions are 3\u00d72 meters.',
    description: null,
    priority: 'MEDIUM',
    deadline: '2025-03-08T00:00:00.000Z',
    status: 'TODO',
    listId: 'work',
    list: { id: 'work', name: 'Работа' },
    subtasks: [],
    createdAt: '2025-03-02',
  },
  {
    id: 't3',
    title: 'Create a booth banner design for the company\'s exhibition stand. The design must follow the company\'s brand guidelines, include the logo, slogan, and key benefits. The banner dimensions are 3\u00d72 meters.',
    description: null,
    priority: 'MEDIUM',
    deadline: '2025-03-08T00:00:00.000Z',
    status: 'TODO',
    listId: 'work',
    list: { id: 'work', name: 'Работа' },
    subtasks: [],
    createdAt: '2025-03-03',
  },
];

export const MARKDOWN_EDITOR_CONTENT = `- [ ] Подумать над форматом хранения задач в MD
  - priority:: medium
  - due:: 2026-03-14
  - tags:: #product #architecture
  - subtasks::
    - [x] Посмотреть, как это сделано в Obsidian
    - [ ] Определить синтаксис для даты, тегов и приоритета
    - [ ] Решить, нужен ли frontmatter`;
