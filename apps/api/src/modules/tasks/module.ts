import { Module } from '@nestjs/common';

import { HistoryModule } from '../history/module.js';
import { TasksController } from './controller.js';
import { TasksService } from './tasks.service.js';

@Module({
  imports: [HistoryModule],
  controllers: [TasksController],
  providers: [TasksService],
  exports: [TasksService],
})
export class TasksModule {}
