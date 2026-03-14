import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

@ApiTags('history')
@Controller('history')
export class HistoryController {
  @Get('health')
  @ApiOperation({ summary: 'History module health' })
  getHealth(): { module: string; status: string } {
    return { module: 'history', status: 'planned' };
  }
}
