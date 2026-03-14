Ты — senior fullstack архитектор и разработчик. Создай production-grade приложение Task Manager с AI-ассистентом. Пиши код поэтапно, с понятной структурой, чистыми коммитами и README. Я хочу, чтобы проект было легко поддерживать и чтобы другим ИИ-агентам было максимально просто продолжать разработку. Отражай выполненные шаги в этом плане и ту информацию, которая будет важна для понимания контекста моего проекта.

# 0) Главные приоритеты
1. Один язык на всем стэке: TypeScript.
2. Максимальная переносимость: iOS, Android, Browser, Windows (через web/PWA на Windows в MVP).
3. Современность, плавность UI, высокая скорость.
4. Простота для AI-агентов: предсказуемая структура, минимум магии, чистая архитектура.
5. MVP без публичных ссылок и без отправки задач другим пользователям.
6. AI-функции — только в safe mode (всегда через подтверждение пользователя).

# 1) Выбранный стек (обязательный)
## Monorepo
- pnpm workspace + Turborepo
- apps/
  - app-mobile-web: Expo (React Native + Expo Router + React Native Web) для iOS/Android/Web
  - api: NestJS (Fastify adapter) REST API
- packages/
  - ui (шареные компоненты/токены)
  - types (DTO/типы)
  - config (eslint/tsconfig/prettier)

## Backend
- NestJS + Fastify
- Prisma ORM
- PostgreSQL
- Redis (только для кэша/rate limit; без очередей в MVP)
- OpenAI API integration module

## Auth
- Email + password
- Google OAuth
- JWT access + refresh token
- Только роль USER
- Single-user режим в продуктовой логике (но архитектурно готово к multi-user)

## Frontend
- Expo Router
- Zustand для клиентского стейта (НЕ громоздкие React Context-цепочки)
- React Query (TanStack Query) для серверного стейта
- i18n: RU/EN
- UI: современный минималистичный, адаптивный

## Infra
- Docker Compose для локального запуска: postgres, redis, api, (опционально web)
- .env.example для всех приложений

# 2) MVP функционал (обязательный)
## Пользователь
- Регистрация/логин через email+password
- Логин через Google
- Профиль USER

## Задачи и списки
- Списки по умолчанию: "Работа", "Личное", "Без списка"
- Пользователь может создавать/редактировать/удалять свои списки
- Задачи: CRUD
- Поля задачи: title, description, priority, deadline, status, listId
- Подзадачи: CRUD
- История изменений задач и списков: хранить
- Вьюхи:
  - Все задачи
  - На сегодня (My Day)
  - Важные
  - Завершенные
  - По спискам
- Drag-and-drop НЕ делать в MVP

## Исключено в MVP
- Публичные ссылки
- Отправка/получение задач между пользователями
- Импорт/экспорт

# 3) AI-ассистент (ключевой модуь)
Интеграция через OpenAI API.

## Команды AI (обязательные)
1. Разложить задачи по спискам
2. Найти и предложить удалить неважные задачи
3. Повысить приоритет срочным
4. Улучшить формулировки задач
5. Разбить задачу на подзадачи
6. Предложить план на день
7. Показать статистику продуктивности
8. Найти важное (приоритетные/критичные задачи)

## Политика безопасности AI
- Только SAFE MODE:
  - AI никогда не применяет изменения сразу
  - сначала формирует "план изменений" (diff/preview)
  - пользователь подтверждает каждое пакетное действие
- Массовые destructive изменения только через явное подтверждение
- Поддержать откат пространства:
  - Механизм "undo last AI operation"
  - Хранить snapshots/changelog для отката

## Архитектура AI
- AI Planner: генерирует предложения
- AI Executor: применяет только подтвержденные действия
- AI Guardrails:
  - валидация структуры AI-ответа через JSON schema
  - запрет unsafe операций без confirm

# 4) Архитектурные требования
1. Clean module boundaries:
   - auth
   - users
   - lists
   - tasks
   - subtasks
   - history
   - ai-assistant
2. DTO + validation (class-validator/zod)
3. OpenAPI/Swagger для API
4. Единый error format
5. Логи + request-id
6. Миграции Prisma
7. Soft-delete для задач и списков (для восстановления/отката)

# 5) i18n
- Билингвально: RU и EN
- Все UI-строки через i18n словари
- Переключатель языка в настройках
- Дефолт по системному языку, fallback EN

# 6) Non-functional
- Production-grade coding standards
- Без написания автоматических тестов в MVP (по требованию)
- Но код должен быть организован так, чтобы тесты легко добавлялись позже
- Строгий линт, строгий tsconfig, no-any по умолчанию

# 7) DX и правила для AI-агентов
- Добавь AGENTS.md в корень:
  - структура проекта
  - как запускать
  - как добавлять фичи
  - coding conventions
  - commit conventions
- Пиши короткие понятные функции
- Не делай try/catch вокруг import
- Избегай скрытой магии и сложных абстракций
- Документируй решения в docs/architecture.md

# 8) План реализации (вывести и выполнить по этапам)
Этап A: bootstrap monorepo + docker + infra
Этап B: auth module (email/pass + google)
Этап C: lists/tasks/subtasks/history
Этап D: mobile-web UI (Expo) + i18n RU/EN
Этап E: AI planner/executor + safe confirm + undo
Этап F: polishing + docs + scripts

После каждого этапа:
- что сделано
- какие команды запуска
- какие env переменные нужны
- что осталось

# 9) Что выдать в результате
1. Полностью рабочий monorepo
2. docker-compose.yml
3. README.md (быстрый старт)
4. docs/architecture.md
5. AGENTS.md
6. Примеры API запросов (curl)
7. Seed script с демо-данными

Начни с Этапа A прямо сейчас.
# 10) Детальный пошаговый план дальнейшей реализации

Ниже — конкретный execution-план, чтобы любой агент мог продолжить разработку без потери контекста.

## 10.1 Принципы выполнения каждого шага
- Один шаг = один логический инкремент + один понятный коммит.
- Перед началом шага: `git status --short`, `git branch --show-current`.
- После шага: проверить сборку/линт по затронутым приложениям.
- Если команда не запускается из-за окружения — фиксировать причину в отчёте.
- Не переходить к следующему шагу, пока не закрыт Definition of Done текущего.

## 10.2 Этап A — Infra и фундамент (уточненный)
### A1. Привести backend к NestJS + Fastify
- Заменить временный HTTP shell на полноценный bootstrap NestJS.
- Добавить модули: `auth`, `users`, `lists`, `tasks`, `subtasks`, `history`, `ai-assistant`.
- Подключить глобальный `ValidationPipe`, `request-id` middleware/interceptor, единый error format.
- Подключить Swagger/OpenAPI.

Проверки:
- `npm run build` (в `apps/api`)
- запуск API и `GET /health`

Definition of Done:
- API стартует через NestJS/Fastify.
- `/health` работает.
- Swagger доступен.

### A2. Добавить Prisma + PostgreSQL schema v1
- Добавить `prisma/schema.prisma` и базовые сущности: User, List, Task, Subtask, History, AiOperation.
- Учесть `soft-delete` для lists/tasks.
- Добавить миграцию и seed с дефолтными списками: Работа/Личное/Без списка.

Проверки:
- `npm run build` (api)
- `prisma migrate dev`
- `prisma db seed`

Definition of Done:
- БД поднимается, миграции применяются, seed создаёт дефолтные данные.

### A3. Docker Compose для локального окружения
- Добавить `docker-compose.yml` (postgres, redis, api).
- Добавить `.env.example` для всех сервисов.
- Обновить README по запуску через docker.

Проверки:
- `docker compose up -d`
- healthcheck API/DB/Redis

Definition of Done:
- Новая среда стартует одной командой.

## 10.3 Этап B — Auth (email/password + Google)
### B1. Локальная аутентификация
- Регистрация, логин, refresh, logout.
- Хеширование паролей, валидация DTO, базовый rate-limit.

### B2. Google OAuth
- Endpoint для входа через Google.
- Нормализация профиля пользователя и линковка аккаунта.

### B3. Сессии и безопасность
- JWT access/refresh.
- Ротация refresh token.
- USER-only RBAC слой (с перспективой расширения).

Проверки:
- `npm run build` (api)
- ручные curl-проверки auth flow

Definition of Done:
- Пользователь может зарегистрироваться, залогиниться, обновить access token и войти через Google.

## 10.4 Этап C — Lists/Tasks/Subtasks/History
### C1. Lists CRUD
- Полный CRUD + ownership invariant.
- Защита от удаления системного «Без списка» без стратегии переноса задач.

### C2. Tasks CRUD
- Поля: title, description, priority, deadline, status, listId.
- Soft-delete + фильтрации для «Все», «На сегодня», «Важные», «Завершенные».

### C3. Subtasks CRUD
- CRUD подзадач.
- Проверка ацикличности при иерархии (если вложенность поддерживается).

### C4. History append-only
- Лог значимых изменений задач/списков.
- События упорядочены по времени и неизменяемы.

Проверки:
- `npm run build` (api)
- curl сценарии для CRUD

Definition of Done:
- Все CRUD сценарии работают и пишут историю.

## 10.5 Этап D — Frontend (Expo Router + RU/EN)
### D1. Инициализация Expo Router
- Настроить маршруты: auth, inbox/all tasks, my day, important, completed, lists, settings.
- Подключить Zustand + React Query.

### D2. UI и базовые экраны
- Экраны: список задач, детали задачи, управление списками, профиль.
- Современный минималистичный responsive UI.

### D3. i18n
- Словари RU/EN.
- Переключатель языка в settings.
- fallback EN.

Проверки:
- `npm run build` (app-mobile-web)
- `npm run lint` (app-mobile-web)

Definition of Done:
- Базовые пользовательские сценарии работают на web/mobile shell.

## 10.6 Этап E — AI Assistant (safe mode)
### E1. AI Planner
- Endpoint: принимает user prompt и возвращает структурированный `preview plan`.
- JSON schema validation AI-ответа.

### E2. AI Executor
- Применяет только подтвержденный план.
- Транзакционное выполнение изменений.

### E3. Guardrails + Undo
- Запрет destructive операций без explicit confirm.
- Сохранение checkpoint/операции.
- `undo last AI operation`.

Проверки:
- `npm run build` (api)
- ручные сценарии planner -> confirm -> execute -> undo

Definition of Done:
- AI не может изменить данные без подтверждения.
- Последнюю AI-операцию можно откатить.

## 10.7 Этап F — Polishing и документация
### F1. Наблюдаемость и DX
- Структурные логи.
- Корреляция запросов через request-id.
- npm scripts для типовых сценариев.

### F2. Документация
- README: быстрый старт (local + docker), env, команды.
- docs/architecture.md: актуализировать доменную схему и потоки.
- AGENTS.md: актуализировать workflow и conventions.
- Добавить примеры curl и сценарии проверки MVP.

### F3. Релизная готовность MVP
- Пройти чек-лист инвариантов.
- Убедиться, что исключённые MVP-фичи не попали в реализацию.

Definition of Done:
- Проект можно поднять с нуля по README.
- Документация соответствует фактическому состоянию кода.

## 10.8 Рекомендуемая последовательность коммитов
1. `feat(api): bootstrap nestjs fastify core`
2. `feat(api): add prisma schema and initial migration`
3. `feat(infra): add docker compose for local environment`
4. `feat(auth): implement email password auth with jwt`
5. `feat(auth): add google oauth flow`
6. `feat(lists): implement lists CRUD with ownership checks`
7. `feat(tasks): implement tasks CRUD and filters`
8. `feat(subtasks): implement subtasks CRUD`
9. `feat(history): add append-only history logging`
10. `feat(app): initialize expo router app shell`
11. `feat(app): implement task and list screens`
12. `feat(app): add i18n ru en support`
13. `feat(ai): add planner with safe preview`
14. `feat(ai): add executor confirm flow and undo`
15. `docs: finalize readme architecture and runbooks`

## 10.9 Чек-лист перед каждым PR
- Изменения ограничены задачей PR.
- Нет случайных временных файлов в `git diff`.
- Выполнены релевантные сборки/линты.
- Обновлены env/docs при необходимости.
- В PR описаны: что сделано, как проверено, ограничения окружения.
