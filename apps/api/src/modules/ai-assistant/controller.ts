import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';

import { JwtAuthGuard } from '../../core/auth.guard.js';
import { CurrentUserId } from '../../core/user.decorator.js';
import {
  ConfirmAiOperationDto,
  CreateAiPlanDto,
  ListAiOperationsQueryDto,
  ReviseAiPlanDto,
  UpdateAiAdminConfigDto,
  UndoAiOperationDto,
} from './dto.js';
import { AiAssistantService } from './ai-assistant.service.js';

@ApiTags('ai')
@Controller('ai')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class AiAssistantController {
  constructor(private readonly aiAssistantService: AiAssistantService) {}

  @Post('plan')
  @ApiOperation({ summary: 'Create a safe-mode AI plan preview' })
  createPlan(@CurrentUserId() userId: string, @Body() dto: CreateAiPlanDto) {
    return this.aiAssistantService.createPlan(userId, dto);
  }

  @Post('operations/:id/revise')
  @ApiOperation({ summary: 'Revise a pending AI plan before confirmation' })
  revisePlan(
    @CurrentUserId() userId: string,
    @Param('id') operationId: string,
    @Body() dto: ReviseAiPlanDto,
  ) {
    return this.aiAssistantService.revisePlan(userId, operationId, dto);
  }

  @Get('operations')
  @ApiOperation({ summary: 'List AI operations for current user' })
  @ApiQuery({ name: 'status', required: false, enum: ['PLANNED', 'CONFIRMED', 'EXECUTED', 'UNDONE', 'FAILED'] })
  @ApiQuery({ name: 'scope', required: false, enum: ['GLOBAL', 'TASK'] })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  listOperations(
    @CurrentUserId() userId: string,
    @Query() query: ListAiOperationsQueryDto,
  ) {
    return this.aiAssistantService.listOperations(userId, query);
  }

  @Get('operations/:id')
  @ApiOperation({ summary: 'Get details for a single AI operation' })
  getOperation(@CurrentUserId() userId: string, @Param('id') operationId: string) {
    return this.aiAssistantService.getOperation(userId, operationId);
  }

  @Post('operations/:id/confirm')
  @ApiOperation({ summary: 'Confirm a planned AI operation before execution' })
  confirmOperation(
    @CurrentUserId() userId: string,
    @Param('id') operationId: string,
    @Body() dto: ConfirmAiOperationDto,
  ) {
    return this.aiAssistantService.confirmOperation(userId, operationId, dto.note);
  }

  @Post('operations/:id/execute')
  @ApiOperation({ summary: 'Execute a confirmed AI operation' })
  executeOperation(@CurrentUserId() userId: string, @Param('id') operationId: string) {
    return this.aiAssistantService.executeOperation(userId, operationId);
  }

  @Post('operations/:id/undo')
  @ApiOperation({ summary: 'Undo an executed AI operation' })
  undoOperation(
    @CurrentUserId() userId: string,
    @Param('id') operationId: string,
    @Body() dto: UndoAiOperationDto,
  ) {
    return this.aiAssistantService.undoOperation(userId, operationId, dto.reason);
  }

  @Get('health')
  @ApiOperation({ summary: 'AI assistant module health' })
  getHealth(): { module: string; status: string } {
    return { module: 'ai-assistant', status: 'active' };
  }

  @Get('runtime')
  @ApiOperation({ summary: 'AI assistant runtime information and capability flags' })
  getRuntime() {
    return this.aiAssistantService.getRuntime();
  }

  @Get('admin/config')
  @ApiOperation({ summary: 'Get persisted AI admin config for current user' })
  getAdminConfig(@CurrentUserId() userId: string) {
    return this.aiAssistantService.getAdminConfig(userId);
  }

  @Patch('admin/config')
  @ApiOperation({ summary: 'Update persisted AI admin config for current user' })
  updateAdminConfig(
    @CurrentUserId() userId: string,
    @Body() dto: UpdateAiAdminConfigDto,
  ) {
    return this.aiAssistantService.updateAdminConfig(userId, dto);
  }
}
