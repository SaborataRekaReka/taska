import { Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma, TaskPriority, TaskStatus } from '@prisma/client';

import { PrismaService } from '../../core/prisma.service.js';
import { HistoryService } from '../history/history.service.js';

interface TaskFilters {
  listId?: string | undefined;
  status?: string | undefined;
  priority?: string | undefined;
  dueToday?: boolean | undefined;
  noList?: boolean | undefined;
  search?: string | undefined;
  urgency?: 'OVERDUE' | 'TODAY' | 'NEXT_24_HOURS' | undefined;
}

@Injectable()
export class TasksService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly history: HistoryService,
  ) {}

  async findAll(userId: string, filters: TaskFilters) {
    const where: Prisma.TaskWhereInput = { userId, deletedAt: null };

    if (filters.listId) {
      where.listId = filters.listId;
    }
    if (filters.noList) {
      where.listId = null;
    }
    if (filters.status) {
      where.status = filters.status as TaskStatus;
    }
    if (filters.priority) {
      where.priority = filters.priority as TaskPriority;
    }
    if (filters.dueToday) {
      const start = new Date();
      start.setHours(0, 0, 0, 0);
      const end = new Date();
      end.setHours(23, 59, 59, 999);
      where.deadline = { gte: start, lte: end };
    }
    if (filters.urgency) {
      const now = new Date();
      if (filters.urgency === 'OVERDUE') {
        where.deadline = { lt: now };
        where.status = { not: 'DONE' };
      } else if (filters.urgency === 'TODAY') {
        const start = new Date();
        start.setHours(0, 0, 0, 0);
        const end = new Date();
        end.setHours(23, 59, 59, 999);
        where.deadline = { gte: start, lte: end };
      } else if (filters.urgency === 'NEXT_24_HOURS') {
        const end = new Date(now.getTime() + 24 * 60 * 60 * 1000);
        where.deadline = { gte: now, lte: end };
      }
    }
    if (filters.search) {
      where.title = { contains: filters.search, mode: 'insensitive' };
    }

    return this.prisma.task.findMany({
      where,
      orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
      include: {
        subtasks: { orderBy: { createdAt: 'asc' } },
        list: { select: { id: true, name: true } },
      },
    });
  }

  async findOne(userId: string, taskId: string) {
    const task = await this.prisma.task.findFirst({
      where: { id: taskId, userId, deletedAt: null },
      include: {
        subtasks: { orderBy: { createdAt: 'asc' } },
        list: { select: { id: true, name: true } },
      },
    });
    if (!task) throw new NotFoundException('Task not found');
    return task;
  }

  async create(userId: string, data: {
    title: string;
    description?: string;
    priority?: TaskPriority;
    deadline?: string;
    listId?: string;
  }) {
    const task = await this.prisma.task.create({
      data: {
        userId,
        title: data.title,
        description: data.description ?? null,
        priority: (data.priority as TaskPriority) ?? 'MEDIUM',
        deadline: data.deadline ? new Date(data.deadline) : null,
        listId: data.listId ?? null,
      },
      include: {
        subtasks: true,
        list: { select: { id: true, name: true } },
      },
    });

    await this.history.record({
      userId,
      entityType: 'TASK',
      entityId: task.id,
      actionType: 'CREATED',
      payload: { title: task.title, listId: task.listId, priority: task.priority },
    });

    return task;
  }

  async update(userId: string, taskId: string, data: {
    title?: string;
    description?: string;
    priority?: TaskPriority;
    status?: TaskStatus;
    deadline?: string;
    listId?: string | null;
  }) {
    await this.findOwned(userId, taskId);

    const updateData: Prisma.TaskUpdateInput = {};
    if (data.title !== undefined) updateData.title = data.title;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.priority !== undefined) updateData.priority = data.priority;
    if (data.status !== undefined) updateData.status = data.status;
    if (data.deadline !== undefined) updateData.deadline = data.deadline ? new Date(data.deadline) : null;
    if (data.listId !== undefined) {
      updateData.list = data.listId ? { connect: { id: data.listId } } : { disconnect: true };
    }

    const task = await this.prisma.task.update({
      where: { id: taskId },
      data: updateData,
      include: {
        subtasks: { orderBy: { createdAt: 'asc' } },
        list: { select: { id: true, name: true } },
      },
    });

    await this.history.record({
      userId,
      entityType: 'TASK',
      entityId: task.id,
      actionType: 'UPDATED',
      payload: data as Record<string, unknown>,
    });

    return task;
  }

  async remove(userId: string, taskId: string) {
    const task = await this.findOwned(userId, taskId);

    const deleted = await this.prisma.task.update({
      where: { id: taskId },
      data: { deletedAt: new Date() },
    });

    await this.history.record({
      userId,
      entityType: 'TASK',
      entityId: task.id,
      actionType: 'DELETED',
      payload: { title: task.title },
    });

    return deleted;
  }

  private async findOwned(userId: string, taskId: string) {
    const task = await this.prisma.task.findFirst({
      where: { id: taskId, userId, deletedAt: null },
    });
    if (!task) throw new NotFoundException('Task not found');
    return task;
  }
}
