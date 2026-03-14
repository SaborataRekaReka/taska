import { Module } from '@nestjs/common';

import { AuthController } from './controller.js';

@Module({
  controllers: [AuthController],
})
export class AuthModule {}
