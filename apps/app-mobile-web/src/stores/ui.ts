import { create } from 'zustand';
import type { DemoState } from '../lib/demoData';
import { CURRENT_DEMO_STATE, DEMO_LISTS, DEMO_TASKS } from '../lib/demoData';
import type { Task } from '../lib/types';

interface UiState {
  demoState: DemoState;
  activeListId: string | null;
  isMyDayModalOpen: boolean;
  isMyDaySaved: boolean;
  dayColors: [string, string] | null;
  searchQuery: string;
  filterStatus: string | null;
  filterPriority: string | null;
  showAddTask: boolean;
  editingTaskId: string | null;
  selectedTaskId: string | null;
  isTempListVisible: boolean;
  isTempListSaved: boolean;
  demoTasks: Task[];
  setDemoState: (s: DemoState) => void;
  setActiveList: (id: string | null) => void;
  setSearch: (q: string) => void;
  setFilterStatus: (s: string | null) => void;
  setFilterPriority: (p: string | null) => void;
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
  addDemoTask: (title: string) => void;
}

export const useUiStore = create<UiState>()((set) => ({
  demoState: CURRENT_DEMO_STATE,
  activeListId: null,
  isMyDayModalOpen: CURRENT_DEMO_STATE === 'balanceModalOpen',
  isMyDaySaved: false,
  dayColors: null,
  searchQuery: '',
  filterStatus: null,
  filterPriority: null,
  showAddTask: false,
  editingTaskId: null,
  selectedTaskId: null,
  isTempListVisible: false,
  isTempListSaved: false,
  demoTasks: DEMO_TASKS,
  setDemoState: (s) => set({ demoState: s }),
  setActiveList: (id) => set({ activeListId: id }),
  setSearch: (q) => set({ searchQuery: q }),
  setFilterStatus: (s) => set({ filterStatus: s }),
  setFilterPriority: (p) => set({ filterPriority: p }),
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
      ? DEMO_LISTS.find((list) => list.id === normalizedListId)
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
}));
