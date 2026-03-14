import { Module } from '@nestjs/common';

import { TasksController } from './controller.js';

@Module({
  controllers: [TasksController],
})
export class TasksModule {}
