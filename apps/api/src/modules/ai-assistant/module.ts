import { Module } from '@nestjs/common';

import { HistoryModule } from '../history/module.js';
import { ListsModule } from '../lists/module.js';
import { SubtasksModule } from '../subtasks/module.js';
import { TasksModule } from '../tasks/module.js';
import { AiAssistantController } from './controller.js';
import { AiAssistantService } from './ai-assistant.service.js';

@Module({
  imports: [HistoryModule, ListsModule, TasksModule, SubtasksModule],
  controllers: [AiAssistantController],
  providers: [AiAssistantService],
  exports: [AiAssistantService],
})
export class AiAssistantModule {}
