# auth

## Purpose
Authentication and session ownership for all protected backend operations.

## MVP endpoints
- `POST /api/v1/auth/register`
- `POST /api/v1/auth/login`
- `POST /api/v1/auth/logout`
- `GET /api/v1/auth/me`

## Notes
- Every private endpoint must resolve an authenticated user.
- Error contracts must be stable for frontend handling (`UNAUTHORIZED`, `INVALID_CREDENTIALS`).
