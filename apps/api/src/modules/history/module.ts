import { Module } from '@nestjs/common';

import { HistoryController } from './controller.js';
import { HistoryService } from './history.service.js';

@Module({
  controllers: [HistoryController],
  providers: [HistoryService],
  exports: [HistoryService],
})
export class HistoryModule {}
