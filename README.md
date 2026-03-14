# Taska

Initial monorepo foundation for a production-grade Task Manager with AI assistant.

## Stack

- TypeScript across all layers
- pnpm workspaces + Turborepo
- `apps/api` for backend API module boundaries
- `apps/app-mobile-web` for Expo-based app shell
- shared packages in `packages/*`

## Quick start

```bash
pnpm install
pnpm build
```

If `pnpm` is not available in your environment, use direct TypeScript checks as a temporary fallback:

```bash
npm --prefix apps/api run build
npm --prefix apps/api run lint
npm --prefix apps/app-mobile-web run build
```

## API shell endpoints (A1 foundation)

Base endpoints:

- `GET /health` — service health and module registry.
- `GET /openapi.json` — temporary OpenAPI document for current shell routes.

Module endpoints:

- `GET /auth/health`
- `GET /users/health`
- `GET /lists/health`
- `GET /tasks/health`
- `GET /subtasks/health`
- `GET /history/health`
- `GET /ai-assistant/health`

All responses use a unified envelope with `meta.requestId` and `meta.timestamp`.

## Database foundation (A2)

`apps/api/prisma/schema.prisma` now contains v1 domain schema:

- `User`
- `List` (with `deletedAt` soft-delete)
- `Task` (with `deletedAt` soft-delete)
- `Subtask`
- `History` (append-only events)
- `AiOperation`

Also added:

- `apps/api/prisma/migrations/0001_init/migration.sql` — initial PostgreSQL schema migration
- `apps/api/prisma/seed.sql` — idempotent default-list seed (`Работа`, `Личное`, `Без списка`)
- `apps/api/prisma/seed.mjs` — executes seed SQL via `psql`

Run commands from `apps/api`:

```bash
npm run db:migrate
npm run db:seed
```

## Infra foundation (A3)

Added local docker infrastructure:

- `docker-compose.yml` with `postgres`, `redis`, `api`
- `apps/api/Dockerfile` to build and run API container
- healthchecks for all services

Start local stack:

```bash
docker compose up -d --build
```

Check status and health:

```bash
docker compose ps
curl http://localhost:3000/health
```

Stop stack:

```bash
docker compose down
```

## Note about external dependencies

The implementation plan targets NestJS + Fastify and Prisma CLI packages. In this execution environment, npm registry access is blocked (`403`), so dependency installation could not be completed. The repository includes A1/A2/A3-compatible source and scripts, ready to execute in a normal network-enabled setup.

## Workspace structure

- `apps/api` — API skeleton with modular route registry, request-id and unified error format
- `apps/app-mobile-web` — mobile/web app placeholder to be replaced by Expo app
- `packages/types` — shared domain DTO types
- `packages/ui` — shared design tokens and UI exports
- `packages/config` — place for common config presets

## Next implementation steps

1. Install and wire NestJS + Fastify packages, keeping current route contracts.
2. Run Prisma migration and seed against running Postgres in docker stack.
3. Continue with auth module (email/password + Google OAuth).
4. Add UI foundations in Expo Router app shell.
