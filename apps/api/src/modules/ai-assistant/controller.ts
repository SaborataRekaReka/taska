import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { JwtAuthGuard } from '../../core/auth.guard.js';
import { CurrentUserId } from '../../core/user.decorator.js';
import {
  ConfirmAiOperationDto,
  CreateAiPlanDto,
  ReviseAiPlanDto,
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
}
