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

## 2) Текущее состояние проекта (обновлено: 2026-03-15)

### Выполненные этапы
| Этап | Статус | Описание |
|------|--------|----------|
| A1 | ✅ DONE | NestJS + Fastify bootstrap, модульная архитектура |
| A2 | ✅ DONE | Prisma schema v1, миграция 0001_init, seed |
| A3 | ✅ DONE | Docker Compose (postgres, redis, api) |
| B1 | ✅ DONE | Auth — register, login, refresh, logout, me + JwtAuthGuard |
| C1 | ✅ DONE | Lists CRUD + ownership + soft-delete + history |
| C2 | ✅ DONE | Tasks CRUD + filters (listId, status, priority, dueToday, search) + history |
| C3 | ✅ DONE | Subtasks CRUD + ownership check + history |
| C4 | ✅ DONE | History service + read API |
| D5 | ✅ DONE | "Мой день" modal (premium UI + profile radar + Framer Motion) |
| D6 | ✅ DONE | Task AI modal: visual/editor tabs, markdown edit mode, assistant prompt input |

### Не начатые этапы
| Этап | Описание |
|------|----------|
| B2 | Google OAuth |
| E | AI Assistant safe-mode |
| F | Polishing, документация |

### Текущее состояние модулей
- **auth**: register, login, refresh, logout, me — полностью рабочий
- **users**: GET /users/me — профиль текущего пользователя
- **lists**: полный CRUD + ownership + soft-delete + запрет удаления дефолтных
- **tasks**: полный CRUD + 6 фильтров + includes subtasks/list
- **subtasks**: полный CRUD через /tasks/:taskId/subtasks + ownership
- **history**: append-only запись + read API с фильтрами
- **ai-assistant**: заглушка (только /health)

### Frontend (apps/app-mobile-web) — React + Vite
- **Auth**: Login/Register pages с auth guard routing
- **Main layout**: Header, AI Prompt bar, ListTabs, Search + Filter toolbar
- **TaskList + TaskCard**: полный рендер задач с subtasks, meta, priority icons
- **Quick add**: floating + button → inline input (Enter/Esc)
- **TaskEditModal**: полная форма редактирования (title, desc, priority, status, deadline, list, subtasks)
- **State**: Zustand (auth, UI) + TanStack Query (server data)
- **API client**: fetch wrapper с JWT auto-refresh при 401
- **UX updates (2026-03-15)**:
  - Hero input с мягкой анимацией collapsed/expanded.
  - Реальный search input: hotkey `Ctrl/Cmd+K`, `Esc`, clear `×`, фильтрация списка.
  - TaskCard использует ассеты из `src/assests` (clock/list/subtasks/ai_flash/back_svg-style bg via CSS gradients).
  - Inline-editing текста задачи/подзадач без смены визуального компонента.
  - Добавление подзадач через нижний `+` на карточке (автофокус + Enter chain).
  - My Day modal: bottom-sheet premium modal with mood, energy, wishes and live day profile radar.
  - Task click opens assistant modal with Visual/Editor tabs and MD editing area + assistant input.

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
│   └── app-mobile-web/         # React + Vite web frontend
│       ├── src/
│       │   ├── components/     # Header, TaskCard, ListTabs, AiPromptBar, MyDayModal (my-day/*), etc.
│       │   ├── hooks/          # TanStack Query hooks (queries.ts)
│       │   ├── lib/            # API client, types
│       │   ├── pages/          # LoginPage, RegisterPage, MainPage
│       │   ├── stores/         # Zustand stores (auth, ui)
│       │   └── styles/         # Global CSS
│       └── index.html          # Entry point
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

### Auth (`/auth`) — ✅ IMPLEMENTED
- `POST /auth/register` — email, password → user + tokens
- `POST /auth/login` — email, password → tokens
- `POST /auth/refresh` — refreshToken → новые tokens
- `POST /auth/logout` — инвалидировать refresh token (Bearer)
- `GET /auth/me` — текущий пользователь (Bearer)

### Lists (`/lists`) — ✅ IMPLEMENTED
- `GET /lists` — все списки пользователя (Bearer)
- `POST /lists` — создать список (Bearer)
- `PATCH /lists/:id` — обновить (Bearer)
- `DELETE /lists/:id` — soft-delete, задачи переносятся в "без списка" (Bearer)

### Tasks (`/tasks`) — ✅ IMPLEMENTED
- `GET /tasks?listId=&status=&priority=&dueToday=&noList=&search=` — задачи с фильтрами (Bearer)
- `GET /tasks/:id` — одна задача с subtasks (Bearer)
- `POST /tasks` — создать задачу (Bearer)
- `PATCH /tasks/:id` — обновить (Bearer)
- `DELETE /tasks/:id` — soft-delete (Bearer)

### Subtasks (`/tasks/:taskId/subtasks`) — ✅ IMPLEMENTED
- `GET /tasks/:taskId/subtasks` (Bearer)
- `POST /tasks/:taskId/subtasks` (Bearer)
- `PATCH /tasks/:taskId/subtasks/:id` (Bearer)
- `DELETE /tasks/:taskId/subtasks/:id` (Bearer)

### History (`/history`) — ✅ IMPLEMENTED
- `GET /history?entityType=&entityId=&limit=` — лог изменений (Bearer)

### AI Assistant (`/ai`) — ⏳ PLANNED
- `POST /ai/chat` — free-form запрос
- `POST /ai/plan` — сформировать план изменений
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

### Frontend (реализовано для web)
- **React 19 + Vite 6** — desktop web frontend
- **React Router DOM 7** — роутинг
- **Zustand** — клиентский state
- **TanStack Query (React Query)** — серверный state
- **CSS Modules** — pixel-perfect UI

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
