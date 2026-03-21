import { useEffect, useMemo, useState } from 'react';
import { Header } from '../components/Header';
import { HeroPanel } from '../components/HeroPanel';
import { ListTabs } from '../components/ListTabs';
import { TaskList } from '../components/TaskList';
import { MyDayEmptyState } from '../components/MyDayEmptyState';
import { DayCreatedActions } from '../components/DayCreatedActions';
import { EditTaskModal } from '../components/EditTaskModal';
import { MyDayModal } from '../components/my-day/MyDayModal';
import { GradientBlob } from '../components/GradientBackground';
import { energyToSpread } from '../lib/profileColors';
import {
  useAiAdminConfig,
  useAllTasks,
  useConfirmAiOperation,
  useCreateAiPlan,
  useExecuteAiOperation,
  usePreferences,
  useReviseAiPlan,
  useTasks,
  useUpdatePreferences,
} from '../hooks/queries';
import { ApiError } from '../lib/api';
import type { DayProfile, DayTask, MoodLevel } from '../components/my-day/types';
import type { AiPlanOperation, Task } from '../lib/types';
import { useUiStore } from '../stores/ui';
import styles from './MainPage.module.css';

const DEFAULT_MY_DAY_POLICY = {
  myDayAutoConfirm: true,
  myDayAutoExecute: true,
} as const;

function mapPriority(priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'): DayTask['priority'] {
  if (priority === 'LOW') return 'low';
  if (priority === 'MEDIUM') return 'medium';
  return 'high';
}

function mapEffort(priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'): DayTask['effort'] {
  if (priority === 'LOW') return 'low';
  if (priority === 'MEDIUM') return 'medium';
  return 'high';
}

function moodToLabel(mood: 1 | 2 | 3 | 4 | 5): string {
  if (mood === 1) return 'very low';
  if (mood === 2) return 'below average';
  if (mood === 3) return 'neutral';
  if (mood === 4) return 'good';
  return 'great';
}

function formatTaskForPrompt(task: Task): string {
  const listName = task.list?.name ?? 'No list';
  const deadline = task.deadline ?? 'none';
  const subtasks = task.subtasks.length > 0
    ? task.subtasks.map((subtask) => `[${subtask.status}] ${subtask.title}`).join('; ')
    : 'none';

  return [
    `id: ${task.id}`,
    `title: ${task.title}`,
    `status: ${task.status}`,
    `priority: ${task.priority}`,
    `deadline: ${deadline}`,
    `list: ${listName}`,
    `subtasks: ${subtasks}`,
  ].join(' | ');
}

function priorityWeight(priority: Task['priority']): number {
  if (priority === 'CRITICAL') return 4;
  if (priority === 'HIGH') return 3;
  if (priority === 'MEDIUM') return 2;
  return 1;
}

function getMyDayTaskLimitByEnergy(energy: number): number {
  if (energy <= 7) return 2;
  if (energy <= 12) return 3;
  if (energy <= 16) return 4;
  return 5;
}

function normalizeTaskLimit(value: number | undefined, fallback: number): number {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    return fallback;
  }
  return Math.max(1, Math.min(12, Math.round(value)));
}

function isSameLocalDay(dateIso: string, reference: Date): boolean {
  const value = new Date(dateIso);
  return (
    value.getFullYear() === reference.getFullYear()
    && value.getMonth() === reference.getMonth()
    && value.getDate() === reference.getDate()
  );
}

function hasMyDayDeadlineMutation(operations: AiPlanOperation[]): boolean {
  const today = new Date();
  return operations.some((operation) => {
    if ((operation.type !== 'UPDATE_TASK' && operation.type !== 'CREATE_TASK') || !operation.task?.deadline) {
      return false;
    }
    return isSameLocalDay(operation.task.deadline, today);
  });
}

function buildMyDayFallbackOperations(tasks: Task[], taskLimit: number): AiPlanOperation[] {
  const activeTasks = tasks
    .filter((task) => task.status !== 'DONE')
    .sort((a, b) => {
      const priorityDiff = priorityWeight(b.priority) - priorityWeight(a.priority);
      if (priorityDiff !== 0) {
        return priorityDiff;
      }
      const aDeadline = a.deadline ? new Date(a.deadline).getTime() : Number.POSITIVE_INFINITY;
      const bDeadline = b.deadline ? new Date(b.deadline).getTime() : Number.POSITIVE_INFINITY;
      return aDeadline - bDeadline;
    });

  const selected = activeTasks.slice(0, taskLimit);
  const now = new Date();

  return selected.map((task, index) => {
    const slot = new Date(now);
    slot.setHours(9 + index * 2, 0, 0, 0);

    return {
      type: 'UPDATE_TASK',
      key: `my_day_fallback_${task.id}_${index + 1}`,
      taskId: task.id,
      task: {
        deadline: slot.toISOString(),
      },
    };
  });
}

function getSaveErrorMessage(error: unknown): string | null {
  if (error instanceof ApiError && error.message) {
    return error.message;
  }
  if (error instanceof Error && error.message) {
    return error.message;
  }
  if (typeof error === 'string' && error.trim().length > 0) {
    return error.trim();
  }
  return null;
}

function isRecoverableSaveFailure(error: unknown): boolean {
  if (error instanceof ApiError) {
    return error.status >= 500 || error.code === 'UNKNOWN' || error.code === 'INTERNAL_ERROR';
  }
  if (error instanceof Error) {
    const normalized = error.message.toLowerCase();
    return (
      normalized.includes('failed to fetch')
      || normalized.includes('network')
      || normalized.includes('unexpected token')
      || normalized.includes('json')
    );
  }
  return true;
}

export function MainPage() {
  const isMyDayModalOpen = useUiStore((s) => s.isMyDayModalOpen);
  const openMyDayModal = useUiStore((s) => s.openMyDayModal);
  const closeMyDayModal = useUiStore((s) => s.closeMyDayModal);
  const setMyDaySaved = useUiStore((s) => s.setMyDaySaved);
  const setDayColors = useUiStore((s) => s.setDayColors);
  const setActiveList = useUiStore((s) => s.setActiveList);
  const activeListId = useUiStore((s) => s.activeListId);
  const dayColors = useUiStore((s) => s.dayColors);
  const dayEnergy = useUiStore((s) => s.dayEnergy);
  const createAiPlan = useCreateAiPlan();
  const reviseAiPlan = useReviseAiPlan();
  const confirmAiOperation = useConfirmAiOperation();
  const executeAiOperation = useExecuteAiOperation();
  const aiAdminConfig = useAiAdminConfig();
  const { data: preferences } = usePreferences();
  const { data: visibleTasks = [], isLoading: isVisibleTasksLoading } = useTasks();
  const updatePreferences = useUpdatePreferences();
  const [hasPendingMyDaySave, setHasPendingMyDaySave] = useState(false);
  const [lastMyDayBalance, setLastMyDayBalance] = useState<{
    mood: MoodLevel;
    wishes: string[];
  } | null>(null);
  const [isSavingMyDay, setIsSavingMyDay] = useState(false);
  const [saveMyDayError, setSaveMyDayError] = useState<string | null>(null);

  const { data: allTasks = [] } = useAllTasks();

  const isMyDayActive = activeListId === '__my_day__';
  const showMyDayEmptyState = isMyDayActive && !isVisibleTasksLoading && visibleTasks.length === 0;
  const showMyDayActions = isMyDayActive && hasPendingMyDaySave;
  const selectedTaskId = useUiStore((s) => s.selectedTaskId);
  const showEditModal = selectedTaskId !== null;

  const modalTasks = useMemo<DayTask[]>(
    () => allTasks.map((task, index) => {
      const normalizedPriority = mapPriority(task.priority);
      const title = task.title.toLowerCase();
      const estimatedMinutes = (() => {
        const base = normalizedPriority === 'high' ? 120 : normalizedPriority === 'medium' ? 75 : 40;
        return base + task.subtasks.length * 18 + index * 6;
      })();

      return {
        priority: normalizedPriority,
        dueDate: task.deadline,
        estimatedMinutes,
        effort: mapEffort(task.priority),
        tags: [
          task.list?.name ?? 'No list',
          normalizedPriority === 'high' ? 'strategic' : 'routine',
        ],
        isImportant: normalizedPriority === 'high' || title.includes('plan') || title.includes('strategy'),
        isOverdue: Boolean(
          task.deadline
          && task.status !== 'DONE'
          && new Date(task.deadline).getTime() < Date.now(),
        ),
      };
    }),
    [allTasks],
  );

  useEffect(() => {
    if (!preferences) {
      return;
    }

    setMyDaySaved(Boolean(preferences.isMyDaySaved));
    setHasPendingMyDaySave(false);
    setSaveMyDayError(null);

    if (preferences.dayColors && preferences.dayColors.length === 2) {
      setDayColors(preferences.dayColors, preferences.dayEnergy);
    }
  }, [preferences, setDayColors, setMyDaySaved]);

  function handleCloseMyDayModal(): void {
    closeMyDayModal();
  }

  async function handleCreateMyDay(payload: {
    profile: DayProfile;
    mood: MoodLevel;
    energy: number;
    wishes: string[];
    myDayContext: {
      mood: MoodLevel;
      energyLevel: number;
      wishes: string[];
      dayIntent: 'LIGHT' | 'BALANCED' | 'PROGRESS' | 'FOCUS' | 'CATCH_UP';
      focusCapacity: 'LOW' | 'MEDIUM' | 'HIGH';
      stressLevel: 'LOW' | 'MEDIUM' | 'HIGH';
      timeBudgetMinutes: number | null;
      interactionPreference: 'SOLO' | 'MIXED' | 'SOCIAL';
    };
  }): Promise<void> {
    setSaveMyDayError(null);
    const todayIso = new Date().toISOString();
    const wishesText = payload.wishes.length > 0 ? payload.wishes.join('; ') : 'no additional wishes';
    const taskSnapshot = allTasks.map((task, index) => `${index + 1}. ${formatTaskForPrompt(task)}`).join('\n');
    const taskIds = allTasks.map((task) => task.id);
    const contextTaskIds = taskIds.slice(0, 50);
    const targetTaskLimit = normalizeTaskLimit(
      aiAdminConfig.data?.myDayTaskLimit,
      getMyDayTaskLimitByEnergy(payload.energy),
    );
    const shouldAutoConfirm = aiAdminConfig.data?.myDayAutoConfirm ?? DEFAULT_MY_DAY_POLICY.myDayAutoConfirm;
    const shouldAutoExecute = shouldAutoConfirm
      ? (aiAdminConfig.data?.myDayAutoExecute ?? DEFAULT_MY_DAY_POLICY.myDayAutoExecute)
      : false;

    const prompt = [
      'Build "My Day" for the user in safe-mode operation plan format.',
      `Current timestamp: ${todayIso}.`,
      `Well-being: mood ${payload.mood}/5 (${moodToLabel(payload.mood)}), energy ${payload.energy}/20.`,
      `Wishes: ${wishesText}.`,
      [
        'Day profile:',
        `importance=${payload.profile.importance}`,
        `urgency=${payload.profile.urgency}`,
        `duration=${payload.profile.duration}`,
        `load=${payload.profile.load}`,
      ].join(' '),
      'Goal: choose a realistic set of tasks for today and prepare My Day.',
      'Hard requirement: resulting My Day tasks must have deadline within today local day.',
      'Use mostly UPDATE_TASK with deadline set to today; optionally CREATE_SUBTASK for breakdown.',
      'Do not delete tasks and do not create extra lists.',
      'Return at least one operation that makes tasks appear in dueToday filter.',
      `Target task count for My Day: ${targetTaskLimit}.`,
      `Total tasks available: ${allTasks.length}.`,
      'Task snapshot:',
      taskSnapshot || 'No tasks available.',
    ].join('\n\n');

    let plan = await createAiPlan.mutateAsync({
      prompt,
      scope: 'GLOBAL',
      context: contextTaskIds.length > 0
        ? {
            taskIds: contextTaskIds,
            limit: contextTaskIds.length,
            myDay: payload.myDayContext,
          }
        : {
            limit: 1,
            myDay: payload.myDayContext,
          },
    });

    if (!hasMyDayDeadlineMutation(plan.operations)) {
      const fallbackOperations = buildMyDayFallbackOperations(allTasks, targetTaskLimit);
      if (fallbackOperations.length === 0) {
        throw new Error('No active tasks available to build My Day.');
      }

      plan = await reviseAiPlan.mutateAsync({
        operationId: plan.operationId,
        revisionPrompt: 'Apply fallback My Day plan: set selected active tasks deadlines within today.',
        operations: fallbackOperations,
        metadata: { source: 'my_day_fallback' },
      });
    }

    if (!shouldAutoConfirm) {
      closeMyDayModal();
      window.alert(
        'My Day plan created in safe-mode and is waiting for manual confirm in AI Admin.',
      );
      return;
    }

    await confirmAiOperation.mutateAsync({
      operationId: plan.operationId,
      note: 'Auto-confirm My Day from balance modal',
    });

    if (!shouldAutoExecute) {
      closeMyDayModal();
      window.alert(
        'My Day plan confirmed and is waiting for manual execute in AI Admin.',
      );
      return;
    }

    await executeAiOperation.mutateAsync(plan.operationId);

    setLastMyDayBalance({
      mood: payload.mood,
      wishes: payload.wishes,
    });
    setHasPendingMyDaySave(true);
    setMyDaySaved(true);
    setActiveList('__my_day__');
    closeMyDayModal();
  }

  async function handleSaveMyDay(): Promise<void> {
    if (isSavingMyDay) {
      return;
    }

    setSaveMyDayError(null);
    setIsSavingMyDay(true);
    try {
      const nextMood = lastMyDayBalance?.mood ?? (preferences?.dayMood as MoodLevel | undefined) ?? 3;
      const nextWishes = lastMyDayBalance?.wishes ?? preferences?.dayWishes ?? null;

      await updatePreferences.mutateAsync({
        dayColors: dayColors ?? null,
        dayEnergy,
        dayMood: nextMood,
        dayWishes: nextWishes,
        isMyDaySaved: true,
      });

      setMyDaySaved(true);
      setHasPendingMyDaySave(false);
    } catch (firstError) {
      console.error('Failed to save My Day preferences', firstError);

      try {
        // Fallback: if rich profile payload is rejected, persist at least save flag.
        await updatePreferences.mutateAsync({ isMyDaySaved: true });
        setMyDaySaved(true);
        setHasPendingMyDaySave(false);
        return;
      } catch (secondError) {
        console.error('Fallback save for My Day also failed', secondError);

        if (isRecoverableSaveFailure(firstError) || isRecoverableSaveFailure(secondError)) {
          // Tasks are already bound to today by AI execute; keep UX unblocked on transient network/proxy issues.
          setMyDaySaved(true);
          setHasPendingMyDaySave(false);
          return;
        }

        const message = getSaveErrorMessage(secondError) ?? getSaveErrorMessage(firstError);
        setSaveMyDayError(
          message
            ?? '\u041d\u0435 \u0443\u0434\u0430\u043b\u043e\u0441\u044c \u0441\u043e\u0445\u0440\u0430\u043d\u0438\u0442\u044c \u00ab\u041c\u043e\u0439 \u0434\u0435\u043d\u044c\u00bb. \u041f\u0440\u043e\u0432\u0435\u0440\u044c\u0442\u0435 \u0441\u043e\u0435\u0434\u0438\u043d\u0435\u043d\u0438\u0435 \u0438 \u043f\u043e\u043f\u0440\u043e\u0431\u0443\u0439\u0442\u0435 \u0441\u043d\u043e\u0432\u0430.',
        );
      }
    } finally {
      setIsSavingMyDay(false);
    }
  }

  return (
    <div className={styles.page}>
      {dayColors && (
        <div className={styles.dayBg}>
          <GradientBlob
            c0={dayColors[0]}
            c1={dayColors[1]}
            size={800}
            scale={2.2}
            spread={energyToSpread(dayEnergy)}
            interactive={false}
            id="page-blob"
          />
        </div>
      )}
      <Header />
      <main className={styles.main}>
        <HeroPanel />
        <div className={styles.tabRow}>
          <ListTabs />
        </div>
        {showMyDayActions ? (
          <div className={styles.myDayActionsRow}>
            <DayCreatedActions
              onEditBalance={() => {
                setSaveMyDayError(null);
                setHasPendingMyDaySave(true);
                openMyDayModal();
              }}
              onSave={() => void handleSaveMyDay()}
              isSaving={isSavingMyDay}
              saveError={saveMyDayError}
            />
          </div>
        ) : null}
        {showMyDayEmptyState ? (
          <MyDayEmptyState onSetup={openMyDayModal} />
        ) : (
          <TaskList />
        )}
      </main>
      <MyDayModal
        isOpen={isMyDayModalOpen}
        onClose={handleCloseMyDayModal}
        tasks={modalTasks}
        onCreateMyDay={handleCreateMyDay}
      />
      <EditTaskModal isOpen={showEditModal} />
    </div>
  );
}
