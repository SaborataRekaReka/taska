import { Module } from '@nestjs/common';

import { SubtasksController } from './controller.js';

@Module({
  controllers: [SubtasksController],
})
export class SubtasksModule {}
