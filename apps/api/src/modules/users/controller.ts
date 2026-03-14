import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

@ApiTags('users')
@Controller('users')
export class UsersController {
  @Get('health')
  @ApiOperation({ summary: 'Users module health' })
  getHealth(): { module: string; status: string } {
    return { module: 'users', status: 'planned' };
  }
}
