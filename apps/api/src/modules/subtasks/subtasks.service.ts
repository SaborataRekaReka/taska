import { Injectable, NotFoundException } from '@nestjs/common';
import type { TaskStatus } from '@prisma/client';

import { PrismaService } from '../../core/prisma.service.js';
import { HistoryService } from '../history/history.service.js';

@Injectable()
export class SubtasksService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly history: HistoryService,
  ) {}

  async findAll(userId: string, taskId: string) {
    await this.ensureTaskOwned(userId, taskId);
    return this.prisma.subtask.findMany({
      where: { taskId, userId },
      orderBy: { createdAt: 'asc' },
    });
  }

  async create(userId: string, taskId: string, title: string) {
    await this.ensureTaskOwned(userId, taskId);

    const subtask = await this.prisma.subtask.create({
      data: { userId, taskId, title },
    });

    await this.history.record({
      userId,
      entityType: 'SUBTASK',
      entityId: subtask.id,
      actionType: 'CREATED',
      payload: { taskId, title },
    });

    return subtask;
  }

  async update(userId: string, taskId: string, subtaskId: string, data: {
    title?: string;
    status?: TaskStatus;
  }) {
    await this.ensureTaskOwned(userId, taskId);
    const subtask = await this.findOwned(userId, taskId, subtaskId);

    const updated = await this.prisma.subtask.update({
      where: { id: subtask.id },
      data,
    });

    await this.history.record({
      userId,
      entityType: 'SUBTASK',
      entityId: subtask.id,
      actionType: 'UPDATED',
      payload: data as Record<string, unknown>,
    });

    return updated;
  }

  async remove(userId: string, taskId: string, subtaskId: string) {
    await this.ensureTaskOwned(userId, taskId);
    const subtask = await this.findOwned(userId, taskId, subtaskId);

    await this.prisma.subtask.delete({ where: { id: subtask.id } });

    await this.history.record({
      userId,
      entityType: 'SUBTASK',
      entityId: subtask.id,
      actionType: 'DELETED',
      payload: { title: subtask.title, taskId },
    });

    return { deleted: true };
  }

  private async ensureTaskOwned(userId: string, taskId: string) {
    const task = await this.prisma.task.findFirst({
      where: { id: taskId, userId, deletedAt: null },
    });
    if (!task) throw new NotFoundException('Task not found');
    return task;
  }

  private async findOwned(userId: string, taskId: string, subtaskId: string) {
    const subtask = await this.prisma.subtask.findFirst({
      where: { id: subtaskId, taskId, userId },
    });
    if (!subtask) throw new NotFoundException('Subtask not found');
    return subtask;
  }
}
