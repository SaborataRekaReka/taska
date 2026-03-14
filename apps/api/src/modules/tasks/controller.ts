import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

@ApiTags('tasks')
@Controller('tasks')
export class TasksController {
  @Get('health')
  @ApiOperation({ summary: 'Tasks module health' })
  getHealth(): { module: string; status: string } {
    return { module: 'tasks', status: 'planned' };
  }
}
