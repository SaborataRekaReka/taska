import { Body, Controller, Get, Patch, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { JwtAuthGuard } from '../../core/auth.guard.js';
import { PrismaService } from '../../core/prisma.service.js';
import { CurrentUserId } from '../../core/user.decorator.js';

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
      select: {
        id: true,
        email: true,
        displayName: true,
        provider: true,
        avatarUrl: true,
        givenName: true,
        familyName: true,
        emailVerified: true,
        createdAt: true,
      },
    });
  }

  @Get('me/preferences')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get user day preferences' })
  async getPreferences(@CurrentUserId() userId: string) {
    const prefs = await this.prisma.userPreferences.findUnique({ where: { userId } });
    if (!prefs) {
      return { dayColors: null, dayEnergy: 11, dayMood: 3, dayWishes: null, isMyDaySaved: false };
    }
    return {
      dayColors: prefs.dayColors ? JSON.parse(prefs.dayColors) : null,
      dayEnergy: prefs.dayEnergy,
      dayMood: prefs.dayMood,
      dayWishes: prefs.dayWishes ? JSON.parse(prefs.dayWishes) : null,
      isMyDaySaved: prefs.isMyDaySaved,
    };
  }

  @Patch('me/preferences')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update user day preferences' })
  async updatePreferences(
    @CurrentUserId() userId: string,
    @Body() body: {
      dayColors?: [string, string] | null;
      dayEnergy?: number;
      dayMood?: number;
      dayWishes?: string[] | null;
      isMyDaySaved?: boolean;
    },
  ) {
    const data: Record<string, unknown> = {};
    if (body.dayColors !== undefined) {
      data.dayColors = body.dayColors ? JSON.stringify(body.dayColors) : null;
    }
    if (body.dayEnergy !== undefined) data.dayEnergy = body.dayEnergy;
    if (body.dayMood !== undefined) data.dayMood = body.dayMood;
    if (body.dayWishes !== undefined) {
      data.dayWishes = body.dayWishes ? JSON.stringify(body.dayWishes) : null;
    }
    if (body.isMyDaySaved !== undefined) data.isMyDaySaved = body.isMyDaySaved;

    const prefs = await this.prisma.userPreferences.upsert({
      where: { userId },
      create: { userId, ...data },
      update: data,
    });

    return {
      dayColors: prefs.dayColors ? JSON.parse(prefs.dayColors) : null,
      dayEnergy: prefs.dayEnergy,
      dayMood: prefs.dayMood,
      dayWishes: prefs.dayWishes ? JSON.parse(prefs.dayWishes) : null,
      isMyDaySaved: prefs.isMyDaySaved,
    };
  }

  @Get('health')
  @ApiOperation({ summary: 'Users module health' })
  getHealth() {
    return { module: 'users', status: 'active' };
  }
}
