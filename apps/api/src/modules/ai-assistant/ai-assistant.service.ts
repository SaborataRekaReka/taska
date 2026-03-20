import {
  BadGatewayException,
  BadRequestException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import type {
  AiOperationScope,
  HistoryEntityType,
  Prisma,
  TaskPriority,
  TaskStatus,
} from '@prisma/client';

import { PrismaService } from '../../core/prisma.service.js';
import { HistoryService } from '../history/history.service.js';
import { ListsService } from '../lists/lists.service.js';
import { PROTECTED_REAL_LIST_NAMES, VIRTUAL_TECH_LIST_NAMES } from '../lists/list.constants.js';
import { SubtasksService } from '../subtasks/subtasks.service.js';
import { TasksService } from '../tasks/tasks.service.js';
import type {
  CreateAiPlanDto,
  ReviseAiPlanDto,
} from './dto.js';

const OPENAI_API_URL = 'https://api.openai.com/v1/responses';
const DEFAULT_CHAT_MODEL = 'gpt-4.1-mini';
const ALLOWED_OPERATION_TYPES = [
  'CREATE_LIST',
  'UPDATE_LIST',
  'CREATE_TASK',
  'UPDATE_TASK',
  'DELETE_TASK',
  'CREATE_SUBTASK',
  'UPDATE_SUBTASK',
  'DELETE_SUBTASK',
] as const;

type AllowedOperationType = (typeof ALLOWED_OPERATION_TYPES)[number];

export interface PlanTaskPatch {
  title?: string;
  description?: string;
  priority?: TaskPriority;
  status?: TaskStatus;
  deadline?: string | null;
  listId?: string | null;
}

export interface PlanSubtaskPatch {
  title?: string;
  status?: TaskStatus;
}

export interface PlanOperation {
  type: AllowedOperationType;
  key: string;
  listId?: string;
  taskId?: string;
  subtaskId?: string;
  name?: string;
  task?: PlanTaskPatch;
  subtask?: PlanSubtaskPatch;
}

export interface OperationPlan {
  version: 1;
  scope: 'GLOBAL' | 'TASK';
  summary: string;
  assistantMessage: string;
  operations: PlanOperation[];
  warnings: string[];
}

interface ExecutionMutationResult {
  type: AllowedOperationType;
  key: string;
  entityType: HistoryEntityType;
  entityId: string;
  result: Record<string, unknown>;
  undo: UndoMutation;
}

type UndoMutation =
  | { type: 'DELETE_LIST'; listId: string }
  | { type: 'RESTORE_LIST'; listId: string; previousName: string }
  | { type: 'DELETE_TASK'; taskId: string }
  | { type: 'RESTORE_TASK'; taskId: string; previous: { title: string; description: string | null; priority: TaskPriority; status: TaskStatus; deadline: string | null; listId: string | null; deletedAt: string | null } }
  | { type: 'DELETE_SUBTASK'; taskId: string; subtaskId: string }
  | { type: 'RESTORE_SUBTASK'; taskId: string; subtaskId: string; previous: { title: string; status: TaskStatus } };

interface JsonSchemaResponse {
  output_text?: string;
  output?: Array<
    | { type?: string; content?: Array<{ type?: string; text?: string }> }
    | { type?: string; text?: string }
  >;
}

const MY_DAY_SMART_LIST_HINT = {
  id: '__my_day__',
  name: 'Мой день',
  aliases: ['мой день', 'my day'],
  description: 'Virtual smart list. It is not a database list entity.',
  filterRule: 'Includes tasks with deadline within today (local day start..end).',
  mutationGuide: {
    addToMyDay: 'Use UPDATE_TASK and set task.deadline to a datetime within today.',
    removeFromMyDay: 'Use UPDATE_TASK and set task.deadline to null or datetime outside today.',
    note: 'Do not use CREATE_LIST/UPDATE_LIST for "Мой день".',
  },
};

const ALL_TECH_LIST_HINT = {
  id: '__all__',
  name: 'Все',
  aliases: ['все', 'all'],
  description: 'Virtual technical list that shows all tasks.',
  mutationGuide: {
    note: 'Do not use CREATE_LIST/UPDATE_LIST for "Все".',
  },
};

const NO_LIST_SYSTEM_HINT = {
  id: '__no_list__',
  name: 'Без списка',
  aliases: ['без списка', 'no list', 'without list'],
  description: 'Protected system bucket for tasks without a list.',
  mutationGuide: {
    moveTask: 'Use UPDATE_TASK and set task.listId to null.',
    note: 'Do not use CREATE_LIST/UPDATE_LIST for "Без списка".',
  },
};

@Injectable()
export class AiAssistantService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly history: HistoryService,
    private readonly listsService: ListsService,
    private readonly tasksService: TasksService,
    private readonly subtasksService: SubtasksService,
  ) {}

  async createPlan(userId: string, dto: CreateAiPlanDto) {
    const scope = dto.scope ?? 'GLOBAL';
    if (scope === 'TASK' && !dto.taskId) {
      throw new BadRequestException('taskId is required for TASK scope');
    }

    const context = await this.buildContext(userId, dto);
    const plan = await this.generatePlan(dto.prompt, scope, context);
    const normalizedPlan = this.normalizePlan(scope, plan);

    const operation = await this.prisma.aiOperation.create({
      data: {
        userId,
        scope,
        taskId: dto.taskId ?? null,
        operationType: 'PLAN',
        model: this.resolveModel(),
        prompt: dto.prompt,
        planPayload: this.asJson(normalizedPlan),
        executionPayload: this.asJson({
          contextSummary: context.summary,
        }),
      },
    });

    return {
      operationId: operation.id,
      status: operation.status,
      scope: operation.scope,
      taskId: operation.taskId,
      summary: normalizedPlan.summary,
      assistantMessage: normalizedPlan.assistantMessage,
      operations: normalizedPlan.operations,
      warnings: normalizedPlan.warnings,
      model: operation.model,
    };
  }

  async revisePlan(userId: string, operationId: string, dto: ReviseAiPlanDto) {
    const operation = await this.findOwnedOperation(userId, operationId);
    if (operation.status !== 'PLANNED') {
      throw new BadRequestException('Only planned operations can be revised');
    }

    const existingPlan = this.readPlan(operation.scope, operation.planPayload);
    const revisedPlan = dto.operations?.length
      ? this.normalizePlan(operation.scope, {
          version: 1,
          scope: operation.scope,
          summary: existingPlan.summary,
          assistantMessage: dto.revisionPrompt,
          warnings: existingPlan.warnings,
          operations: dto.operations,
        })
      : await this.generatePlan(
          `${operation.prompt}\n\nПользовательская правка плана:\n${dto.revisionPrompt}`,
          operation.scope,
          await this.buildContext(userId, {
            prompt: dto.revisionPrompt,
            scope: operation.scope,
            ...(operation.taskId ? { taskId: operation.taskId } : {}),
          }),
        );

    const normalizedPlan = this.normalizePlan(operation.scope, revisedPlan);
    const updated = await this.prisma.aiOperation.update({
      where: { id: operation.id },
      data: {
        prompt: `${operation.prompt}\n\n[revision]\n${dto.revisionPrompt}`,
        planPayload: this.asJson(normalizedPlan),
      },
    });

    return {
      operationId: updated.id,
      status: updated.status,
      scope: updated.scope,
      summary: normalizedPlan.summary,
      assistantMessage: normalizedPlan.assistantMessage,
      operations: normalizedPlan.operations,
      warnings: normalizedPlan.warnings,
    };
  }

  async confirmOperation(userId: string, operationId: string, note?: string) {
    const operation = await this.findOwnedOperation(userId, operationId);
    if (operation.status !== 'PLANNED') {
      throw new BadRequestException('Only planned operations can be confirmed');
    }

    const updated = await this.prisma.aiOperation.update({
      where: { id: operation.id },
      data: {
        status: 'CONFIRMED',
        approvedAt: new Date(),
        executionPayload: this.asJson({
          ...(this.toRecord(operation.executionPayload) ?? {}),
          approvalNote: note ?? null,
        }),
      },
    });

    return {
      operationId: updated.id,
      status: updated.status,
      approvedAt: updated.approvedAt,
    };
  }

  async executeOperation(userId: string, operationId: string) {
    const operation = await this.findOwnedOperation(userId, operationId);
    if (operation.status !== 'CONFIRMED') {
      throw new BadRequestException('Only confirmed operations can be executed');
    }

    try {
      const plan = this.readPlan(operation.scope, operation.planPayload);
      const executionResults: ExecutionMutationResult[] = [];

      for (const item of plan.operations) {
        executionResults.push(await this.executePlanOperation(userId, item));
      }

      const executedAt = new Date();
      const updated = await this.prisma.aiOperation.update({
        where: { id: operation.id },
        data: {
          status: 'EXECUTED',
          executedAt,
          failedAt: null,
          errorMessage: null,
          executionPayload: this.asJson({
            executedCount: executionResults.length,
            results: executionResults.map((result) => ({
              type: result.type,
              key: result.key,
              entityType: result.entityType,
              entityId: result.entityId,
              result: result.result,
            })),
          }),
          undoPayload: this.asJson({
            mutations: executionResults.map((result) => result.undo),
          }),
        },
      });

      await this.history.record({
        userId,
        entityType: 'AI_OPERATION',
        entityId: updated.id,
        actionType: 'AI_EXECUTED',
        payload: {
          scope: updated.scope,
          operationType: updated.operationType,
          executedCount: executionResults.length,
          entities: executionResults.map((result) => ({
            entityType: result.entityType,
            entityId: result.entityId,
            type: result.type,
          })),
        },
      });

      return {
        operationId: updated.id,
        status: updated.status,
        executedAt: updated.executedAt,
        results: executionResults.map((result) => ({
          type: result.type,
          key: result.key,
          entityType: result.entityType,
          entityId: result.entityId,
          result: result.result,
        })),
      };
    } catch (error) {
      await this.prisma.aiOperation.update({
        where: { id: operation.id },
        data: {
          status: 'FAILED',
          failedAt: new Date(),
          errorMessage: error instanceof Error ? error.message : 'AI execution failed',
        },
      });
      throw error;
    }
  }

  async undoOperation(userId: string, operationId: string, reason?: string) {
    const operation = await this.findOwnedOperation(userId, operationId);
    if (operation.status !== 'EXECUTED') {
      throw new BadRequestException('Only executed operations can be undone');
    }

    const undoPayload = this.toRecord(operation.undoPayload);
    const mutations = Array.isArray(undoPayload?.mutations) ? undoPayload.mutations : [];
    if (mutations.length === 0) {
      throw new BadRequestException('Undo payload is empty for this AI operation');
    }

    for (const mutation of [...mutations].reverse()) {
      await this.applyUndoMutation(userId, mutation);
    }

    const undoneAt = new Date();
    const updated = await this.prisma.aiOperation.update({
      where: { id: operation.id },
      data: {
        status: 'UNDONE',
        undoneAt,
        executionPayload: this.asJson({
          ...(this.toRecord(operation.executionPayload) ?? {}),
          undoReason: reason ?? null,
        }),
      },
    });

    await this.history.record({
      userId,
      entityType: 'AI_OPERATION',
      entityId: updated.id,
      actionType: 'AI_UNDONE',
      payload: {
        scope: updated.scope,
        operationType: updated.operationType,
        undoCount: mutations.length,
        reason: reason ?? null,
      },
    });

    return {
      operationId: updated.id,
      status: updated.status,
      undoneAt: updated.undoneAt,
      undoneCount: mutations.length,
    };
  }

  async getOperation(userId: string, operationId: string) {
    const operation = await this.findOwnedOperation(userId, operationId);
    return {
      operationId: operation.id,
      scope: operation.scope,
      taskId: operation.taskId,
      status: operation.status,
      prompt: operation.prompt,
      model: operation.model,
      approvedAt: operation.approvedAt,
      executedAt: operation.executedAt,
      undoneAt: operation.undoneAt,
      failedAt: operation.failedAt,
      errorMessage: operation.errorMessage,
      plan: this.readPlan(operation.scope, operation.planPayload),
      executionPayload: this.toRecord(operation.executionPayload),
      undoPayload: this.toRecord(operation.undoPayload),
      createdAt: operation.createdAt,
    };
  }

  private async executePlanOperation(userId: string, item: PlanOperation): Promise<ExecutionMutationResult> {
    if (item.type === 'CREATE_LIST') {
      if (!item.name) throw new BadRequestException('CREATE_LIST requires name');
      const list = await this.listsService.create(userId, item.name);
      return {
        type: item.type,
        key: item.key,
        entityType: 'LIST',
        entityId: list.id,
        result: { listId: list.id, name: list.name },
        undo: { type: 'DELETE_LIST', listId: list.id },
      };
    }

    if (item.type === 'UPDATE_LIST') {
      if (!item.listId || !item.name) throw new BadRequestException('UPDATE_LIST requires listId and name');
      const current = await this.prisma.list.findFirst({ where: { id: item.listId, userId, deletedAt: null } });
      if (!current) throw new NotFoundException('List not found');
      const updated = await this.listsService.update(userId, item.listId, item.name);
      return {
        type: item.type,
        key: item.key,
        entityType: 'LIST',
        entityId: updated.id,
        result: { listId: updated.id, name: updated.name },
        undo: { type: 'RESTORE_LIST', listId: updated.id, previousName: current.name },
      };
    }

    if (item.type === 'CREATE_TASK') {
      if (!item.task) throw new BadRequestException('CREATE_TASK requires task payload');
      const task = await this.tasksService.create(userId, this.buildCreateTaskInput(item.task));
      return {
        type: item.type,
        key: item.key,
        entityType: 'TASK',
        entityId: task.id,
        result: { taskId: task.id, title: task.title },
        undo: { type: 'DELETE_TASK', taskId: task.id },
      };
    }

    if (item.type === 'UPDATE_TASK') {
      if (!item.taskId || !item.task) throw new BadRequestException('UPDATE_TASK requires taskId and task patch');
      const current = await this.prisma.task.findFirst({ where: { id: item.taskId, userId, deletedAt: null } });
      if (!current) throw new NotFoundException('Task not found');
      const updated = await this.tasksService.update(userId, item.taskId, this.buildUpdateTaskInput(item.task));
      return {
        type: item.type,
        key: item.key,
        entityType: 'TASK',
        entityId: updated.id,
        result: { taskId: updated.id, title: updated.title },
        undo: {
          type: 'RESTORE_TASK',
          taskId: updated.id,
          previous: {
            title: current.title,
            description: current.description,
            priority: current.priority,
            status: current.status,
            deadline: current.deadline?.toISOString() ?? null,
            listId: current.listId,
            deletedAt: current.deletedAt?.toISOString() ?? null,
          },
        },
      };
    }

    if (item.type === 'DELETE_TASK') {
      if (!item.taskId) throw new BadRequestException('DELETE_TASK requires taskId');
      const current = await this.prisma.task.findFirst({ where: { id: item.taskId, userId, deletedAt: null } });
      if (!current) throw new NotFoundException('Task not found');
      await this.tasksService.remove(userId, item.taskId);
      return {
        type: item.type,
        key: item.key,
        entityType: 'TASK',
        entityId: current.id,
        result: { taskId: current.id, deleted: true },
        undo: {
          type: 'RESTORE_TASK',
          taskId: current.id,
          previous: {
            title: current.title,
            description: current.description,
            priority: current.priority,
            status: current.status,
            deadline: current.deadline?.toISOString() ?? null,
            listId: current.listId,
            deletedAt: null,
          },
        },
      };
    }

    if (item.type === 'CREATE_SUBTASK') {
      if (!item.taskId || !item.subtask?.title) throw new BadRequestException('CREATE_SUBTASK requires taskId and subtask.title');
      const subtask = await this.subtasksService.create(userId, item.taskId, item.subtask.title);
      return {
        type: item.type,
        key: item.key,
        entityType: 'SUBTASK',
        entityId: subtask.id,
        result: { taskId: item.taskId, subtaskId: subtask.id, title: subtask.title },
        undo: { type: 'DELETE_SUBTASK', taskId: item.taskId, subtaskId: subtask.id },
      };
    }

    if (item.type === 'UPDATE_SUBTASK') {
      if (!item.taskId || !item.subtaskId || !item.subtask) {
        throw new BadRequestException('UPDATE_SUBTASK requires taskId, subtaskId and subtask patch');
      }
      const current = await this.prisma.subtask.findFirst({ where: { id: item.subtaskId, taskId: item.taskId, userId } });
      if (!current) throw new NotFoundException('Subtask not found');
      const updated = await this.subtasksService.update(userId, item.taskId, item.subtaskId, this.buildUpdateSubtaskInput(item.subtask));
      return {
        type: item.type,
        key: item.key,
        entityType: 'SUBTASK',
        entityId: updated.id,
        result: { taskId: item.taskId, subtaskId: updated.id, title: updated.title },
        undo: {
          type: 'RESTORE_SUBTASK',
          taskId: item.taskId,
          subtaskId: updated.id,
          previous: {
            title: current.title,
            status: current.status,
          },
        },
      };
    }

    if (!item.taskId || !item.subtaskId) {
      throw new BadRequestException('DELETE_SUBTASK requires taskId and subtaskId');
    }
    const current = await this.prisma.subtask.findFirst({ where: { id: item.subtaskId, taskId: item.taskId, userId } });
    if (!current) throw new NotFoundException('Subtask not found');
    await this.subtasksService.remove(userId, item.taskId, item.subtaskId);
    return {
      type: item.type,
      key: item.key,
      entityType: 'SUBTASK',
      entityId: current.id,
      result: { taskId: item.taskId, subtaskId: current.id, deleted: true },
      undo: {
        type: 'RESTORE_SUBTASK',
        taskId: item.taskId,
        subtaskId: current.id,
        previous: {
          title: current.title,
          status: current.status,
        },
      },
    };
  }

  private async applyUndoMutation(userId: string, mutation: unknown) {
    if (!mutation || typeof mutation !== 'object') {
      throw new BadRequestException('Invalid undo mutation');
    }

    const typed = mutation as Record<string, unknown>;
    if (typed.type === 'DELETE_LIST' && typeof typed.listId === 'string') {
      await this.prisma.list.updateMany({
        where: { id: typed.listId, userId, deletedAt: null },
        data: { deletedAt: new Date() },
      });
      return;
    }

    if (typed.type === 'RESTORE_LIST' && typeof typed.listId === 'string' && typeof typed.previousName === 'string') {
      await this.prisma.list.updateMany({
        where: { id: typed.listId, userId },
        data: { name: typed.previousName, deletedAt: null },
      });
      return;
    }

    if (typed.type === 'DELETE_TASK' && typeof typed.taskId === 'string') {
      await this.prisma.task.updateMany({
        where: { id: typed.taskId, userId, deletedAt: null },
        data: { deletedAt: new Date() },
      });
      return;
    }

    if (typed.type === 'RESTORE_TASK' && typeof typed.taskId === 'string' && typed.previous && typeof typed.previous === 'object') {
      const previous = typed.previous as Record<string, unknown>;
      await this.prisma.task.updateMany({
        where: { id: typed.taskId, userId },
        data: this.buildTaskUndoUpdate(previous),
      });
      return;
    }

    if (typed.type === 'DELETE_SUBTASK' && typeof typed.subtaskId === 'string') {
      await this.prisma.subtask.deleteMany({
        where: { id: typed.subtaskId, userId },
      });
      return;
    }

    if (
      typed.type === 'RESTORE_SUBTASK'
      && typeof typed.taskId === 'string'
      && typeof typed.subtaskId === 'string'
      && typed.previous
      && typeof typed.previous === 'object'
    ) {
      const previous = typed.previous as Record<string, unknown>;
      const existing = await this.prisma.subtask.findFirst({ where: { id: typed.subtaskId, userId } });
      if (existing) {
        await this.prisma.subtask.update({
          where: { id: existing.id },
          data: this.buildUpdateSubtaskInput(this.omitUndefined({
            title: typeof previous.title === 'string' ? previous.title : undefined,
            status: typeof previous.status === 'string' ? previous.status as TaskStatus : undefined,
          }) as PlanSubtaskPatch),
        });
        return;
      }

      await this.prisma.subtask.create({
        data: {
          id: typed.subtaskId,
          userId,
          taskId: typed.taskId,
          title: typeof previous.title === 'string' ? previous.title : 'Restored subtask',
          status: typeof previous.status === 'string' ? previous.status as TaskStatus : 'TODO',
        },
      });
      return;
    }

    throw new BadRequestException('Unsupported undo mutation');
  }

  private async buildContext(userId: string, dto: Pick<CreateAiPlanDto, 'scope' | 'taskId' | 'context'> & { prompt: string }) {
    const limit = dto.context?.limit ?? 12;

    if (dto.scope === 'TASK') {
      const task = await this.tasksService.findOne(userId, dto.taskId!);
      const history = await this.history.findByEntity('TASK', dto.taskId!, 8);
      return {
        summary: `Task scoped plan for ${task.title}`,
        payload: {
          task,
          history,
        },
      };
    }

    const lists = await this.prisma.list.findMany({
      where: {
        userId,
        deletedAt: null,
        ...(dto.context?.listIds?.length ? { id: { in: dto.context.listIds } } : {}),
      },
      orderBy: [{ order: 'asc' }, { createdAt: 'asc' }],
      select: {
        id: true,
        name: true,
        isDefault: true,
      },
      take: 20,
    });

    const tasks = await this.prisma.task.findMany({
      where: {
        userId,
        deletedAt: null,
        ...(dto.context?.taskIds?.length ? { id: { in: dto.context.taskIds } } : {}),
        ...(dto.context?.search ? { title: { contains: dto.context.search, mode: 'insensitive' } } : {}),
      },
      orderBy: [{ updatedAt: 'desc' }],
      include: {
        list: { select: { id: true, name: true } },
        subtasks: { orderBy: { createdAt: 'asc' }, select: { id: true, title: true, status: true } },
      },
      take: limit,
    });

    return {
      summary: `Global plan over ${lists.length} lists and ${tasks.length} tasks`,
      payload: {
        lists,
        smartLists: [MY_DAY_SMART_LIST_HINT, ALL_TECH_LIST_HINT],
        protectedLists: [NO_LIST_SYSTEM_HINT],
        reservedVirtualListNames: VIRTUAL_TECH_LIST_NAMES,
        protectedRealListNames: PROTECTED_REAL_LIST_NAMES,
        tasks,
      },
    };
  }

  private async generatePlan(prompt: string, scope: 'GLOBAL' | 'TASK', context: { summary: string; payload: Record<string, unknown> }): Promise<OperationPlan> {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey || apiKey === 'change_me') {
      throw new ServiceUnavailableException('OPENAI_API_KEY is not configured');
    }

    const response = await fetch(OPENAI_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: this.resolveModel(),
        input: [
          {
            role: 'system',
            content: [
              {
                type: 'input_text',
                text: [
                  'You are the TASKA planner operating in safe-mode.',
                  'Return valid JSON only.',
                  'Never claim that changes were applied.',
                  'Generate a plan preview for a task manager.',
                  `Scope: ${scope}`,
                  'Allowed operation types: CREATE_LIST, UPDATE_LIST, CREATE_TASK, UPDATE_TASK, DELETE_TASK, CREATE_SUBTASK, UPDATE_SUBTASK, DELETE_SUBTASK.',
                  'Every operation must have a unique key.',
                  'For fields that are not applicable to an operation, return null.',
                  'Use task object only for task operations, subtask object only for subtask operations, otherwise set them to null.',
                  'Only include operations that are explicitly supported by the provided context.',
                  '"Мой день" / "my day" is a virtual smart list, not a physical list entity in database.',
                  'Never answer that "Мой день" list does not exist.',
                  'When user asks to modify "Мой день", operate on tasks via UPDATE_TASK and deadline changes.',
                  'Do not create or rename a real list for "Мой день".',
                  '"Все" / "all" is a virtual technical list, not a physical list entity in database.',
                  'Do not create or rename a real list for "Все".',
                  '"Без списка" / "no list" is a protected system bucket.',
                  'Do not create or rename list "Без списка".',
                  'When user asks to move task into "Без списка", use UPDATE_TASK and set task.listId to null.',
                ].join('\n'),
              },
            ],
          },
          {
            role: 'user',
            content: [
              {
                type: 'input_text',
                text: JSON.stringify({ prompt, contextSummary: context.summary, context: context.payload }),
              },
            ],
          },
        ],
        text: {
          format: {
            type: 'json_schema',
            name: 'taska_operation_plan',
            schema: {
              type: 'object',
              additionalProperties: false,
              required: ['version', 'scope', 'summary', 'assistantMessage', 'operations', 'warnings'],
              properties: {
                version: { type: 'integer', enum: [1] },
                scope: { type: 'string', enum: ['GLOBAL', 'TASK'] },
                summary: { type: 'string' },
                assistantMessage: { type: 'string' },
                warnings: { type: 'array', items: { type: 'string' } },
                operations: {
                  type: 'array',
                  items: {
                    type: 'object',
                    additionalProperties: false,
                    required: ['type', 'key', 'listId', 'taskId', 'subtaskId', 'name', 'task', 'subtask'],
                    properties: {
                      type: { type: 'string', enum: [...ALLOWED_OPERATION_TYPES] },
                      key: { type: 'string' },
                      listId: { type: ['string', 'null'] },
                      taskId: { type: ['string', 'null'] },
                      subtaskId: { type: ['string', 'null'] },
                      name: { type: ['string', 'null'] },
                      task: {
                        type: ['object', 'null'],
                        additionalProperties: false,
                        required: ['title', 'description', 'priority', 'status', 'deadline', 'listId'],
                        properties: {
                          title: { type: ['string', 'null'] },
                          description: { type: ['string', 'null'] },
                          priority: { type: ['string', 'null'], enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL', null] },
                          status: { type: ['string', 'null'], enum: ['TODO', 'IN_PROGRESS', 'DONE', null] },
                          deadline: { type: ['string', 'null'] },
                          listId: { type: ['string', 'null'] },
                        },
                      },
                      subtask: {
                        type: ['object', 'null'],
                        additionalProperties: false,
                        required: ['title', 'status'],
                        properties: {
                          title: { type: ['string', 'null'] },
                          status: { type: ['string', 'null'], enum: ['TODO', 'IN_PROGRESS', 'DONE', null] },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      }),
    });

    if (!response.ok) {
      const body = await response.text();
      throw new BadGatewayException(`OpenAI planning request failed: ${body}`);
    }

    const body = await response.json() as JsonSchemaResponse;
    const raw = this.extractOutputText(body);
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch (error) {
      throw new BadGatewayException(`OpenAI returned invalid JSON: ${error instanceof Error ? error.message : 'parse error'}`);
    }

    return this.normalizePlan(scope, parsed);
  }

  private normalizePlan(scope: 'GLOBAL' | 'TASK', value: unknown): OperationPlan {
    if (!value || typeof value !== 'object') {
      throw new BadGatewayException('AI plan payload is empty');
    }

    const record = value as Record<string, unknown>;
    const summary = typeof record.summary === 'string' && record.summary.trim().length > 0
      ? record.summary.trim()
      : 'AI plan preview';
    const assistantMessage = typeof record.assistantMessage === 'string' && record.assistantMessage.trim().length > 0
      ? record.assistantMessage.trim()
      : summary;
    const warnings = Array.isArray(record.warnings)
      ? record.warnings.filter((warning): warning is string => typeof warning === 'string' && warning.trim().length > 0)
      : [];
    const operations = Array.isArray(record.operations)
      ? record.operations.map((item, index) => this.normalizeOperation(item, index))
      : [];

    return {
      version: 1,
      scope,
      summary,
      assistantMessage,
      operations,
      warnings,
    };
  }

  private normalizeOperation(value: unknown, index: number): PlanOperation {
    if (!value || typeof value !== 'object') {
      throw new BadGatewayException(`AI plan operation #${index + 1} is invalid`);
    }

    const record = value as Record<string, unknown>;
    const type = typeof record.type === 'string' ? record.type.toUpperCase() as AllowedOperationType : null;
    if (!type || !ALLOWED_OPERATION_TYPES.includes(type)) {
      throw new BadGatewayException(`AI plan operation #${index + 1} uses unsupported type`);
    }

    const key = typeof record.key === 'string' && record.key.trim().length > 0 ? record.key.trim() : `op_${index + 1}`;
    return this.omitUndefined({
      type,
      key,
      listId: typeof record.listId === 'string' ? record.listId : undefined,
      taskId: typeof record.taskId === 'string' ? record.taskId : undefined,
      subtaskId: typeof record.subtaskId === 'string' ? record.subtaskId : undefined,
      name: typeof record.name === 'string' ? record.name : undefined,
      task: this.normalizeTaskPatch(record.task),
      subtask: this.normalizeSubtaskPatch(record.subtask),
    }) as PlanOperation;
  }

  private normalizeTaskPatch(value: unknown): PlanTaskPatch | undefined {
    if (!value || typeof value !== 'object') {
      return undefined;
    }
    const record = value as Record<string, unknown>;
    return this.omitUndefined({
      title: typeof record.title === 'string' ? record.title : undefined,
      description: typeof record.description === 'string' ? record.description : undefined,
      priority: typeof record.priority === 'string' ? record.priority as TaskPriority : undefined,
      status: typeof record.status === 'string' ? record.status as TaskStatus : undefined,
      deadline: typeof record.deadline === 'string' ? record.deadline : record.deadline === null ? null : undefined,
      listId: typeof record.listId === 'string' ? record.listId : record.listId === null ? null : undefined,
    }) as PlanTaskPatch;
  }

  private normalizeSubtaskPatch(value: unknown): PlanSubtaskPatch | undefined {
    if (!value || typeof value !== 'object') {
      return undefined;
    }
    const record = value as Record<string, unknown>;
    return this.omitUndefined({
      title: typeof record.title === 'string' ? record.title : undefined,
      status: typeof record.status === 'string' ? record.status as TaskStatus : undefined,
    }) as PlanSubtaskPatch;
  }

  private async findOwnedOperation(userId: string, operationId: string) {
    const operation = await this.prisma.aiOperation.findFirst({
      where: { id: operationId, userId },
    });
    if (!operation) {
      throw new NotFoundException('AI operation not found');
    }
    return operation;
  }

  private readPlan(scope: AiOperationScope, value: Prisma.JsonValue): OperationPlan {
    return this.normalizePlan(scope, value);
  }

  private asJson(value: unknown): Prisma.InputJsonValue {
    return value as unknown as Prisma.InputJsonValue;
  }

  private omitUndefined<T extends Record<string, unknown>>(value: T): T {
    return Object.fromEntries(Object.entries(value).filter(([, entry]) => entry !== undefined)) as T;
  }

  private buildCreateTaskInput(task: PlanTaskPatch): {
    title: string;
    description?: string;
    priority?: TaskPriority;
    deadline?: string;
    listId?: string;
  } {
    if (!task.title) {
      throw new BadRequestException('CREATE_TASK requires task.title');
    }

    const payload: {
      title: string;
      description?: string;
      priority?: TaskPriority;
      deadline?: string;
      listId?: string;
    } = { title: task.title };

    if (task.description !== undefined) payload.description = task.description;
    if (task.priority !== undefined) payload.priority = task.priority;
    if (typeof task.deadline === 'string') payload.deadline = task.deadline;
    if (typeof task.listId === 'string') payload.listId = task.listId;

    return payload;
  }

  private buildUpdateTaskInput(task: PlanTaskPatch): {
    title?: string;
    description?: string;
    priority?: TaskPriority;
    status?: TaskStatus;
    deadline?: string | null;
    listId?: string | null;
  } {
    const payload: {
      title?: string;
      description?: string;
      priority?: TaskPriority;
      status?: TaskStatus;
      deadline?: string | null;
      listId?: string | null;
    } = {};

    if (task.title !== undefined) payload.title = task.title;
    if (task.description !== undefined) payload.description = task.description;
    if (task.priority !== undefined) payload.priority = task.priority;
    if (task.status !== undefined) payload.status = task.status;
    if (task.deadline !== undefined) payload.deadline = task.deadline;
    if (task.listId !== undefined) payload.listId = task.listId;

    return payload;
  }

  private buildUpdateSubtaskInput(subtask: PlanSubtaskPatch): { title?: string; status?: TaskStatus } {
    const payload: { title?: string; status?: TaskStatus } = {};
    if (subtask.title !== undefined) payload.title = subtask.title;
    if (subtask.status !== undefined) payload.status = subtask.status;
    return payload;
  }

  private buildTaskUndoUpdate(previous: Record<string, unknown>) {
    const payload = this.omitUndefined({
      title: typeof previous.title === 'string' ? previous.title : undefined,
      description: typeof previous.description === 'string' ? previous.description : previous.description === null ? null : undefined,
      priority: typeof previous.priority === 'string' ? previous.priority as TaskPriority : undefined,
      status: typeof previous.status === 'string' ? previous.status as TaskStatus : undefined,
      deadline: typeof previous.deadline === 'string' ? new Date(previous.deadline) : previous.deadline === null ? null : undefined,
      deletedAt: previous.deletedAt === null ? null : typeof previous.deletedAt === 'string' ? new Date(previous.deletedAt) : undefined,
    }) as Prisma.TaskUncheckedUpdateManyInput;

    if (typeof previous.listId === 'string') {
      payload.listId = previous.listId;
    } else if (previous.listId === null) {
      payload.listId = null;
    }

    return payload;
  }

  private toRecord(value: Prisma.JsonValue | null): Record<string, unknown> | null {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      return null;
    }
    return value as Record<string, unknown>;
  }

  private extractOutputText(body: JsonSchemaResponse): string {
    if (typeof body.output_text === 'string' && body.output_text.trim().length > 0) {
      return body.output_text;
    }

    for (const item of body.output ?? []) {
      if ('text' in item && typeof item.text === 'string' && item.text.trim().length > 0) {
        return item.text;
      }
      if ('content' in item && Array.isArray(item.content)) {
        const textPart = item.content.find((part) => typeof part.text === 'string' && part.text.trim().length > 0);
        if (textPart?.text) {
          return textPart.text;
        }
      }
    }

    throw new BadGatewayException('OpenAI response does not contain output text');
  }

  private resolveModel(): string {
    return process.env.OPENAI_MODEL_PLAN?.trim() || process.env.OPENAI_MODEL_CHAT?.trim() || DEFAULT_CHAT_MODEL;
  }
}
