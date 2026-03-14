import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

@ApiTags('subtasks')
@Controller('subtasks')
export class SubtasksController {
  @Get('health')
  @ApiOperation({ summary: 'Subtasks module health' })
  getHealth(): { module: string; status: string } {
    return { module: 'subtasks', status: 'planned' };
  }
}
