export type DayPriority = 'low' | 'medium' | 'high';
export type DayEffort = 'low' | 'medium' | 'high';
export type MoodLevel = 1 | 2 | 3 | 4 | 5;

export interface DayTask {
  priority: DayPriority;
  dueDate?: string | Date | null;
  estimatedMinutes?: number;
  effort?: DayEffort;
  tags?: string[];
  isImportant?: boolean;
  isOverdue?: boolean;
}

export interface DayProfile {
  importance: number;
  urgency: number;
  duration: number;
  load: number;
  dayLabel: string;
}
