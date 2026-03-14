import { create } from 'zustand';
import type { DemoState } from '../lib/demoData';
import { CURRENT_DEMO_STATE } from '../lib/demoData';

interface UiState {
  demoState: DemoState;
  activeListId: string | null;
  searchQuery: string;
  filterStatus: string | null;
  filterPriority: string | null;
  showAddTask: boolean;
  editingTaskId: string | null;
  setDemoState: (s: DemoState) => void;
  setActiveList: (id: string | null) => void;
  setSearch: (q: string) => void;
  setFilterStatus: (s: string | null) => void;
  setFilterPriority: (p: string | null) => void;
  toggleAddTask: () => void;
  setEditingTask: (id: string | null) => void;
}

export const useUiStore = create<UiState>()((set) => ({
  demoState: CURRENT_DEMO_STATE,
  activeListId: null,
  searchQuery: '',
  filterStatus: null,
  filterPriority: null,
  showAddTask: false,
  editingTaskId: null,
  setDemoState: (s) => set({ demoState: s }),
  setActiveList: (id) => set({ activeListId: id }),
  setSearch: (q) => set({ searchQuery: q }),
  setFilterStatus: (s) => set({ filterStatus: s }),
  setFilterPriority: (p) => set({ filterPriority: p }),
  toggleAddTask: () => set((s) => ({ showAddTask: !s.showAddTask })),
  setEditingTask: (id) => set({ editingTaskId: id }),
}));
