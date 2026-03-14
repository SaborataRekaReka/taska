import { Module } from '@nestjs/common';

import { UsersController } from './controller.js';

@Module({
  controllers: [UsersController],
})
export class UsersModule {}
