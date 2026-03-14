import { Injectable } from '@nestjs/common';
import type { HistoryEntityType, HistoryActionType } from '@prisma/client';

import { PrismaService } from '../../core/prisma.service.js';

@Injectable()
export class HistoryService {
  constructor(private readonly prisma: PrismaService) {}

  async record(params: {
    userId: string;
    entityType: HistoryEntityType;
    entityId: string;
    actionType: HistoryActionType;
    payload: Record<string, unknown>;
  }) {
    return this.prisma.history.create({
      data: {
        userId: params.userId,
        entityType: params.entityType,
        entityId: params.entityId,
        actionType: params.actionType,
        payload: params.payload as object,
      },
    });
  }

  async findByEntity(entityType: HistoryEntityType, entityId: string, limit = 20) {
    return this.prisma.history.findMany({
      where: { entityType, entityId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  async findByUser(userId: string, limit = 50) {
    return this.prisma.history.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }
}
