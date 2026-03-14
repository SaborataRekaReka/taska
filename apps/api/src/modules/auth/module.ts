import { HttpError, parseJsonBody, respondOk } from '../../core/http.js';
import type { RouteDefinition } from '../../core/http.js';

interface AuthUser {
  id: string;
  email: string;
  passwordHash: string;
  displayName: string | null;
  createdAt: string;
}

interface RefreshSession {
  token: string;
  userId: string;
  createdAt: string;
}

interface LoginAttempts {
  count: number;
  windowStartedAt: number;
}

const usersByEmail = new Map<string, AuthUser>();
const refreshSessions = new Map<string, RefreshSession>();
const loginAttemptsByEmail = new Map<string, LoginAttempts>();

const LOGIN_ATTEMPT_WINDOW_MS = 15 * 60 * 1000;
const MAX_LOGIN_ATTEMPTS = 5;

function makeId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

function hashPassword(password: string): string {
  return `hashed::${password}`;
}

function getStringField(payload: Record<string, unknown>, field: string): string {
  const value = payload[field];
  if (typeof value !== 'string') {
    throw new HttpError(400, 'VALIDATION_ERROR', `${field} must be a string`, { field });
  }

  return value.trim();
}

function validateEmail(email: string): void {
  if (!email.includes('@') || email.length < 5) {
    throw new HttpError(400, 'VALIDATION_ERROR', 'email must be a valid email address', {
      field: 'email',
    });
  }
}

function validatePassword(password: string): void {
  if (password.length < 8) {
    throw new HttpError(400, 'VALIDATION_ERROR', 'password must have at least 8 characters', {
      field: 'password',
    });
  }
}

function recordFailedLogin(email: string): void {
  const now = Date.now();
  const existing = loginAttemptsByEmail.get(email);

  if (!existing || now - existing.windowStartedAt > LOGIN_ATTEMPT_WINDOW_MS) {
    loginAttemptsByEmail.set(email, { count: 1, windowStartedAt: now });
    return;
  }

  const nextCount = existing.count + 1;
  loginAttemptsByEmail.set(email, { count: nextCount, windowStartedAt: existing.windowStartedAt });

  if (nextCount > MAX_LOGIN_ATTEMPTS) {
    throw new HttpError(429, 'TOO_MANY_REQUESTS', 'Too many failed login attempts. Try later.', {
      retryAfterSeconds: Math.ceil((existing.windowStartedAt + LOGIN_ATTEMPT_WINDOW_MS - now) / 1000),
    });
  }
}

function clearFailedLogin(email: string): void {
  loginAttemptsByEmail.delete(email);
}

function issueTokens(userId: string): { accessToken: string; refreshToken: string } {
  const accessToken = makeId('acc');
  const refreshToken = makeId('ref');

  refreshSessions.set(refreshToken, {
    token: refreshToken,
    userId,
    createdAt: new Date().toISOString(),
  });

  return { accessToken, refreshToken };
}

export const authModuleRoutes: RouteDefinition[] = [
  {
    method: 'GET',
    path: '/auth/health',
    handler: ({ res, requestId }) => {
      respondOk(res, requestId, {
        module: 'auth',
        status: 'active',
        endpoints: ['/auth/register', '/auth/login', '/auth/refresh', '/auth/logout'],
      });
    },
  },
  {
    method: 'POST',
    path: '/auth/register',
    handler: async ({ req, res, requestId }) => {
      const body = await parseJsonBody(req);
      const email = getStringField(body, 'email').toLowerCase();
      const password = getStringField(body, 'password');
      const displayNameRaw = body.displayName;
      const displayName = typeof displayNameRaw === 'string' ? displayNameRaw.trim() : null;

      validateEmail(email);
      validatePassword(password);

      if (usersByEmail.has(email)) {
        throw new HttpError(409, 'USER_ALREADY_EXISTS', 'User with this email already exists');
      }

      const user: AuthUser = {
        id: makeId('usr'),
        email,
        passwordHash: hashPassword(password),
        displayName,
        createdAt: new Date().toISOString(),
      };
      usersByEmail.set(email, user);

      const tokens = issueTokens(user.id);

      respondOk(
        res,
        requestId,
        {
          user: {
            id: user.id,
            email: user.email,
            displayName: user.displayName,
          },
          tokens,
        },
        201,
      );
    },
  },
  {
    method: 'POST',
    path: '/auth/login',
    handler: async ({ req, res, requestId }) => {
      const body = await parseJsonBody(req);
      const email = getStringField(body, 'email').toLowerCase();
      const password = getStringField(body, 'password');

      validateEmail(email);
      validatePassword(password);

      const user = usersByEmail.get(email);
      if (!user || user.passwordHash !== hashPassword(password)) {
        recordFailedLogin(email);
        throw new HttpError(401, 'INVALID_CREDENTIALS', 'Invalid email or password');
      }

      clearFailedLogin(email);
      const tokens = issueTokens(user.id);

      respondOk(res, requestId, {
        user: {
          id: user.id,
          email: user.email,
          displayName: user.displayName,
        },
        tokens,
      });
    },
  },
  {
    method: 'POST',
    path: '/auth/refresh',
    handler: async ({ req, res, requestId }) => {
      const body = await parseJsonBody(req);
      const refreshToken = getStringField(body, 'refreshToken');

      const session = refreshSessions.get(refreshToken);
      if (!session) {
        throw new HttpError(401, 'INVALID_REFRESH_TOKEN', 'Refresh token is invalid or expired');
      }

      refreshSessions.delete(refreshToken);
      const tokens = issueTokens(session.userId);

      respondOk(res, requestId, { tokens });
    },
  },
  {
    method: 'POST',
    path: '/auth/logout',
    handler: async ({ req, res, requestId }) => {
      const body = await parseJsonBody(req);
      const refreshToken = getStringField(body, 'refreshToken');

      refreshSessions.delete(refreshToken);

      respondOk(res, requestId, { success: true });
    },
  },
];
