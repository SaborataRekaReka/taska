import { Module } from '@nestjs/common';

import { ListsController } from './controller.js';

@Module({
  controllers: [ListsController],
})
export class ListsModule {}
