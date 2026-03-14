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

## Workspace structure

- `apps/api` — API skeleton with module registry and health endpoint
- `apps/app-mobile-web` — mobile/web app placeholder to be replaced by Expo app
- `packages/types` — shared domain DTO types
- `packages/ui` — shared design tokens and UI exports
- `packages/config` — place for common config presets

## Next implementation steps

1. Replace API shell with NestJS + Fastify bootstrap and module scaffolding.
2. Initialize Expo Router app and connect query/state/i18n providers.
3. Add Prisma schema and first migration (users/lists/tasks/subtasks/history).
4. Add Docker Compose for PostgreSQL/Redis/API local environment.
