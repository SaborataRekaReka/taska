import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type DayTheme = 'good' | 'calm' | 'energy' | 'hard' | 'focus' | 'productive';

interface UiState {
  activeListId: string | null;
  isMyDayModalOpen: boolean;
  isMyDaySaved: boolean;
  dayColors: [string, string] | null;
  dayEnergy: number;
  dayTheme: DayTheme | null;
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
  setDayTheme: (theme: DayTheme | null) => void;
  applyDayTheme: (mood: number, energy: number) => void;
  clearDayTheme: () => void;
}

function determineDayTheme(mood: number, energy: number): DayTheme {
  // mood: 1 = очень тяжело, 2 = ниже среднего, 3 = спокойно, 4 = хорошо, 5 = очень бодро
  // energy: 1-20
  
  if (mood === 1) {
    return 'hard';
  }
  
  if (mood === 2) {
    return energy <= 10 ? 'hard' : 'calm';
  }
  
  if (mood === 3) {
    return 'calm';
  }
  
  if (mood === 4) {
    if (energy >= 15) return 'energy';
    if (energy >= 10) return 'good';
    return 'focus';
  }
  
  // mood === 5 (очень бодро)
  if (energy >= 15) return 'productive';
  if (energy >= 10) return 'energy';
  return 'good';
}

function applyThemeToDOM(theme: DayTheme | null) {
  if (theme) {
    document.documentElement.setAttribute('data-theme', theme);
  } else {
    document.documentElement.removeAttribute('data-theme');
  }
}

export const useUiStore = create<UiState>()(
  persist(
    (set, get) => ({
      activeListId: null,
      isMyDayModalOpen: false,
      isMyDaySaved: false,
      dayColors: null,
      dayEnergy: 11,
      dayTheme: null,
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
      
      setDayTheme: (theme) => {
        applyThemeToDOM(theme);
        set({ dayTheme: theme });
      },
      
      applyDayTheme: (mood, energy) => {
        const theme = determineDayTheme(mood, energy);
        applyThemeToDOM(theme);
        set({ dayTheme: theme, isMyDaySaved: true });
      },
      
      clearDayTheme: () => {
        applyThemeToDOM(null);
        set({ dayTheme: null, isMyDaySaved: false });
      },
    }),
    {
      name: 'taska-ui',
      partialize: (state) => ({
        dayTheme: state.dayTheme,
        isMyDaySaved: state.isMyDaySaved,
        dayEnergy: state.dayEnergy,
      }),
      onRehydrateStorage: () => (state) => {
        if (typeof window !== 'undefined' && state?.dayTheme) {
          applyThemeToDOM(state.dayTheme);
        }
      },
    }
  )
);
