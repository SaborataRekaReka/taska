# auth

## Purpose
Authentication, session issuing and provider-based identity entry points for all protected backend operations.

## Implemented endpoints
- `POST /auth/register`
- `POST /auth/login`
- `GET /auth/google/start`
- `GET /auth/google/callback`
- `POST /auth/refresh`
- `POST /auth/logout`
- `GET /auth/me`

## Architecture
- `auth.service.ts` отвечает за local email/password auth и выпуск JWT TASKA.
- `google/google-oauth.service.ts` — отдельный архитектурный элемент для Google OAuth code flow.
- `controller.ts` связывает local auth и Google redirect flow в единый API-модуль.

## Profile data returned to frontend
- `id`
- `email`
- `displayName`
- `provider`
- `avatarUrl`
- `givenName`
- `familyName`
- `emailVerified`

## Notes
- Every private endpoint must resolve an authenticated user.
- Google OAuth uses standard scopes: `openid email profile`.
- For local development you must configure Google Console redirect URIs for backend and frontend callback URLs.
