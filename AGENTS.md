# AGENTS.md — контекст проекта для AI-агентов

Этот документ — главный источник контекста для любого AI-агента. Читай его целиком при каждом старте сессии.

---

## 1) Быстрый старт в новой сессии

При старте любой задачи агент **обязан**:
1. Прочитать этот файл полностью.
2. Прочитать `architecture.md` — архитектурные инварианты и контракты.
3. Проверить состояние репозитория: `git status --short` и `git log --oneline -10`.
4. Найти точку входа по задаче (релевантные файлы через Glob/Grep).
5. Сформировать краткий план действий и идти маленькими шагами.

**PowerShell** (Windows): использовать `;` вместо `&&` для цепочки команд.

---

## 2) Текущее состояние проекта (обновлено: 2026-03-14)

### Выполненные этапы
| Этап | Статус | Описание |
|------|--------|----------|
| A1 | ✅ DONE | NestJS + Fastify bootstrap, все модули со stub-контроллерами |
| A2 | ✅ DONE | Prisma schema v1, миграция 0001_init, seed (Работа/Личное/Без списка) |
| A3 | ✅ DONE | Docker Compose (postgres, redis, api), .env.example |
| B1 | ⏳ NEXT | Auth — email/password + JWT (модуль есть, логика не реализована) |

### Не начатые этапы
| Этап | Описание |
|------|----------|
| B2 | Google OAuth |
| B3 | JWT refresh rotation, сессии |
| C1 | Lists CRUD |
| C2 | Tasks CRUD + фильтры |
| C3 | Subtasks CRUD |
| C4 | History append-only |
| D | Frontend (Expo Router + React Native Web) |
| E | AI Assistant safe-mode |
| F | Polishing, документация |

### Важно: все модули сейчас — заглушки
Все контроллеры (auth, users, lists, tasks, subtasks, history, ai-assistant) содержат **только** `/health` endpoint со статусом `"planned"`. Бизнес-логики нет ни в одном модуле.

---

## 3) Структура репозитория

```
TASKA 2.0/
├── apps/
│   ├── api/                    # NestJS + Fastify backend
│   │   ├── prisma/
│   │   │   ├── schema.prisma   # DB schema: User, List, Task, Subtask, History, AiOperation
│   │   │   ├── migrations/     # 0001_init — базовая схема
│   │   │   └── seed.mjs        # Создает дефолтные списки для тестового пользователя
│   │   └── src/
│   │       ├── main.ts         # Точка входа NestJS
│   │       ├── app.module.ts   # Корневой модуль (регистрирует все модули)
│   │       ├── core/           # Инфраструктура: request-id, error filter, response envelope
│   │       └── modules/
│   │           ├── auth/       # Аутентификация (STUB)
│   │           ├── users/      # Профиль пользователя (STUB)
│   │           ├── lists/      # Списки задач (STUB)
│   │           ├── tasks/      # Задачи (STUB)
│   │           ├── subtasks/   # Подзадачи (STUB)
│   │           ├── history/    # История изменений (STUB)
│   │           └── ai-assistant/ # AI-ассистент (STUB)
│   └── app-mobile-web/         # Expo Router shell (заглушка, не инициализирован)
├── packages/
│   ├── types/                  # Shared TS типы: TaskDto, TaskPriority, TaskStatus
│   ├── ui/                     # Shared UI токены (пусто)
│   └── config/                 # Shared tsconfig/eslint (пусто)
├── architecture.md             # Архитектурные инварианты и контракты
├── roadmap.md                  # Детальный план фронтенда
├── masterprompt.md             # Исходное техзадание проекта
├── docker-compose.yml          # postgres:5432, redis:6379, api:3000
├── .env.example                # Шаблон переменных окружения
└── turbo.json                  # Turborepo pipeline
```

---

## 4) Ключевые файлы — что где искать

| Что ищешь | Где смотреть |
|-----------|-------------|
| DB схема (модели) | `apps/api/prisma/schema.prisma` |
| Точка входа API | `apps/api/src/main.ts` |
| Регистрация модулей | `apps/api/src/app.module.ts` |
| Response envelope / error format | `apps/api/src/core/` |
| Shared типы (DTO) | `packages/types/src/index.ts` |
| Env переменные | `.env.example` |
| Docker | `docker-compose.yml` |
| Дизайн-референсы | `assets/` (скриншоты UI) |

---

## 5) Команды разработки

### Backend (PowerShell, из корня репозитория)
```powershell
# Установить зависимости
pnpm install

# Поднять инфраструктуру
docker compose up -d postgres redis

# Применить миграции
pnpm --filter @taska/api run db:migrate

# Заполнить seed-данными
pnpm --filter @taska/api run db:seed

# Запустить API в режиме dev
pnpm --filter @taska/api run dev

# Сборка
pnpm --filter @taska/api run build

# Линт
pnpm --filter @taska/api run lint
```

### Проверка API
```bash
# Health
curl http://localhost:3000/health

# Swagger UI
open http://localhost:3000/docs

# OpenAPI JSON
curl http://localhost:3000/openapi.json
```

---

## 6) Архитектурные инварианты (нельзя нарушать)

1. **Ownership**: пользователь видит и изменяет только свои сущности (`userId` проверяется на каждом запросе).
2. **AI safe-mode**: AI никогда не применяет изменения без явного подтверждения пользователя.
3. **Soft-delete**: List и Task удаляются через `deletedAt`, не физически.
4. **History append-only**: записи истории неизменяемы.
5. **Cycle prevention**: иерархия подзадач ациклична.
6. **Response envelope**: все ответы API — `{ data, meta?, error? }`.

---

## 7) Модули и их контракты (целевые)

### Auth (`/auth`)
- `POST /auth/register` — email, password → user + tokens
- `POST /auth/login` — email, password → tokens
- `POST /auth/refresh` — refreshToken → новые tokens
- `POST /auth/logout` — инвалидировать refresh token
- `GET /auth/me` — текущий пользователь

### Lists (`/lists`)
- `GET /lists` — все списки пользователя
- `POST /lists` — создать список
- `PATCH /lists/:id` — обновить
- `DELETE /lists/:id` — soft-delete (нельзя удалять системный "Без списка")

### Tasks (`/tasks`)
- `GET /tasks?listId=&status=&priority=&dueToday=&search=` — задачи с фильтрами
- `POST /tasks` — создать задачу
- `PATCH /tasks/:id` — обновить
- `DELETE /tasks/:id` — soft-delete

### Subtasks (`/tasks/:id/subtasks`)
- `GET /tasks/:id/subtasks`
- `POST /tasks/:id/subtasks`
- `PATCH /tasks/:id/subtasks/:subId`
- `DELETE /tasks/:id/subtasks/:subId`

### AI Assistant (`/ai`)
- `POST /ai/chat` — free-form запрос, возвращает текстовый ответ или план
- `POST /ai/plan` — сформировать план изменений (без мутаций)
- `POST /ai/operations/:id/confirm` — подтвердить план
- `POST /ai/operations/:id/execute` — применить подтвержденный план
- `POST /ai/operations/:id/undo` — откатить последнюю AI-операцию

---

## 8) Стек технологий

### Backend
- **NestJS 11** + **Fastify 5** адаптер
- **Prisma 6** ORM + **PostgreSQL 16**
- **Redis** (кэш/rate-limit, в MVP не используется активно)
- TypeScript strict, ESM modules

### Frontend (запланировано, не реализовано)
- **Expo Router** (React Native + React Native Web) — web-first в MVP
- **Zustand** — клиентский state
- **TanStack Query (React Query)** — серверный state
- **i18n** — RU/EN, дефолт по системному языку

### Shared packages
- `@taska/types` — DTO и enum-типы
- `@taska/ui` — дизайн-токены и shared компоненты
- `@taska/config` — tsconfig/eslint presets

---

## 9) Стандарты кода

- TypeScript strict, no-any
- ESM imports (`.js` расширения в TypeScript import paths)
- Маленькие функции с говорящими именами
- DTO через `class-validator` на backend
- Без try/catch вокруг import
- Без тестов в MVP (но код должен быть тестируемым)
- Response envelope: `{ data: T }` для успеха, `{ error: { code, message } }` для ошибок

---

## 10) Правила коммитов

Формат: `<type>(<scope>): <description>`

Типы: `feat`, `fix`, `docs`, `refactor`, `chore`

Примеры:
- `feat(auth): implement email password login with jwt`
- `feat(lists): add CRUD endpoints with ownership checks`
- `fix(tasks): handle missing listId in task creation`
- `docs: update architecture with current API contracts`

Один логический блок = один коммит. Перед коммитом: `git status --short`.

---

## 11) Как обновлять этот документ

После каждого значимого этапа агент **обязан** обновить:
1. Таблицу статусов в разделе 2 (отметить завершенные этапы).
2. Раздел 3 (структуру) если добавились новые файлы/папки.
3. Раздел 7 (контракты) если реализованы новые endpoints.

Также обновить `architecture.md` если изменились архитектурные решения.

---

## 12) Политика безопасности изменений

Без явного подтверждения **запрещено**:
- Массово удалять/переименовывать файлы
- Менять схему БД без новой миграции
- Добавлять внешние зависимости без необходимости
- Вносить несовместимые изменения API-контрактов

---

*Если в подпапке проекта появится локальный `AGENTS.md`, он имеет приоритет в своей области.*
