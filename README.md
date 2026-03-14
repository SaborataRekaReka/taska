# TASKA 2.0

Менеджер задач с AI-ассистентом. Monorepo на TypeScript: NestJS API + Expo (React Native Web) frontend.

---

## Текущая стадия: D4 ✅ — Frontend рабочий, подключен к API

| Этап | Статус | Описание |
|------|--------|----------|
| A1 | ✅ | NestJS + Fastify, модульная архитектура, Swagger |
| A2 | ✅ | Prisma schema, миграции, seed |
| A3 | ✅ | Docker Compose (postgres + redis + api) |
| B1 (Auth) | ✅ | Register, login, refresh, logout, me + JWT guard |
| C1 (Lists) | ✅ | CRUD + ownership + soft-delete + history |
| C2 (Tasks) | ✅ | CRUD + 6 фильтров + history |
| C3 (Subtasks) | ✅ | CRUD + ownership + history |
| C4 (History) | ✅ | Append-only service + read API |
| D0-D4 (Frontend) | ✅ | React + Vite: auth, task list, create/edit, filters |
| D5-D6 | ⏳ | "Мой день" modal, AI prompt/response UI |
| E (AI) | ⏳ | AI-ассистент safe-mode |

---

## Быстрый старт (локально)

### Требования
- Node.js 20+
- pnpm 9+
- Docker Desktop

### 1. Установить зависимости
```bash
pnpm install
```

### 2. Настроить переменные окружения
```bash
cp .env.example .env
# Отредактировать .env при необходимости (DATABASE_URL уже прописан для docker)
```

### 3. Поднять инфраструктуру
```bash
docker compose up -d postgres redis
```

### 4. Применить миграции и seed
```bash
pnpm --filter @taska/api run db:migrate
pnpm --filter @taska/api run db:seed
```

### 5. Запустить API
```bash
pnpm --filter @taska/api run dev
```

API доступен на `http://localhost:3000`

---

## API Endpoints (текущие)

### System
| Endpoint | Описание |
|----------|----------|
| `GET /health` | Статус API |
| `GET /docs` | Swagger UI |
| `GET /openapi.json` | OpenAPI спецификация |

### Auth (public)
| Endpoint | Описание |
|----------|----------|
| `POST /auth/register` | Регистрация (email + password) |
| `POST /auth/login` | Вход |
| `POST /auth/refresh` | Обновить access token |
| `POST /auth/logout` | Выход (Bearer) |
| `GET /auth/me` | Профиль текущего пользователя (Bearer) |

### Lists (Bearer required)
| Endpoint | Описание |
|----------|----------|
| `GET /lists` | Все списки пользователя |
| `POST /lists` | Создать список |
| `PATCH /lists/:id` | Обновить список |
| `DELETE /lists/:id` | Soft-delete (задачи переносятся в "без списка") |

### Tasks (Bearer required)
| Endpoint | Описание |
|----------|----------|
| `GET /tasks?listId=&status=&priority=&dueToday=&noList=&search=` | Задачи с фильтрами |
| `GET /tasks/:id` | Одна задача с подзадачами |
| `POST /tasks` | Создать задачу |
| `PATCH /tasks/:id` | Обновить задачу |
| `DELETE /tasks/:id` | Soft-delete |

### Subtasks (Bearer required)
| Endpoint | Описание |
|----------|----------|
| `GET /tasks/:taskId/subtasks` | Подзадачи задачи |
| `POST /tasks/:taskId/subtasks` | Создать подзадачу |
| `PATCH /tasks/:taskId/subtasks/:id` | Обновить подзадачу |
| `DELETE /tasks/:taskId/subtasks/:id` | Удалить подзадачу |

### History (Bearer required)
| Endpoint | Описание |
|----------|----------|
| `GET /history?entityType=&entityId=&limit=` | Лог изменений |

---

## Структура проекта

```
TASKA 2.0/
├── apps/
│   ├── api/                    # NestJS + Fastify backend
│   │   ├── prisma/             # Schema, миграции, seed
│   │   └── src/
│   │       ├── core/           # Infrastructure (request-id, errors, envelope)
│   │       └── modules/        # auth | users | lists | tasks | subtasks | history | ai-assistant
│   └── app-mobile-web/         # Expo shell (не инициализирован)
├── packages/
│   ├── types/                  # Shared TypeScript типы
│   ├── ui/                     # Shared UI компоненты
│   └── config/                 # Shared конфиги
├── architecture.md             # Архитектурные инварианты
├── roadmap.md                  # Детальный план фронтенда
└── AGENTS.md                   # Контекст для AI-агентов
```

---

## Команды

### Frontend
```bash
# Dev (http://localhost:5173, проксирует API на :3000)
pnpm --filter @taska/web run dev

# Сборка
pnpm --filter @taska/web run build

# Линт
pnpm --filter @taska/web run lint
```

### Backend
```bash
# Dev с hot-reload
pnpm --filter @taska/api run dev

# Сборка
pnpm --filter @taska/api run build

# Линт
pnpm --filter @taska/api run lint

# Prisma миграция
pnpm --filter @taska/api run db:migrate

# Prisma seed
pnpm --filter @taska/api run db:seed

# Генерация Prisma клиента
pnpm --filter @taska/api run db:generate
```

### Вся монорепа
```bash
# Сборка всего
pnpm run build

# Линт всего
pnpm run lint
```

### Docker
```bash
# Поднять всё (postgres + redis + api)
docker compose up -d

# Только инфраструктура
docker compose up -d postgres redis

# Логи API
docker compose logs -f api

# Остановить
docker compose down
```

---

## Переменные окружения

Смотри `.env.example`. Ключевые:

| Переменная | Описание | Пример |
|-----------|----------|--------|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://taska:taska@localhost:5432/taska` |
| `REDIS_URL` | Redis connection string | `redis://localhost:6379` |
| `JWT_SECRET` | Секрет для JWT | `change-me-in-production` |
| `OPENAI_API_KEY` | Ключ OpenAI (для AI-функций) | `sk-...` |
| `PORT` | Порт API | `3000` |

---

## База данных

### Модели
- `User` — пользователь (email/password или Google OAuth)
- `List` — список задач (soft-delete через `deletedAt`)
- `Task` — задача с приоритетом, дедлайном, статусом (soft-delete)
- `Subtask` — подзадача
- `History` — append-only лог изменений
- `AiOperation` — операция AI с lifecycle: PLANNED → CONFIRMED → EXECUTED / UNDONE

### Seed данные
Seed создаёт тестового пользователя и три дефолтных списка: `Работа`, `Личное`, `Без списка`.

---

## Архитектура

Подробности в [`architecture.md`](./architecture.md).  
План разработки фронтенда в [`roadmap.md`](./roadmap.md).  
Контекст для AI-агентов в [`AGENTS.md`](./AGENTS.md).

---

## Stack

- **TypeScript** — единый язык всего стека
- **NestJS 11** + **Fastify 5** — backend framework
- **Prisma 6** — ORM
- **PostgreSQL 16** + **Redis 7** — хранилище
- **Expo Router** + **React Native Web** — frontend (запланировано)
- **Zustand** + **TanStack Query** — state management (запланировано)
- **pnpm workspaces** + **Turborepo** — monorepo tooling
