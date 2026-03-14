import { Module } from '@nestjs/common';

import { HistoryModule } from '../history/module.js';
import { ListsController } from './controller.js';
import { ListsService } from './lists.service.js';

@Module({
  imports: [HistoryModule],
  controllers: [ListsController],
  providers: [ListsService],
  exports: [ListsService],
})
export class ListsModule {}
