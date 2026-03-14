import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  @Get('health')
  @ApiOperation({ summary: 'Auth module health' })
  getHealth(): { module: string; status: string } {
    return { module: 'auth', status: 'planned' };
  }
}
