import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiTags, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import type { HistoryEntityType } from '@prisma/client';

import { JwtAuthGuard } from '../../core/auth.guard.js';
import { CurrentUserId } from '../../core/user.decorator.js';
import { HistoryService } from './history.service.js';

@ApiTags('history')
@Controller('history')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class HistoryController {
  constructor(private readonly historyService: HistoryService) {}

  @Get()
  @ApiOperation({ summary: 'Get history events for current user' })
  @ApiQuery({ name: 'entityType', required: false, enum: ['LIST', 'TASK', 'SUBTASK', 'AI_OPERATION'] })
  @ApiQuery({ name: 'entityId', required: false })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  findAll(
    @CurrentUserId() userId: string,
    @Query('entityType') entityType?: string,
    @Query('entityId') entityId?: string,
    @Query('limit') limit?: string,
  ) {
    const take = limit ? Math.min(Number(limit), 100) : 50;

    if (entityType && entityId) {
      return this.historyService.findByEntity(
        entityType as HistoryEntityType,
        entityId,
        take,
      );
    }

    return this.historyService.findByUser(userId, take);
  }

  @Get('health')
  @ApiOperation({ summary: 'History module health' })
  getHealth() {
    return { module: 'history', status: 'active' };
  }
}
