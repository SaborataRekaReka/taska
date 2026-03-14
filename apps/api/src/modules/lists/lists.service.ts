import { Injectable, NotFoundException, ForbiddenException, ConflictException } from '@nestjs/common';

import { PrismaService } from '../../core/prisma.service.js';
import { HistoryService } from '../history/history.service.js';

@Injectable()
export class ListsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly history: HistoryService,
  ) {}

  async findAll(userId: string) {
    return this.prisma.list.findMany({
      where: { userId, deletedAt: null },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'asc' }],
      include: { _count: { select: { tasks: { where: { deletedAt: null } } } } },
    });
  }

  async create(userId: string, name: string) {
    const existing = await this.prisma.list.findUnique({
      where: { userId_name: { userId, name } },
    });
    if (existing && !existing.deletedAt) {
      throw new ConflictException(`List "${name}" already exists`);
    }

    if (existing?.deletedAt) {
      const restored = await this.prisma.list.update({
        where: { id: existing.id },
        data: { deletedAt: null },
      });
      await this.history.record({
        userId,
        entityType: 'LIST',
        entityId: restored.id,
        actionType: 'RESTORED',
        payload: { name },
      });
      return restored;
    }

    const list = await this.prisma.list.create({
      data: { userId, name },
    });
    await this.history.record({
      userId,
      entityType: 'LIST',
      entityId: list.id,
      actionType: 'CREATED',
      payload: { name },
    });
    return list;
  }

  async update(userId: string, listId: string, name: string) {
    const list = await this.findOwnedList(userId, listId);
    const updated = await this.prisma.list.update({
      where: { id: list.id },
      data: { name },
    });
    await this.history.record({
      userId,
      entityType: 'LIST',
      entityId: list.id,
      actionType: 'UPDATED',
      payload: { oldName: list.name, newName: name },
    });
    return updated;
  }

  async remove(userId: string, listId: string) {
    const list = await this.findOwnedList(userId, listId);

    if (list.isDefault) {
      throw new ForbiddenException('Cannot delete a default list');
    }

    const deleted = await this.prisma.list.update({
      where: { id: list.id },
      data: { deletedAt: new Date() },
    });

    await this.prisma.task.updateMany({
      where: { listId: list.id, deletedAt: null },
      data: { listId: null },
    });

    await this.history.record({
      userId,
      entityType: 'LIST',
      entityId: list.id,
      actionType: 'DELETED',
      payload: { name: list.name },
    });

    return deleted;
  }

  private async findOwnedList(userId: string, listId: string) {
    const list = await this.prisma.list.findFirst({
      where: { id: listId, userId, deletedAt: null },
    });
    if (!list) {
      throw new NotFoundException('List not found');
    }
    return list;
  }
}
