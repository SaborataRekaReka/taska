Ты — senior fullstack архитектор и разработчик. Создай production-grade приложение Task Manager с AI-ассистентом. Пиши код поэтапно, с понятной структурой, чистыми коммитами и README. Я хочу, чтобы проект было легко поддерживать и чтобы другим ИИ-агентам было максимально просто продолжать разработку.

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