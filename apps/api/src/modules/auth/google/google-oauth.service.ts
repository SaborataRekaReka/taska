import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';

import { PrismaService } from '../../../core/prisma.service.js';
import type { GoogleOAuthStatePayload, GoogleTokenResponse, GoogleUserProfile } from './types.js';

const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const GOOGLE_USERINFO_URL = 'https://openidconnect.googleapis.com/v1/userinfo';
const DEFAULT_SCOPES = ['openid', 'email', 'profile'];
const DEFAULT_LOCAL_CALLBACK = 'http://localhost:3000/auth/google/callback';
const DEFAULT_FRONTEND_CALLBACK = 'http://localhost:5173/auth/google/callback';

@Injectable()
export class GoogleOAuthService {
  constructor(private readonly prisma: PrismaService) {}

  getAuthorizationUrl(returnTo?: string): string {
    const clientId = this.getRequiredEnv('GOOGLE_CLIENT_ID');
    const redirectUri = this.getRedirectUri();
    const state = this.encodeState({ returnTo: returnTo || this.getFrontendCallbackUrl() });

    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: DEFAULT_SCOPES.join(' '),
      access_type: 'offline',
      prompt: 'consent',
      state,
    });

    return `${GOOGLE_AUTH_URL}?${params.toString()}`;
  }

  async authenticateWithCode(code: string) {
    const tokens = await this.exchangeCodeForToken(code);
    const profile = await this.fetchUserProfile(tokens.access_token);
    return this.upsertGoogleUser(profile);
  }

  buildFrontendRedirectUrl(returnTo: string, auth: { accessToken: string; refreshToken: string; user: { id: string; email: string; displayName: string | null; avatarUrl: string | null; givenName: string | null; familyName: string | null; provider: 'LOCAL' | 'GOOGLE'; emailVerified: boolean } }): string {
    const url = new URL(returnTo);
    url.searchParams.set('accessToken', auth.accessToken);
    url.searchParams.set('refreshToken', auth.refreshToken);
    url.searchParams.set('provider', auth.user.provider);
    url.searchParams.set('user', JSON.stringify(auth.user));
    return url.toString();
  }

  decodeState(state?: string): GoogleOAuthStatePayload {
    if (!state) {
      return { returnTo: this.getFrontendCallbackUrl() };
    }

    try {
      const payload = JSON.parse(Buffer.from(state, 'base64url').toString('utf8')) as GoogleOAuthStatePayload;
      if (!payload.returnTo) {
        throw new Error('Missing returnTo');
      }
      return payload;
    } catch {
      throw new BadRequestException('Invalid Google OAuth state');
    }
  }

  private async exchangeCodeForToken(code: string): Promise<GoogleTokenResponse> {
    const response = await fetch(GOOGLE_TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: this.getRequiredEnv('GOOGLE_CLIENT_ID'),
        client_secret: this.getRequiredEnv('GOOGLE_CLIENT_SECRET'),
        redirect_uri: this.getRedirectUri(),
        grant_type: 'authorization_code',
      }),
    });

    if (!response.ok) {
      throw new UnauthorizedException('Failed to exchange Google authorization code');
    }

    return response.json() as Promise<GoogleTokenResponse>;
  }

  private async fetchUserProfile(accessToken: string): Promise<GoogleUserProfile> {
    const response = await fetch(GOOGLE_USERINFO_URL, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!response.ok) {
      throw new UnauthorizedException('Failed to fetch Google user profile');
    }

    return response.json() as Promise<GoogleUserProfile>;
  }

  private async upsertGoogleUser(profile: GoogleUserProfile) {
    if (!profile.email) {
      throw new UnauthorizedException('Google account did not provide an email');
    }

    const existingByProvider = await this.prisma.user.findFirst({
      where: { provider: 'GOOGLE', providerUserId: profile.sub },
    });

    const existingByEmail = await this.prisma.user.findUnique({ where: { email: profile.email } });
    const user = await this.prisma.user.upsert({
      where: { id: existingByProvider?.id ?? existingByEmail?.id ?? '__new_google_user__' },
      update: {
        email: profile.email,
        displayName: profile.name ?? existingByEmail?.displayName ?? null,
        provider: 'GOOGLE',
        providerUserId: profile.sub,
        avatarUrl: profile.picture ?? null,
        givenName: profile.given_name ?? null,
        familyName: profile.family_name ?? null,
        emailVerified: profile.email_verified,
        passwordHash: existingByEmail?.passwordHash ?? existingByProvider?.passwordHash ?? null,
      },
      create: {
        email: profile.email,
        displayName: profile.name ?? null,
        provider: 'GOOGLE',
        providerUserId: profile.sub,
        avatarUrl: profile.picture ?? null,
        givenName: profile.given_name ?? null,
        familyName: profile.family_name ?? null,
        emailVerified: profile.email_verified,
      },
    });

    if (!existingByProvider && !existingByEmail) {
      await this.createDefaultLists(user.id);
    }

    return {
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      provider: user.provider,
      avatarUrl: user.avatarUrl,
      givenName: user.givenName,
      familyName: user.familyName,
      emailVerified: user.emailVerified,
    };
  }

  private async createDefaultLists(userId: string): Promise<void> {
    const defaultListNames = ['Работа', 'Личное', 'Без списка'];
    await Promise.all(defaultListNames.map((name, index) => this.prisma.list.create({
      data: { userId, name, isDefault: true, order: index },
    })));
  }

  private encodeState(payload: GoogleOAuthStatePayload): string {
    return Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
  }

  private getRedirectUri(): string {
    return process.env.GOOGLE_REDIRECT_URI ?? DEFAULT_LOCAL_CALLBACK;
  }

  private getFrontendCallbackUrl(): string {
    return process.env.GOOGLE_FRONTEND_CALLBACK_URL ?? DEFAULT_FRONTEND_CALLBACK;
  }

  private getRequiredEnv(name: 'GOOGLE_CLIENT_ID' | 'GOOGLE_CLIENT_SECRET'): string {
    const value = process.env[name];
    if (!value || value === 'change_me') {
      throw new BadRequestException(`${name} is not configured`);
    }
    return value;
  }
}
