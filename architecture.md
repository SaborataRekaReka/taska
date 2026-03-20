# architecture.md — архитектура системы TASKA

> Этот документ — единственный источник правды об архитектурных решениях. Обновляется агентом после каждого значимого изменения.
>
> **Последнее обновление:** 2026-03-20 | **Стадия:** B2+C1-C4 + D0-D6 завершены, E1-E2 AI safe-mode foundation + frontend chat реализованы

---

## 1) Назначение документа

Фиксирует устойчивый архитектурный контекст:
- как устроена система, где границы модулей;
- какие инварианты нельзя ломать;
- текущее состояние реализации;
- что реализовано, что запланировано.

---

## 2) Продуктовый контекст

**TASKA** — менеджер задач для одного пользователя с AI-ассистентом.

### Ключевые сценарии (MVP)
1. Управление списками задач (Работа, Личное, Без списка + пользовательские)
2. Задачи с приоритетом, дедлайном, статусом и подзадачами
3. "Мой день" — персонализированный дневной план через AI
4. AI-ассистент в safe-mode: анализ → предложение плана → подтверждение → выполнение
5. История изменений + undo последней AI-операции

### Исключено из MVP
- Публичные ссылки на задачи
- Отправка/получение задач другим пользователям
- Импорт/экспорт
- Автоматические тесты (код должен быть тестируемым)

---

## 3) Технологический стек

### Монорепозиторий
| Инструмент | Версия | Роль |
|-----------|--------|------|
| pnpm workspaces | 9+ | Управление зависимостями |
| Turborepo | 2+ | Orchestration, кэш сборок |
| TypeScript | 5+ | Единый язык всего стека |

### Backend (`apps/api`)
| Инструмент | Версия | Роль |
|-----------|--------|------|
| NestJS | 11 | Web-framework (DI, modules, pipes) |
| Fastify | 5 | HTTP-адаптер (быстрый, низкий overhead) |
| Prisma ORM | 6 | Типобезопасный доступ к БД |
| PostgreSQL | 16 | Основная СУБД |
| Redis | 7 | Кэш / rate-limit (в MVP пассивен) |
| class-validator | 0.14 | Валидация DTO |
| @nestjs/swagger | 11 | OpenAPI документация |

### Frontend (`apps/app-mobile-web`) — реализовано (web-first)
| Инструмент | Версия | Роль |
|-----------|--------|------|
| React | 19 | UI runtime |
| Vite | 6 | Dev server / build |
| React Router DOM | 7 | Роутинг, auth landing и callback flow |
| Zustand | 5+ | Клиентский state |
| TanStack Query | 5+ | Серверный state, кэш, invalidation |
| CSS Modules | — | Pixel-perfect стили и токены |

### Frontend UX-срез (актуально)
- Pixel-perfect desktop layout (base 1440), собственные дизайн-токены и градиентный фон.
- Hero panel с анимированным сворачиванием/раскрытием, локальной AI chat-лентой и proposal cards safe-mode c task-preview в UI карточки (редактирование плана без MD).
- Все AI UX-потоки показывают единый lightweight processing indicator ("Думает..."/контекстный статус) во время plan/revise/execute ожидания.
- Списки и карточки задач с inline-editing текста (задачи/подзадачи).
- Добавление подзадач через контекстный `+` в карточке, автофокус и Enter-flow.
- Реальный поиск по title/list/subtasks + UX-хоткеи (`Ctrl/Cmd+K`, `Esc`, clear).
- Модалка "Мой день": bottom-sheet открытие, Mood/Energy/Wishes controls, computeDayProfile и diamond-radar визуализация профиля дня.
- Task AI modal: открытие по клику на карточку, вкладки Visual/Editor, редактирование задачи в markdown и отдельная chat/prompt панель по конкретной задаче.
- Public auth landing + Google callback page для web OAuth-входа.

### Shared packages
| Пакет | Роль |
|-------|------|
| `@taska/types` | Shared DTO и enum-типы между frontend и backend |
| `@taska/ui` | Дизайн-токены, shared компоненты |
| `@taska/config` | tsconfig, eslint presets |

---

## 4) Системная схема

```
┌─────────────────────────────────────────────────────┐
│                    TASKA Client                      │
│  Expo Router (web/iOS/Android)                       │
│  Zustand (local state) + TanStack Query (server)     │
└──────────────────────┬──────────────────────────────┘
                       │ HTTP REST /api/v1
                       ▼
┌─────────────────────────────────────────────────────┐
│               NestJS API (Fastify)                   │
│  ┌───────────────┐ ┌───────┐ ┌───────┐ ┌──────┐ ┌────────┐  │
│  │ auth + google │ │ users │ │ lists │ │tasks │ │subtasks│  │
│  └──────┘ └───────┘ └───────┘ └──────┘ └────────┘  │
│  ┌─────────┐ ┌──────────────────┐                   │
│  │ history │ │  ai-assistant    │                   │
│  └─────────┘ └──────────────────┘                   │
│                                                      │
│  Core: ValidationPipe, RequestId, ResponseEnvelope,  │
│        UnifiedErrorFilter                            │
└──────────────────────┬──────────────────────────────┘
            ┌──────────┴──────────┐
            ▼                     ▼
    ┌──────────────┐     ┌──────────────┐
    │  PostgreSQL  │     │    Redis     │
    │  (Prisma)    │     │  (кэш/RL)   │
    └──────────────┘     └──────────────┘
                                │
                     ┌──────────┴──────────┐
                     ▼                     ▼
             ┌─────────────┐     ┌──────────────────┐
             │  OpenAI API │     │  Google OAuth     │
             │ (Responses + │     │  (implemented)    │
             │ JSON schema) │     │                  │
             └─────────────┘     └──────────────────┘
```

---

## 5) Доменная модель (Prisma schema)

### User
```
id, email, passwordHash?, displayName?, provider (LOCAL|GOOGLE), providerUserId?, avatarUrl?, givenName?, familyName?, emailVerified, createdAt, updatedAt
```
Связи: lists[], tasks[], subtasks[], historyEvents[], aiOperations[]

### List
```
id, userId, name, isDefault, deletedAt?, createdAt, updatedAt
```
Инвариант: `(userId, name)` уникален. Soft-delete через `deletedAt`.

### Task
```
id, userId, listId?, title, description?, priority (LOW|MEDIUM|HIGH|CRITICAL), deadline?, status (TODO|IN_PROGRESS|DONE), deletedAt?, createdAt, updatedAt
```
Soft-delete через `deletedAt`. `listId` nullable (задача без списка).

### Subtask
```
id, userId, taskId, parentTaskId?, title, status (TODO|IN_PROGRESS|DONE), createdAt, updatedAt
```
Инвариант: `userId` subtask = `userId` task. Цикличность запрещена.

### History (append-only)
```
id, userId, entityType (LIST|TASK|SUBTASK|AI_OPERATION), entityId, actionType (CREATED|UPDATED|DELETED|RESTORED|AI_EXECUTED|AI_UNDONE), payload (JSON), createdAt
```
Инвариант: записи неизменяемы (нет `updatedAt`).

### AiOperation
```
id, userId, taskId?, scope (GLOBAL|TASK), operationType, model?, prompt, planPayload (JSON), executionPayload?, undoPayload?, status (PLANNED|CONFIRMED|EXECUTED|UNDONE|FAILED), approvedAt?, executedAt?, undoneAt?, failedAt?, errorMessage?, createdAt
```

---

## 6) API контракты

### 6.1 Конверт ответа (стандарт)

Успех:
```json
{ "data": { ... }, "meta": { "requestId": "..." } }
```

Ошибка:
```json
{ "error": { "code": "NOT_FOUND", "message": "..." }, "meta": { "requestId": "..." } }
```

Коды ошибок: `VALIDATION_ERROR`, `NOT_FOUND`, `UNAUTHORIZED`, `FORBIDDEN`, `CONFLICT`, `INTERNAL_ERROR`

### 6.2 Стандартные HTTP-заголовки
- `x-request-id` — UUID на каждый запрос (генерируется если не передан)
- `Authorization: Bearer <accessToken>` — для защищенных эндпоинтов

### 6.3 Базовый URL: `/api/v1` (планируется)

### 6.4 Контракты модулей

#### Auth
| Method | Path | Auth | Статус |
|--------|------|------|--------|
| POST | `/auth/register` | — | ✅ done |
| POST | `/auth/login` | — | ✅ done |
| GET | `/auth/google/start` | — | ✅ done |
| GET | `/auth/google/callback` | — | ✅ done |
| POST | `/auth/refresh` | — | ✅ done |
| POST | `/auth/logout` | Bearer | ✅ done |
| GET | `/auth/me` | Bearer | ✅ done |

Register/Login response:
```json
{
  "data": {
    "user": { "id": "...", "email": "...", "displayName": "...", "avatarUrl": "...", "provider": "GOOGLE" },
    "accessToken": "...",
    "refreshToken": "..."
  }
}
```

#### Lists
| Method | Path | Auth | Статус |
|--------|------|------|--------|
| GET | `/lists` | Bearer | ✅ done |
| POST | `/lists` | Bearer | ✅ done |
| PATCH | `/lists/:id` | Bearer | ✅ done |
| DELETE | `/lists/:id` | Bearer | ✅ done |

#### Tasks
| Method | Path | Query params | Статус |
|--------|------|------|--------|
| GET | `/tasks` | `listId`, `status`, `priority`, `dueToday`, `noList`, `search` | ✅ done |
| GET | `/tasks/:id` | — | ✅ done |
| POST | `/tasks` | — | ✅ done |
| PATCH | `/tasks/:id` | — | ✅ done |
| DELETE | `/tasks/:id` | — | ✅ done |

#### Subtasks
| Method | Path | Статус |
|--------|------|--------|
| GET | `/tasks/:taskId/subtasks` | ✅ done |
| POST | `/tasks/:taskId/subtasks` | ✅ done |
| PATCH | `/tasks/:taskId/subtasks/:id` | ✅ done |
| DELETE | `/tasks/:taskId/subtasks/:id` | ✅ done |

#### AI Assistant
| Method | Path | Описание | Статус |
|--------|------|----------|--------|
| POST | `/ai/chat` | Free-form чатовый endpoint | ⏳ planned |
| POST | `/ai/plan` | Структурированный план изменений через OpenAI без мутаций | ✅ foundation |
| POST | `/ai/operations/:id/revise` | Ревизия pending-плана до confirm | ✅ foundation |
| GET | `/ai/operations/:id` | Детали AI-операции, preview/execution/undo payload | ✅ foundation |
| POST | `/ai/operations/:id/confirm` | Подтвердить план | ✅ foundation |
| POST | `/ai/operations/:id/execute` | Применить детерминированно backend-сервисами | ✅ foundation |
| POST | `/ai/operations/:id/undo` | Откатить AI-операцию | ✅ foundation |

#### Statistics (для "Мой день")
| Method | Path | Статус |
|--------|------|--------|
| GET | `/stats/daily` | ⏳ planned |
| GET | `/stats/overview` | ⏳ planned |

---

## 7) Потоки данных

### 7.1 CRUD-поток (общий)
```
UI action
  → TanStack Query mutation
  → POST/PATCH/DELETE /api/v1/...
  → NestJS: ValidationPipe → Auth Guard → Controller → Service
  → Prisma → PostgreSQL
  → History event (append)
  → Response envelope
  → TanStack Query cache invalidation
  → UI re-render
```

### 7.2 AI safe-mode поток
```
1. Пользователь вводит запрос в AI prompt bar
2. POST /ai/plan → OpenAI возвращает structured preview и сохраняется AiOperation(status=PLANNED)
3. UI показывает preview (карточка / Visual / Editor view)
4. Пользователь редактирует план (опц.) через POST /ai/operations/:id/revise
5. Пользователь нажимает "Подтвердить"
6. POST /ai/operations/:id/confirm → статус CONFIRMED
7. POST /ai/operations/:id/execute → backend детерминированно применяет изменения через services и пишет History
8. UI показывает результат + кнопку "Отменить"
9. (опц.) POST /ai/operations/:id/undo → откатывает через сохраненный undoPayload
```

### 7.3 "Мой день" поток
```
1. Пользователь открывает экран "Мой день"
2. Модальное окно: настройка настроения / заряда / предпочтений
3. POST /ai/plan с контекстом [настроение, энергия, предпочтения, все задачи]
4. AI формирует персонализированный дневной план
5. Пользователь нажимает "Создать мой день"
6. Plan применяется через confirm → execute поток
7. Экран "Мой день" показывает radar chart (важность/срочность/длительность)
```

---

## 8) Инварианты системы (нельзя нарушать)

| # | Инвариант | Описание |
|---|-----------|----------|
| 1 | **Ownership** | `userId` проверяется на каждом запросе к приватным данным |
| 2 | **AI safe-mode** | AI не применяет изменения без `status = CONFIRMED` |
| 3 | **Soft-delete** | List и Task удаляются через `deletedAt`, не физически |
| 4 | **History append-only** | Записи истории не изменяются и не удаляются |
| 5 | **Cycle prevention** | Иерархия subtask ациклична |
| 6 | **Response envelope** | Все ответы через единый `{ data, error, meta }` |
| 7 | **Request tracing** | Каждый запрос имеет `x-request-id` |
| 8 | **Default lists** | "Без списка" не может быть удален без явной стратегии |

---

## 9) Нефункциональные требования

- Предсказуемая структура кода (предсказуемо для AI-агентов)
- TypeScript strict, no-any
- ESM modules (`.js` в import paths)
- Конфигурация через env-переменные
- Миграции — только через Prisma migrate
- Логи структурированные + `x-request-id` корреляция
- Swagger/OpenAPI актуален

---

## 10) Зоны повышенного риска при изменениях

1. **API контракты** — breaking changes ломают frontend
2. **Prisma schema** — нужна новая миграция, seed нужно актуализировать
3. **Auth middleware** — ошибка = уязвимость или lock-out
4. **AI execute flow** — план формируется через OpenAI, но применяется только backend-кодом после confirm
5. **History** — нельзя менять существующие записи

---

## 11) Текущий статус реализации

### Backend модули
| Модуль | Health | Auth | CRUD | Filters | History |
|--------|--------|------|------|---------|---------|
| auth | ✅ | ✅ | ✅ | — | — |
| users | ✅ | ✅ | ✅ | — | — |
| lists | ✅ | ✅ | ✅ | — | ✅ |
| tasks | ✅ | ✅ | ✅ | ✅ | ✅ |
| subtasks | ✅ | ✅ | ✅ | — | ✅ |
| history | ✅ | ✅ | ✅ | ✅ | — |
| ai-assistant | ✅ | ✅ | 🟡 safe-mode foundation | — | ✅ |

### Infrastructure
| Компонент | Статус |
|-----------|--------|
| NestJS bootstrap | ✅ |
| Fastify adapter | ✅ |
| ValidationPipe (global) | ✅ |
| RequestId middleware | ✅ |
| ResponseEnvelope interceptor | ✅ |
| UnifiedErrorFilter | ✅ |
| Swagger/OpenAPI | ✅ |
| Prisma schema v1 | ✅ |
| DB migration 0001_init | ✅ |
| Seed script | ✅ |
| Docker Compose | ✅ |
| .env.example | ✅ |
| Auth guard (JWT) | ✅ |
| PrismaModule (global) | ✅ |
| CORS enabled | ✅ |
| Rate limiting | ⏳ |

---

## 12) Эволюция (пост-MVP)

1. Single-user → multi-user (архитектурно готово через `userId` на всех сущностях)
2. Redis для session store и rate-limit
3. Улучшение Google OAuth: state signing + one-time auth bridge вместо query tokens
4. AI-pipeline в отдельный сервис при нагрузке
5. Feature flags для рискованных фич
6. Метрики, SLO, алерты
