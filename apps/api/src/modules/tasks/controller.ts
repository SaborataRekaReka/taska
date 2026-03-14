import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiTags, ApiBearerAuth } from '@nestjs/swagger';

import { JwtAuthGuard } from '../../core/auth.guard.js';
import { CurrentUserId } from '../../core/user.decorator.js';
import { TasksService } from './tasks.service.js';
import { CreateTaskDto, UpdateTaskDto, TaskQueryDto } from './dto.js';

@ApiTags('tasks')
@Controller('tasks')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  @Get()
  @ApiOperation({ summary: 'Get tasks with optional filters' })
  findAll(@CurrentUserId() userId: string, @Query() query: TaskQueryDto) {
    return this.tasksService.findAll(userId, {
      listId: query.listId,
      status: query.status,
      priority: query.priority,
      dueToday: query.dueToday === 'true',
      noList: query.noList === 'true',
      search: query.search,
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a single task by ID' })
  findOne(@CurrentUserId() userId: string, @Param('id') id: string) {
    return this.tasksService.findOne(userId, id);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new task' })
  create(@CurrentUserId() userId: string, @Body() dto: CreateTaskDto) {
    return this.tasksService.create(userId, dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a task' })
  update(
    @CurrentUserId() userId: string,
    @Param('id') id: string,
    @Body() dto: UpdateTaskDto,
  ) {
    return this.tasksService.update(userId, id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Soft-delete a task' })
  remove(@CurrentUserId() userId: string, @Param('id') id: string) {
    return this.tasksService.remove(userId, id);
  }

  @Get('health')
  @ApiOperation({ summary: 'Tasks module health' })
  getHealth() {
    return { module: 'tasks', status: 'active' };
  }
}
