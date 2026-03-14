import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

@ApiTags('ai-assistant')
@Controller('ai-assistant')
export class AiAssistantController {
  @Get('health')
  @ApiOperation({ summary: 'AI assistant module health' })
  getHealth(): { module: string; status: string } {
    return { module: 'ai-assistant', status: 'planned' };
  }
}
