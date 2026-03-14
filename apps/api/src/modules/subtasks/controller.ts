import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiTags, ApiBearerAuth } from '@nestjs/swagger';

import { JwtAuthGuard } from '../../core/auth.guard.js';
import { CurrentUserId } from '../../core/user.decorator.js';
import { SubtasksService } from './subtasks.service.js';
import { CreateSubtaskDto, UpdateSubtaskDto } from './dto.js';

@ApiTags('subtasks')
@Controller('tasks/:taskId/subtasks')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class SubtasksController {
  constructor(private readonly subtasksService: SubtasksService) {}

  @Get()
  @ApiOperation({ summary: 'Get all subtasks for a task' })
  findAll(@CurrentUserId() userId: string, @Param('taskId') taskId: string) {
    return this.subtasksService.findAll(userId, taskId);
  }

  @Post()
  @ApiOperation({ summary: 'Create a subtask' })
  create(
    @CurrentUserId() userId: string,
    @Param('taskId') taskId: string,
    @Body() dto: CreateSubtaskDto,
  ) {
    return this.subtasksService.create(userId, taskId, dto.title);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a subtask' })
  update(
    @CurrentUserId() userId: string,
    @Param('taskId') taskId: string,
    @Param('id') id: string,
    @Body() dto: UpdateSubtaskDto,
  ) {
    return this.subtasksService.update(userId, taskId, id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a subtask' })
  remove(
    @CurrentUserId() userId: string,
    @Param('taskId') taskId: string,
    @Param('id') id: string,
  ) {
    return this.subtasksService.remove(userId, taskId, id);
  }

  @Get('health')
  @ApiOperation({ summary: 'Subtasks module health' })
  getHealth() {
    return { module: 'subtasks', status: 'active' };
  }
}
