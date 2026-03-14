import { Module } from '@nestjs/common';

import { AiAssistantController } from './controller.js';

@Module({
  controllers: [AiAssistantController],
})
export class AiAssistantModule {}
