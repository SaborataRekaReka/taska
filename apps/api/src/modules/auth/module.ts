import { Module } from '@nestjs/common';

import { AuthController } from './controller.js';
import { AuthService } from './auth.service.js';
import { GoogleOAuthService } from './google/google-oauth.service.js';

@Module({
  controllers: [AuthController],
  providers: [AuthService, GoogleOAuthService],
  exports: [AuthService, GoogleOAuthService],
})
export class AuthModule {}
