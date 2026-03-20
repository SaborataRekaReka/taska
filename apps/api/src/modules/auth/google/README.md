# Google OAuth module

Отдельный элемент auth-архитектуры для входа через Google.

## Что делает
- Строит Google authorization URL.
- Меняет `code` на access token через Google OAuth endpoint.
- Загружает стандартный OpenID Connect профиль (`email`, `name`, `given_name`, `family_name`, `picture`, `email_verified`).
- Создает или обновляет локального пользователя TASKA.
- Возвращает пользователя обратно во frontend callback с локальными JWT токенами TASKA.

## Поток
1. Frontend открывает `/auth/google/start?returnTo=http://localhost:5173/oauth/google/callback`.
2. Backend редиректит пользователя в Google OAuth Consent Screen.
3. Google возвращает пользователя в `/auth/google/callback` backend-приложения.
4. Backend обменивает `code` на Google token, запрашивает userinfo и upsert'ит `User`.
5. Backend редиректит пользователя на frontend callback и передает JWT + профиль в query params.

## Требуемые env
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `GOOGLE_REDIRECT_URI`
- `GOOGLE_FRONTEND_CALLBACK_URL`

## Google Console
Для локальной проверки в Google Console (OAuth Client Type: Web application) нужен redirect URI backend:
- `http://localhost:3000/auth/google/callback`

Frontend callback задается отдельно (параметр `returnTo` или `GOOGLE_FRONTEND_CALLBACK_URL`):
- `http://localhost:5173/oauth/google/callback`
