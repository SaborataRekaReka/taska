import { create } from 'zustand';
import type { DemoState } from '../lib/demoData';
import { CURRENT_DEMO_STATE, DEMO_LISTS, DEMO_TASKS } from '../lib/demoData';
import type { SmartListId } from '../lib/smartLists';
import type { List } from '../lib/types';
import type { Task } from '../lib/types';

interface UiState {
  demoState: DemoState;
  demoLists: List[];
  activeListId: string | null;
  activeSmartListId: SmartListId | null;
  isMyDayModalOpen: boolean;
  isMyDaySaved: boolean;
  dayColors: [string, string] | null;
  searchQuery: string;
  filterStatus: string | null;
  filterPriority: string | null;
  filterUrgency: 'OVERDUE' | 'TODAY' | 'NEXT_24_HOURS' | null;
  showAddTask: boolean;
  editingTaskId: string | null;
  selectedTaskId: string | null;
  isTempListVisible: boolean;
  isTempListSaved: boolean;
  demoTasks: Task[];
  setDemoState: (s: DemoState) => void;
  setActiveList: (id: string | null) => void;
  setActiveSmartList: (id: SmartListId | null) => void;
  setSearch: (q: string) => void;
  setFilterStatus: (s: string | null) => void;
  setFilterPriority: (p: string | null) => void;
  setFilterUrgency: (u: 'OVERDUE' | 'TODAY' | 'NEXT_24_HOURS' | null) => void;
  toggleAddTask: () => void;
  setEditingTask: (id: string | null) => void;
  openTaskAssistantModal: (taskId: string) => void;
  closeTaskAssistantModal: () => void;
  openMyDayModal: () => void;
  closeMyDayModal: () => void;
  setMyDaySaved: (saved: boolean) => void;
  setDayColors: (colors: [string, string]) => void;
  triggerTempListFromAi: () => void;
  saveTempList: () => void;
  addDemoList: (name: string) => string | null;
  addDemoTask: (title: string) => void;
  updateDemoTask: (taskId: string, patch: Partial<Task>) => void;
}

export const useUiStore = create<UiState>()((set) => ({
  demoState: CURRENT_DEMO_STATE,
  demoLists: DEMO_LISTS,
  activeListId: null,
  activeSmartListId: null,
  isMyDayModalOpen: CURRENT_DEMO_STATE === 'balanceModalOpen',
  isMyDaySaved: false,
  dayColors: null,
  searchQuery: '',
  filterStatus: null,
  filterPriority: null,
  filterUrgency: null,
  showAddTask: false,
  editingTaskId: null,
  selectedTaskId: null,
  isTempListVisible: false,
  isTempListSaved: false,
  demoTasks: DEMO_TASKS,
  setDemoState: (s) => set({ demoState: s }),
  setActiveList: (id) => set({ activeListId: id, activeSmartListId: null }),
  setActiveSmartList: (id) => set({ activeSmartListId: id, activeListId: null }),
  setSearch: (q) => set({ searchQuery: q }),
  setFilterStatus: (s) => set({ filterStatus: s }),
  setFilterPriority: (p) => set({ filterPriority: p }),
  setFilterUrgency: (u) => set({ filterUrgency: u }),
  toggleAddTask: () => set((s) => ({ showAddTask: !s.showAddTask })),
  setEditingTask: (id) => set({ editingTaskId: id }),
  openTaskAssistantModal: (taskId) => set({ selectedTaskId: taskId }),
  closeTaskAssistantModal: () => set({ selectedTaskId: null }),
  openMyDayModal: () => set({ isMyDayModalOpen: true }),
  closeMyDayModal: () => set({ isMyDayModalOpen: false }),
  setMyDaySaved: (saved) => set({ isMyDaySaved: saved }),
  setDayColors: (colors) => set({ dayColors: colors }),
  triggerTempListFromAi: () => set({
    demoState: 'tempAiList',
    isTempListVisible: true,
    activeListId: 'temp',
    isTempListSaved: false,
  }),
  saveTempList: () => set({
    isTempListSaved: true,
    demoState: 'workListHover',
  }),
  addDemoList: (name) => {
    const normalizedName = name.trim().replace(/\s+/g, ' ');
    if (!normalizedName) {
      return null;
    }

    let createdOrExistingId: string | null = null;

    set((state) => {
      const existingList = state.demoLists.find(
        (list) => list.name.trim().toLowerCase() === normalizedName.toLowerCase(),
      );

      if (existingList) {
        createdOrExistingId = existingList.id;
        return state;
      }

      const baseId = `list-${Date.now()}`;
      let nextId = baseId;
      let suffix = 1;
      while (state.demoLists.some((list) => list.id === nextId)) {
        nextId = `${baseId}-${suffix}`;
        suffix += 1;
      }

      createdOrExistingId = nextId;
      const nextList: List = {
        id: nextId,
        userId: 'u1',
        name: normalizedName,
        isDefault: false,
        createdAt: new Date().toISOString(),
        _count: { tasks: 0 },
      };

      return {
        demoLists: [...state.demoLists, nextList],
      };
    });

    return createdOrExistingId;
  },
  addDemoTask: (title) => set((state) => {
    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      return state;
    }

    const normalizedListId = (() => {
      if (state.activeListId === '__no_list__') {
        return null;
      }

      if (state.activeListId?.startsWith('__')) {
        return null;
      }

      return state.activeListId ?? null;
    })();

    const matchingList = normalizedListId
      ? state.demoLists.find((list) => list.id === normalizedListId)
      : null;

    const createdAt = new Date().toISOString();
    const nextTask: Task = {
      id: `demo-${Date.now()}`,
      title: trimmedTitle,
      description: null,
      priority: 'MEDIUM',
      deadline: null,
      status: 'TODO',
      listId: normalizedListId,
      list: matchingList ? { id: matchingList.id, name: matchingList.name } : null,
      subtasks: [],
      createdAt,
    };

    return {
      demoTasks: [nextTask, ...state.demoTasks],
    };
  }),
  updateDemoTask: (taskId, patch) => set((state) => ({
    demoTasks: state.demoTasks.map((task) => (
      task.id === taskId ? { ...task, ...patch } : task
    )),
  })),
}));
