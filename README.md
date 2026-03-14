# Taska

Monorepo foundation for a production-grade Task Manager with AI assistant.

## Stack

- TypeScript across all layers
- pnpm workspaces + Turborepo
- Backend: NestJS + Fastify (`apps/api`)
- Frontend shell: Expo app placeholder (`apps/app-mobile-web`)
- Shared packages in `packages/*`

## Workspace structure

- `apps/api` - API service
- `apps/app-mobile-web` - mobile/web app shell
- `packages/types` - shared domain types
- `packages/ui` - shared design tokens and UI exports
- `packages/config` - shared config presets

## Stage A1 status

Implemented:

- NestJS + Fastify bootstrap
- Module boundaries: `auth`, `users`, `lists`, `tasks`, `subtasks`, `history`, `ai-assistant`
- Global `ValidationPipe`
- Request correlation via `x-request-id`
- Unified API envelopes for success and error responses
- Swagger/OpenAPI at:
  - `GET /docs`
  - `GET /openapi.json`
- Service health endpoint:
  - `GET /health`
- Module health endpoints:
  - `GET /auth/health`
  - `GET /users/health`
  - `GET /lists/health`
  - `GET /tasks/health`
  - `GET /subtasks/health`
  - `GET /history/health`
  - `GET /ai-assistant/health`

## Stage A2 status

Implemented Prisma schema v1 (`apps/api/prisma/schema.prisma`) with:

- `User`
- `List` (soft-delete via `deletedAt`)
- `Task` (soft-delete via `deletedAt`)
- `Subtask`
- `History` (append-only events)
- `AiOperation`

Also included:

- Initial migration: `apps/api/prisma/migrations/0001_init/migration.sql`
- Seed script: `apps/api/prisma/seed.mjs`
  - Ensures default lists `Работа`, `Личное`, `Без списка`

## Local API setup

1. Install dependencies:

```bash
pnpm install
```

2. Start infrastructure:

```bash
docker compose up -d postgres redis
```

3. Run migration and seed:

```bash
pnpm --filter @taska/api run db:migrate
pnpm --filter @taska/api run db:seed
```

4. Run API:

```bash
pnpm --filter @taska/api run dev
```

## Validation commands

From repo root:

```bash
pnpm --filter @taska/api run build
pnpm --filter @taska/api run lint
```

## Backend delivery plan (aligned with current UI)

### Phase 0 - API baseline (1-2 days)
- Wire module routes into `server.ts` and expose a versioned prefix (`/api/v1`).
- Standardize response envelopes and error codes for all modules.
- Add request logging + `x-request-id` propagation.

### Phase 1 - Auth + session foundation (1-2 days)
- Implement `POST /auth/register`, `POST /auth/login`, `POST /auth/logout`, `GET /auth/me`.
- Add protected route middleware (single-user MVP today, multi-user-safe boundaries tomorrow).

### Phase 2 - Lists + tasks core CRUD (3-5 days)
- Lists: CRUD, reorder, default/system lists.
- Tasks: CRUD, status/priority/deadline, assign to list.
- Search + filter endpoint for the toolbar UX (`search`, `status`, `priority`, `listId`, `dueFrom`, `dueTo`).

### Phase 3 - Subtasks + hierarchy safety (2-3 days)
- Subtasks CRUD and completion toggles.
- Guardrails: ownership consistency and no hierarchy cycles.

### Phase 4 - History + undo-ready audit trail (2-3 days)
- Append-only history events for list/task/subtask mutations.
- History feed endpoint for UI timeline and future rollback diagnostics.

### Phase 5 - AI assistant safe-mode (4-6 days)
- `POST /ai/plan` -> plan preview without mutation.
- `POST /ai/operations/:id/confirm` -> explicit user confirmation.
- `POST /ai/operations/:id/execute` -> transactional apply.
- `POST /ai/operations/:id/undo` -> rollback last AI operation.

### Phase 6 - Statistics and "balance day" data (2-4 days)
- Daily/weekly aggregates for focus, urgency, completion, and workload.
- Endpoints for dashboard cards and radar chart payloads.

## Immediate next step

Start Phase 0:
1. Implement route composition in `apps/api/src/server.ts`.
2. Publish the first API contract draft (OpenAPI or markdown) for Auth/Lists/Tasks.
3. Align frontend query keys and DTOs with that contract before coding UI integrations.
