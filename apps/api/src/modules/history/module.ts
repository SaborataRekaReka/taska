import { Module } from '@nestjs/common';

import { HistoryController } from './controller.js';

@Module({
  controllers: [HistoryController],
})
export class HistoryModule {}
