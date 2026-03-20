import { Body, Controller, Get, Post, Query, Res, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import type { FastifyReply } from 'fastify';

import { JwtAuthGuard } from '../../core/auth.guard.js';
import { CurrentUserId } from '../../core/user.decorator.js';
import { AuthService } from './auth.service.js';
import { GoogleOAuthService } from './google/google-oauth.service.js';
import { LoginDto, RefreshDto, RegisterDto } from './dto.js';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly googleOAuthService: GoogleOAuthService,
  ) {}

  @Post('register')
  @ApiOperation({ summary: 'Register a new user' })
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto.email, dto.password, dto.displayName);
  }

  @Post('login')
  @ApiOperation({ summary: 'Login with email and password' })
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto.email, dto.password);
  }

  @Get('google/start')
  @ApiOperation({ summary: 'Start Google OAuth authorization flow' })
  @ApiQuery({ name: 'returnTo', required: false, description: 'Frontend callback URL' })
  async googleStart(
    @Res() reply: FastifyReply,
    @Query('returnTo') returnTo?: string,
  ) {
    const authUrl = this.googleOAuthService.getAuthorizationUrl(returnTo);
    return reply.status(302).redirect(authUrl);
  }

  @Get('google/callback')
  @ApiOperation({ summary: 'Handle Google OAuth callback and redirect to frontend' })
  async googleCallback(
    @Res() reply: FastifyReply,
    @Query('code') code?: string,
    @Query('state') state?: string,
    @Query('error') error?: string,
  ) {
    const { returnTo } = this.googleOAuthService.decodeState(state);

    if (error) {
      return reply.status(302).redirect(`${returnTo}?error=${encodeURIComponent(error)}`);
    }

    if (!code) {
      return reply.status(302).redirect(`${returnTo}?error=missing_code`);
    }

    const googleUser = await this.googleOAuthService.authenticateWithCode(code);
    const auth = this.authService.buildAuthResponse(googleUser);
    const frontendRedirect = this.googleOAuthService.buildFrontendRedirectUrl(returnTo, auth);
    return reply.status(302).redirect(frontendRedirect);
  }

  @Post('refresh')
  @ApiOperation({ summary: 'Refresh access token' })
  refresh(@Body() dto: RefreshDto) {
    return this.authService.refresh(dto.refreshToken);
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Logout (invalidate session)' })
  logout() {
    return { success: true };
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current user profile' })
  me(@CurrentUserId() userId: string) {
    return this.authService.me(userId);
  }

  @Get('health')
  @ApiOperation({ summary: 'Auth module health' })
  getHealth() {
    return { module: 'auth', status: 'active' };
  }
}
