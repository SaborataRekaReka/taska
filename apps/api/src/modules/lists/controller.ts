import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

@ApiTags('lists')
@Controller('lists')
export class ListsController {
  @Get('health')
  @ApiOperation({ summary: 'Lists module health' })
  getHealth(): { module: string; status: string } {
    return { module: 'lists', status: 'planned' };
  }
}
