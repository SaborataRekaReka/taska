import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiTags, ApiBearerAuth } from '@nestjs/swagger';

import { JwtAuthGuard } from '../../core/auth.guard.js';
import { CurrentUserId } from '../../core/user.decorator.js';
import { PrismaService } from '../../core/prisma.service.js';

@ApiTags('users')
@Controller('users')
export class UsersController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current user profile' })
  async getProfile(@CurrentUserId() userId: string) {
    return this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, displayName: true, provider: true, createdAt: true },
    });
  }

  @Get('health')
  @ApiOperation({ summary: 'Users module health' })
  getHealth() {
    return { module: 'users', status: 'active' };
  }
}
