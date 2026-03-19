import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiTags, ApiBearerAuth } from '@nestjs/swagger';

import { JwtAuthGuard } from '../../core/auth.guard.js';
import { CurrentUserId } from '../../core/user.decorator.js';
import { ListsService } from './lists.service.js';
import { CreateListDto, UpdateListDto, ReorderListsDto } from './dto.js';

@ApiTags('lists')
@Controller('lists')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ListsController {
  constructor(private readonly listsService: ListsService) {}

  @Get()
  @ApiOperation({ summary: 'Get all lists for current user' })
  findAll(@CurrentUserId() userId: string) {
    return this.listsService.findAll(userId);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new list' })
  create(@CurrentUserId() userId: string, @Body() dto: CreateListDto) {
    return this.listsService.create(userId, dto.name);
  }

  @Patch('reorder')
  @ApiOperation({ summary: 'Reorder lists' })
  reorder(@CurrentUserId() userId: string, @Body() dto: ReorderListsDto) {
    return this.listsService.reorder(userId, dto.orderedIds);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update list name' })
  update(
    @CurrentUserId() userId: string,
    @Param('id') id: string,
    @Body() dto: UpdateListDto,
  ) {
    if (dto.name) {
      return this.listsService.update(userId, id, dto.name);
    }
    return this.listsService.findAll(userId);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Soft-delete a list (tasks moved to no-list)' })
  remove(@CurrentUserId() userId: string, @Param('id') id: string) {
    return this.listsService.remove(userId, id);
  }

  @Get('health')
  @ApiOperation({ summary: 'Lists module health' })
  getHealth() {
    return { module: 'lists', status: 'active' };
  }
}
