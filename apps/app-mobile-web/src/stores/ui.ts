import { create } from 'zustand';

interface UiState {
  activeListId: string | null;
  isMyDayModalOpen: boolean;
  isMyDaySaved: boolean;
  dayColors: [string, string] | null;
  dayEnergy: number;
  searchQuery: string;
  filterStatus: string | null;
  filterPriority: string | null;
  filterUrgency: 'OVERDUE' | 'TODAY' | 'NEXT_24_HOURS' | null;
  showAddTask: boolean;
  editingTaskId: string | null;
  selectedTaskId: string | null;

  setDemoState: (state: string) => void;
  setActiveList: (id: string | null) => void;
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
  setDayColors: (colors: [string, string], energy?: number) => void;
}

export const useUiStore = create<UiState>()((set) => ({
  activeListId: null,
  isMyDayModalOpen: false,
  isMyDaySaved: false,
  dayColors: null,
  dayEnergy: 11,
  searchQuery: '',
  filterStatus: null,
  filterPriority: null,
  filterUrgency: null,
  showAddTask: false,
  editingTaskId: null,
  selectedTaskId: null,

  setDemoState: () => undefined,
  setActiveList: (id) => set({ activeListId: id }),
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
  setDayColors: (colors, energy = 11) => set({ dayColors: colors, dayEnergy: energy }),
}));
