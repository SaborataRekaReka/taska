import { Injectable, NotFoundException, ForbiddenException, ConflictException, BadRequestException } from '@nestjs/common';

import { PrismaService } from '../../core/prisma.service.js';
import { HistoryService } from '../history/history.service.js';
import { isProtectedRealListName, isReservedSystemListName } from './list.constants.js';

@Injectable()
export class ListsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly history: HistoryService,
  ) {}

  async findAll(userId: string) {
    return this.prisma.list.findMany({
      where: { userId, deletedAt: null },
      orderBy: [{ order: 'asc' }, { createdAt: 'asc' }],
      include: { _count: { select: { tasks: { where: { deletedAt: null } } } } },
    });
  }

  async reorder(userId: string, orderedIds: string[]) {
    const updates = orderedIds.map((id, index) =>
      this.prisma.list.updateMany({
        where: { id, userId, deletedAt: null },
        data: { order: index },
      }),
    );
    await this.prisma.$transaction(updates);
    return this.findAll(userId);
  }

  async create(userId: string, name: string) {
    const nextName = name.trim();
    if (!nextName) {
      throw new BadRequestException('List name cannot be empty');
    }
    if (isReservedSystemListName(nextName)) {
      throw new ForbiddenException('Cannot create a reserved system list');
    }

    const existing = await this.prisma.list.findUnique({
      where: { userId_name: { userId, name: nextName } },
    });
    if (existing && !existing.deletedAt) {
      throw new ConflictException(`List "${nextName}" already exists`);
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
        payload: { name: nextName },
      });
      return restored;
    }

    const list = await this.prisma.list.create({
      data: { userId, name: nextName },
    });
    await this.history.record({
      userId,
      entityType: 'LIST',
      entityId: list.id,
      actionType: 'CREATED',
      payload: { name: nextName },
    });
    return list;
  }

  async update(userId: string, listId: string, name: string) {
    const list = await this.findOwnedList(userId, listId);
    const nextName = name.trim();
    if (!nextName) {
      throw new BadRequestException('List name cannot be empty');
    }
    if (isProtectedRealListName(list.name) && nextName !== list.name) {
      throw new ForbiddenException('Cannot rename a protected list');
    }
    if (isReservedSystemListName(nextName) && nextName !== list.name) {
      throw new ForbiddenException('Cannot rename list to a reserved system list');
    }
    if (nextName === list.name) {
      return list;
    }

    const updated = await this.prisma.list.update({
      where: { id: list.id },
      data: { name: nextName },
    });
    await this.history.record({
      userId,
      entityType: 'LIST',
      entityId: list.id,
      actionType: 'UPDATED',
      payload: { oldName: list.name, newName: nextName },
    });
    return updated;
  }

  async remove(userId: string, listId: string) {
    const list = await this.findOwnedList(userId, listId);

    if (isProtectedRealListName(list.name)) {
      throw new ForbiddenException('Cannot delete a protected list');
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
