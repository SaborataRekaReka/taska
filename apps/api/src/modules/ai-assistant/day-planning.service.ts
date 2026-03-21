import { Injectable } from '@nestjs/common';
import type { TaskPriority, TaskStatus } from '@prisma/client';

import type { MyDayContextDto } from './dto.js';

export type DayIntent = NonNullable<MyDayContextDto['dayIntent']>;
export type FocusCapacity = NonNullable<MyDayContextDto['focusCapacity']>;
export type StressLevel = NonNullable<MyDayContextDto['stressLevel']>;
export type InteractionPreference = NonNullable<MyDayContextDto['interactionPreference']>;

interface PlanningTaskLike {
  id: string;
  title: string;
  priority: TaskPriority;
  status: TaskStatus;
  deadline: Date | string | null;
  subtasks?: Array<{ status: TaskStatus }>;
}

export interface NormalizedMyDayContext {
  mood: number;
  energyLevel: number;
  wishes: string[];
  timeBudgetMinutes: number | null;
  dayIntent: DayIntent;
  focusCapacity: FocusCapacity;
  stressLevel: StressLevel;
  interactionPreference: InteractionPreference;
}

export interface DayPlanningPreview {
  normalizedContext: NormalizedMyDayContext;
  candidateCount: number;
  recommendedTaskLimit: number;
  urgentTaskCount: number;
  quickWinTaskCount: number;
  heuristics: string[];
}

const DAY_INTENTS: DayIntent[] = ['LIGHT', 'BALANCED', 'PROGRESS', 'FOCUS', 'CATCH_UP'];
const FOCUS_LEVELS: FocusCapacity[] = ['LOW', 'MEDIUM', 'HIGH'];
const STRESS_LEVELS: StressLevel[] = ['LOW', 'MEDIUM', 'HIGH'];
const INTERACTION_LEVELS: InteractionPreference[] = ['SOLO', 'MIXED', 'SOCIAL'];

@Injectable()
export class DayPlanningService {
  normalizeMyDayContext(input?: MyDayContextDto | null): NormalizedMyDayContext | null {
    if (!input) {
      return null;
    }

    const wishes = Array.isArray(input.wishes)
      ? input.wishes
        .map((entry) => entry.trim())
        .filter((entry, index, array) => entry.length > 0 && array.indexOf(entry) === index)
      : [];

    const mood = this.clampInteger(input.mood ?? 3, 1, 5);
    const energyLevel = this.clampInteger(input.energyLevel ?? 11, 1, 20);
    const timeBudgetMinutes = typeof input.timeBudgetMinutes === 'number' && Number.isFinite(input.timeBudgetMinutes)
      ? this.clampInteger(input.timeBudgetMinutes, 15, 12 * 60)
      : null;

    const dayIntent = this.pickEnum(input.dayIntent, DAY_INTENTS) ?? this.inferDayIntent(energyLevel, wishes);
    const focusCapacity = this.pickEnum(input.focusCapacity, FOCUS_LEVELS) ?? this.inferFocusCapacity(energyLevel, wishes);
    const stressLevel = this.pickEnum(input.stressLevel, STRESS_LEVELS) ?? this.inferStressLevel(mood, wishes);
    const interactionPreference = this.pickEnum(input.interactionPreference, INTERACTION_LEVELS) ?? 'MIXED';

    return {
      mood,
      energyLevel,
      wishes,
      timeBudgetMinutes,
      dayIntent,
      focusCapacity,
      stressLevel,
      interactionPreference,
    };
  }

  buildMyDayPreview(context: NormalizedMyDayContext, tasks: PlanningTaskLike[]): DayPlanningPreview {
    const candidateTasks = tasks.filter((task) => task.status !== 'DONE');
    const urgentTaskCount = candidateTasks.filter((task) => this.isUrgent(task)).length;
    const quickWinTaskCount = candidateTasks.filter((task) => this.isQuickWin(task)).length;
    const recommendedTaskLimit = this.resolveTaskLimit(context);

    return {
      normalizedContext: context,
      candidateCount: candidateTasks.length,
      recommendedTaskLimit,
      urgentTaskCount,
      quickWinTaskCount,
      heuristics: this.buildHeuristics(context),
    };
  }

  private resolveTaskLimit(context: NormalizedMyDayContext): number {
    if (context.timeBudgetMinutes !== null) {
      if (context.timeBudgetMinutes <= 45) return 2;
      if (context.timeBudgetMinutes <= 120) return 3;
      if (context.timeBudgetMinutes <= 240) return 4;
      return 5;
    }

    if (context.energyLevel <= 7) return 2;
    if (context.energyLevel <= 12) return 3;
    if (context.energyLevel <= 16) return 4;
    return 5;
  }

  private buildHeuristics(context: NormalizedMyDayContext): string[] {
    const notes: string[] = [];

    if (context.dayIntent === 'LIGHT') {
      notes.push('Prefer low-friction tasks and starter steps.');
    }
    if (context.dayIntent === 'FOCUS') {
      notes.push('Allow one deep-work anchor task plus minimal supporting work.');
    }
    if (context.stressLevel === 'HIGH') {
      notes.push('Avoid overload and reduce cognitive switching.');
    }
    if (context.timeBudgetMinutes !== null) {
      notes.push(`Keep the total visible plan within roughly ${context.timeBudgetMinutes} minutes.`);
    }
    if (context.focusCapacity === 'LOW') {
      notes.push('Prefer quick wins, near-complete tasks, and simple follow-through actions.');
    }

    return notes;
  }

  private inferDayIntent(energyLevel: number, wishes: string[]): DayIntent {
    if (wishes.includes('Ничего сложного')) return 'LIGHT';
    if (wishes.includes('Одно большое дело')) return 'FOCUS';
    if (wishes.includes('Только срочное')) return 'CATCH_UP';
    if (wishes.includes('Побольше поработать')) return 'PROGRESS';
    if (energyLevel <= 7) return 'LIGHT';
    if (energyLevel >= 16) return 'PROGRESS';
    return 'BALANCED';
  }

  private inferFocusCapacity(energyLevel: number, wishes: string[]): FocusCapacity {
    if (wishes.includes('Ничего сложного')) return 'LOW';
    if (wishes.includes('Одно большое дело')) return 'HIGH';
    if (energyLevel <= 7) return 'LOW';
    if (energyLevel >= 15) return 'HIGH';
    return 'MEDIUM';
  }

  private inferStressLevel(mood: number, wishes: string[]): StressLevel {
    if (wishes.includes('Ничего сложного')) return 'HIGH';
    if (wishes.includes('Только срочное')) return 'MEDIUM';
    if (mood <= 2) return 'HIGH';
    if (mood === 3) return 'MEDIUM';
    return 'LOW';
  }

  private isUrgent(task: PlanningTaskLike): boolean {
    if (task.priority === 'HIGH' || task.priority === 'CRITICAL') {
      return true;
    }
    if (!task.deadline) {
      return false;
    }

    const deadline = task.deadline instanceof Date ? task.deadline : new Date(task.deadline);
    const now = new Date();
    const twoDaysAhead = new Date(now);
    twoDaysAhead.setDate(twoDaysAhead.getDate() + 2);
    return deadline <= twoDaysAhead;
  }

  private isQuickWin(task: PlanningTaskLike): boolean {
    const subtasks = Array.isArray(task.subtasks) ? task.subtasks : [];
    const openSubtasks = subtasks.filter((subtask) => subtask.status !== 'DONE').length;
    return (task.priority === 'LOW' || task.priority === 'MEDIUM') && openSubtasks <= 1;
  }

  private pickEnum<T extends string>(value: T | null | undefined, allowed: readonly T[]): T | null {
    if (!value) {
      return null;
    }
    return allowed.includes(value) ? value : null;
  }

  private clampInteger(value: number, min: number, max: number): number {
    return Math.min(max, Math.max(min, Math.round(value)));
  }
}
