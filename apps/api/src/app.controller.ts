import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

import { moduleRegistry } from './modules/registry.js';

@ApiTags('system')
@Controller()
export class AppController {
  @Get('health')
  @ApiOperation({ summary: 'Service health check' })
  getHealth(): { ok: boolean; service: string; architecture: string; modules: readonly string[] } {
    return {
      ok: true,
      service: 'taska-api',
      architecture: 'nestjs-fastify',
      modules: moduleRegistry,
    };
  }
}
