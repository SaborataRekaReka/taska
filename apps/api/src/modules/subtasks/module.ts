import { Module } from '@nestjs/common';

import { HistoryModule } from '../history/module.js';
import { SubtasksController } from './controller.js';
import { SubtasksService } from './subtasks.service.js';

@Module({
  imports: [HistoryModule],
  controllers: [SubtasksController],
  providers: [SubtasksService],
  exports: [SubtasksService],
})
export class SubtasksModule {}
