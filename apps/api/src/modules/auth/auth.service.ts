import { Injectable, UnauthorizedException, ConflictException } from '@nestjs/common';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

import { PrismaService } from '../../core/prisma.service.js';

export interface AuthUser {
  id: string;
  email: string;
  displayName: string | null;
  provider: 'LOCAL' | 'GOOGLE';
  avatarUrl: string | null;
  givenName: string | null;
  familyName: string | null;
  emailVerified: boolean;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

interface JwtPayload {
  sub: string;
  email: string;
  type: 'access' | 'refresh';
}

const ACCESS_SECRET = process.env.JWT_ACCESS_SECRET ?? 'dev-access-secret';
const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET ?? 'dev-refresh-secret';
const ACCESS_TTL = '15m';
const REFRESH_TTL = '7d';

@Injectable()
export class AuthService {
  constructor(private readonly prisma: PrismaService) {}

  private generateTokens(userId: string, email: string): TokenPair {
    const accessToken = jwt.sign(
      { sub: userId, email, type: 'access' } satisfies JwtPayload,
      ACCESS_SECRET,
      { expiresIn: ACCESS_TTL },
    );
    const refreshToken = jwt.sign(
      { sub: userId, email, type: 'refresh' } satisfies JwtPayload,
      REFRESH_SECRET,
      { expiresIn: REFRESH_TTL },
    );
    return { accessToken, refreshToken };
  }

  async register(email: string, password: string, displayName?: string) {
    const existing = await this.prisma.user.findUnique({ where: { email } });
    if (existing) {
      throw new ConflictException('Email already registered');
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const user = await this.prisma.user.create({
      data: {
        email,
        passwordHash,
        displayName: displayName ?? null,
        provider: 'LOCAL',
        emailVerified: false,
      },
    });

    await this.createDefaultLists(user.id);

    return this.buildAuthResponse({
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      provider: user.provider,
      avatarUrl: user.avatarUrl,
      givenName: user.givenName,
      familyName: user.familyName,
      emailVerified: user.emailVerified,
    });
  }

  async login(email: string, password: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user?.passwordHash) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    return this.buildAuthResponse({
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      provider: user.provider,
      avatarUrl: user.avatarUrl,
      givenName: user.givenName,
      familyName: user.familyName,
      emailVerified: user.emailVerified,
    });
  }

  createTokenPair(user: Pick<AuthUser, 'id' | 'email'>): TokenPair {
    return this.generateTokens(user.id, user.email);
  }

  buildAuthResponse(user: AuthUser) {
    return {
      user,
      ...this.generateTokens(user.id, user.email),
    };
  }

  async refresh(refreshToken: string) {
    let payload: JwtPayload;
    try {
      payload = jwt.verify(refreshToken, REFRESH_SECRET) as JwtPayload;
    } catch {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    if (payload.type !== 'refresh') {
      throw new UnauthorizedException('Invalid token type');
    }

    const user = await this.prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    return this.generateTokens(user.id, user.email);
  }

  async me(userId: string) {
    const user = await this.prisma.user.findUnique({
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
    if (!user) {
      throw new UnauthorizedException('User not found');
    }
    return user;
  }

  private async createDefaultLists(userId: string): Promise<void> {
    const defaultListNames = ['Работа', 'Личное', 'Без списка'];
    await Promise.all(defaultListNames.map((name, index) => this.prisma.list.create({
      data: { userId, name, isDefault: true, order: index },
    })));
  }

  static verifyAccessToken(token: string): JwtPayload {
    const payload = jwt.verify(token, ACCESS_SECRET) as JwtPayload;
    if (payload.type !== 'access') {
      throw new UnauthorizedException('Invalid token type');
    }
    return payload;
  }
}
