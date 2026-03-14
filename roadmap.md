# roadmap.md — план разработки к рабочему фронтенду

> **Независимая оценка состояния проекта** на 2026-03-14.
>
> Документ создан на основе: анализа кодовой базы, дизайн-макетов UI, masterprompt, architecture.md.
>
> **Цель**: довести проект до рабочего MVP с реальным фронтендом.

---

## Раздел 1: Оценка текущего состояния

### Что реально сделано (A1-A3)
- ✅ Структура monorepo (pnpm + Turborepo)
- ✅ NestJS + Fastify bootstrap с 7 модулями-заглушками
- ✅ Prisma schema — полная доменная модель (User, List, Task, Subtask, History, AiOperation)
- ✅ Миграция БД и seed с дефолтными списками
- ✅ Docker Compose (postgres + redis + api)
- ✅ Core infrastructure: request-id, response envelope, error filter, Swagger

### Что НЕ сделано
- ❌ Бизнес-логика в **любом** модуле (все — заглушки с `/health`)
- ❌ JWT авторизация
- ❌ CRUD для lists/tasks/subtasks
- ❌ История изменений
- ❌ AI-ассистент
- ❌ Frontend (Expo shell пустой)

### Оценка готовности к фронтенду: **15%**
Фундамент заложен хорошо. Схема БД качественная. Но для фронтенда нужны работающие API.

---

## Раздел 2: Анализ дизайна (по скриншотам)

### Экраны и компоненты из дизайна

#### Главный экран (Task List)
```
┌─────────────────────────────────────────────────────┐
│  TASKA       [Мой день ✦]          [Выход] [Avatar] │
├─────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────┐ │
│  │ "Что бы вы хотели сделать?"  (AI prompt input)  │ │
│  │                                                 │ │
│  │ [Разобрать задачи] [Предложить план] [Найти важ]│ │
│  │ [Забыть о задачах] [Покажи статистику]          │ │
│  └─────────────────────────────────────────────────┘ │
│                                                      │
│  Без списка(2) | Мой день | Работа | Личное | ...  + │
│  ─────────────────────────────────────────────────   │
│                        [Поиск] [Фильтр]              │
│                                                      │
│  ┌─────────────────────────────────────────────────┐ │
│  │ ○  Task title (full text)                  ⚡ ⋮ │ │
│  │     ↪ 3  ⏰ 08.03.2025  ≡ Работа              │ │
│  │   ─ ○  Subtask 1                               │ │
│  │   ─ ○  Subtask 2                               │ │
│  └─────────────────────────────────────────────────┘ │
│                                                      │
│                         [+]                          │
└─────────────────────────────────────────────────────┘
```

**Выявленные компоненты:**
- Header с брендингом, кнопкой "Мой день", кнопкой выхода и аватаром
- AI prompt bar (textarea + quick action chips)
- List tabs (горизонтальный скролл, активная вкладка подчёркнута, бейдж с числом)
- Search + Filter toolbar
- Task card: checkbox, title, иконка срочности (⚡), контекстное меню (⋮)
- Task meta: subtask count (↪ N), deadline (⏰), list name (≡)
- Nested subtask items (с меньшим шрифтом)
- Floating action button (+)

#### Модальное окно "Мой день" (mood setup)
```
┌──────────────────────────────────────────────────────┐
│  Среда 14.03.2026                    ╲  radar chart  │
│                                       ╲              │
│  Как вы себя чувствуете?              ╲  Длительность│
│  [😊][😐][😔][😠][😤]   ← mood picker  ╲             │
│                          Важность ← [◈] → Срочность  │
│  Заряд энергии                        ╱             │
│  [████████░░░░░░░]  ← energy slider  ╱              │
│                                      ╱               │
│  Пожелания для ассистента:          ╱  Срочность     │
│  [Одно большое дело] [Ничего сложного]               │
│  [Только срочное] [Побольше поработать]              │
│  [Часто откладываемые] [+]                           │
│                                                      │
│  [Создать мой день ✦]  [Смотреть]                   │
└──────────────────────────────────────────────────────┘
```

**Выявленные компоненты:**
- DateDisplay (дата и день недели)
- MoodPicker (5 иконок настроения, одна выбрана)
- EnergySlider (горизонтальный слайдер)
- PreferencesChips (multi-select chips с + для добавления)
- RadarChart (3 оси: Важность, Срочность, Длительность)
- CTA: "Создать мой день" (primary), "Смотреть" (secondary)

#### AI Response Modal (Visual/Editor)
```
┌──────────────────────────────────────────────────────┐
│  [Визуально] [Редактор]                          [×] │
├──────────────────────────────────────────────────────┤
│                                                      │
│  ○  Task 1...                                        │
│  ○  Task 2...                                        │
│  ○  Task 3...                        [+]             │
│                                                      │
│  ─────────────────────────────────────────────────   │
│  [Create image] [Analyze data] [Make plan] [...]     │
│  ┌─────────────────────────────────────────────────┐ │
│  │ Что бы вы хотели сделать?                       │ │
│  └─────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────┘
```

В режиме **Редактор** — markdown-синтаксис:
```
- [ ] Задача
  - priority:: medium
  - due:: 2026-03-14
  - tags:: #product
  - subtasks::
    - [x] Подзадача 1
    - [ ] Подзадача 2
```

**Выявленные компоненты:**
- TabSwitcher (Визуально / Редактор)
- VisualTaskList (интерактивные задачи с чекбоксами)
- MarkdownEditor (с поддержкой task-синтаксиса)
- InlineAIToolbar (Create image, Analyze data, Make plan, Summarize, Help write, More)
- NestedAIPrompt (внутренний prompt input)

#### "Мой день" — после создания
- Toolbar с кнопками "Изменить баланс" и "Сохранить"
- Список задач без AI prompt bar сверху

---

## Раздел 3: Дорожная карта (фазы)

### Фаза B: Auth API (1-2 дня)
**Цель:** пользователь может зарегистрироваться и войти.

#### B1 — Email/Password Auth
- [ ] `PrismaModule` (global, injectable сервис)
- [ ] `POST /auth/register` — создание пользователя, bcrypt hash
- [ ] `POST /auth/login` — проверка пароля, выдача JWT
- [ ] `POST /auth/logout` — инвалидация refresh token
- [ ] `POST /auth/refresh` — rotation refresh token
- [ ] `GET /auth/me` — профиль текущего пользователя
- [ ] `JwtAuthGuard` — защита приватных роутов
- [ ] DTO: `RegisterDto`, `LoginDto`, `TokenPairDto`

**Env:** `JWT_SECRET`, `JWT_ACCESS_TTL` (15m), `JWT_REFRESH_TTL` (7d)

**Definition of Done:**
- curl: register → login → /me возвращает пользователя
- Все остальные модули защищены guard

#### B2 — Google OAuth (опционально, после фронтенда)
- Отложить до реализации frontend OAuth flow

---

### Фаза C: Core CRUD API (3-5 дней)
**Цель:** полноценный API для работы с задачами.

#### C1 — Lists CRUD
- [ ] `GET /lists` — только активные (`deletedAt IS NULL`), отсортированные
- [ ] `POST /lists` — создать список
- [ ] `PATCH /lists/:id` — переименовать
- [ ] `DELETE /lists/:id` — soft-delete (запрет на системный "Без списка")
- [ ] Ownership check на каждой операции
- [ ] History event при каждой мутации

**Definition of Done:** CRUD работает, "Без списка" нельзя удалить

#### C2 — Tasks CRUD + Filters
- [ ] `GET /tasks` с query params:
  - `listId` — по конкретному списку
  - `status` — TODO | IN_PROGRESS | DONE
  - `priority` — LOW | MEDIUM | HIGH | CRITICAL
  - `dueToday=true` — задачи на сегодня (deadline = today)
  - `search` — fulltext по title
  - `noList=true` — задачи без списка
- [ ] `POST /tasks` — создать задачу
- [ ] `PATCH /tasks/:id` — частичное обновление любых полей
- [ ] `DELETE /tasks/:id` — soft-delete
- [ ] Ownership check
- [ ] History event при каждой мутации

**Definition of Done:** фильтры работают корректно, история пишется

#### C3 — Subtasks CRUD
- [ ] `GET /tasks/:id/subtasks`
- [ ] `POST /tasks/:id/subtasks`
- [ ] `PATCH /tasks/:id/subtasks/:subId`
- [ ] `DELETE /tasks/:id/subtasks/:subId`
- [ ] Ownership + parent task ownership check

**Definition of Done:** subtask нельзя создать для чужой задачи

#### C4 — History read API
- [ ] `GET /history?entityType=&entityId=&limit=20` — лог изменений
- [ ] Service метод `recordEvent(...)` используется во всех мутациях C1-C3

**Definition of Done:** каждое действие пишет в History, лог читаем

---

### Фаза D: Frontend — Expo Router (5-8 дней)
**Цель:** рабочий web-фронт с основными экранами.

#### D0 — Инициализация Expo Router
- [ ] Инициализировать Expo проект в `apps/app-mobile-web` (заменить текущую заглушку)
- [ ] Настроить Expo для web-first (Metro + React Native Web)
- [ ] Подключить `@taska/types` и `@taska/ui`
- [ ] Настроить Zustand и TanStack Query
- [ ] Настроить API клиент (axios/fetch wrapper с base URL)
- [ ] i18n setup (RU/EN, дефолт — RU)

**Файловая структура роутов:**
```
apps/app-mobile-web/app/
├── (auth)/
│   ├── login.tsx
│   └── register.tsx
├── (app)/
│   ├── _layout.tsx          # Header + nav tabs
│   ├── index.tsx            # Главный экран (Все задачи)
│   ├── my-day.tsx           # Мой день
│   ├── lists/
│   │   └── [id].tsx         # Задачи конкретного списка
│   └── settings.tsx
└── _layout.tsx              # Auth guard
```

#### D1 — Auth screens
- [ ] `LoginScreen` — форма email + password + кнопка Google (placeholder)
- [ ] `RegisterScreen` — форма регистрации
- [ ] Auth store (Zustand): `user`, `accessToken`, `refreshToken`, методы `login/logout`
- [ ] Token refresh interceptor (автоматический refresh при 401)

#### D2 — Main Layout
- [ ] `Header` — логотип TASKA, кнопка "Мой день ✦", выход, аватар
- [ ] `ListTabs` — горизонтальный скролл с tabs: Без списка(N) | Мой день | [пользовательские списки] | +
- [ ] `SearchBar` — input с иконкой лупы и kbd shortcut
- [ ] `FilterButton` — кнопка с dropdown фильтров

#### D3 — Task list + Task card
- [ ] `TaskCard` компонент:
  - Checkbox для toggle status
  - Title (полный текст, без truncate)
  - Priority badge (⚡ для срочных)
  - Context menu (⋮): редактировать, удалить, перенести в список
  - Meta строка: subtask count (↪ N), deadline (⏰ DD.MM.YYYY), list name (≡)
- [ ] `SubtaskItem` — nested, меньший шрифт, checkbox
- [ ] `TaskList` — список с `FlatList` / `ScrollView`
- [ ] `FloatingAddButton` (+) — открывает quick create task

#### D4 — Task creation/editing
- [ ] Quick add (inline, по нажатию +): title → Enter → создать
- [ ] Full task form (по tap на задачу или из меню):
  - Title, Description
  - Priority picker
  - Deadline picker (DatePicker)
  - List selector
  - Subtasks section
- [ ] Optimistic updates + rollback при ошибке

#### D5 — "Мой день" modal
- [ ] `MyDaySetupModal` с:
  - DateDisplay (день недели + дата)
  - `MoodPicker` (5 emoji кнопок)
  - `EnergySlider` (0-100)
  - `PreferencesChips` (multi-select)
  - `RadarChart` (SVG/Canvas, оси: Важность, Срочность, Длительность)
  - Кнопка "Создать мой день ✦" → POST /ai/plan
  - Кнопка "Смотреть" → просто показывает задачи дня

#### D6 — AI Prompt bar + Response modal
- [ ] `AIPromptBar` (textarea) с quick-action chips:
  - Разобрать задачи
  - Предложить план на день
  - Найти важное
  - Забыть о задачах
  - Покажи статистику
- [ ] `AIResponseModal` с TabSwitcher (Визуально / Редактор):
  - **Визуально**: интерактивные task items с подтверждением
  - **Редактор**: markdown editor с task-синтаксисом
  - Нижняя toolbar: Create image, Analyze data, Make plan, ...
  - Кнопка закрытия [×]
- [ ] AI confirm/execute flow в UI

---

### Фаза E: AI Assistant (3-5 дней)
**Цель:** рабочий AI safe-mode.

#### E1 — AI Planner endpoint
- [ ] `POST /ai/chat` — free-form запрос, возвращает текст или структурированный plan
- [ ] `POST /ai/plan` — принимает `{ prompt, context: { tasks, preferences } }`, возвращает `AiOperationDto` с `planPayload`
- [ ] JSON schema validation ответа OpenAI
- [ ] Обработка ошибок OpenAI API (timeout, rate limit)

#### E2 — AI Executor
- [ ] `POST /ai/operations/:id/confirm` → status = CONFIRMED
- [ ] `POST /ai/operations/:id/execute` → транзакционно применяет `planPayload`, пишет History
- [ ] Поддерживаемые типы операций в `planPayload`:
  - `CREATE_TASK`, `UPDATE_TASK`, `DELETE_TASK`
  - `MOVE_TASK` (сменить список)
  - `SET_PRIORITY`, `SET_DEADLINE`
  - `CREATE_SUBTASKS`

#### E3 — Undo
- [ ] `POST /ai/operations/:id/undo` → читает snapshot из `planPayload`, откатывает изменения, пишет History с `AI_UNDONE`

---

### Фаза F: Statistics + Polish (2-3 дня)

#### F1 — Statistics API
- [ ] `GET /stats/daily` — для radar chart в "Мой день":
  - `urgentCount`, `importantCount`, `overdueCount`, `completedToday`, `totalActive`
  - Radar data: `{ importance, urgency, duration }` нормализованные 0-1
- [ ] `GET /stats/overview` — общая статистика для AI prompt "Покажи статистику"

#### F2 — Frontend polish
- [ ] Skeleton loaders при загрузке данных
- [ ] Empty states (экраны без задач)
- [ ] Error boundaries + toast уведомления
- [ ] Keyboard shortcuts (search, add task)
- [ ] Gradient background (как в дизайне: светло-лиловый → белый → светло-зелёный)
- [ ] Responsive breakpoints (mobile / tablet / desktop)

---

## Раздел 4: Приоритизированный беклог

### P0 — Без этого ничего не работает
1. `PrismaModule` + `PrismaService` (injectable, global)
2. `JwtAuthGuard` + JWT стратегия
3. `POST /auth/register` + `POST /auth/login`
4. `GET /lists` + `GET /tasks` (с базовыми фильтрами)
5. `POST /tasks` + `PATCH /tasks/:id`
6. Инициализация Expo + TanStack Query + Zustand

### P1 — Базовый UX работает
7. `POST /lists`, `PATCH/DELETE /lists/:id`
8. `DELETE /tasks/:id` (soft)
9. Subtasks API (полный CRUD)
10. TaskCard с subtask items
11. Floating add button + quick create
12. Auth screens (login/register)

### P2 — Ключевые фичи
13. History recording на всех мутациях
14. "Мой день" modal (mood + energy + prefs)
15. AI Prompt bar + chips
16. `POST /ai/plan` + confirm + execute
17. AI Response modal (Visual/Editor tabs)

### P3 — Полный MVP
18. `POST /ai/operations/:id/undo`
19. Statistics endpoints + Radar chart
20. Search + Filter UI
21. Settings screen (язык, профиль)
22. Google OAuth (B2)
23. Polish: skeleton, empty states, toasts

---

## Раздел 5: Технические решения для фронтенда

### Выбор: Expo vs Next.js
**Решение:** оставить Expo Router (как в masterprompt) с фокусом на web.

Причины:
- Masterprompt явно требует Expo для iOS/Android/Web
- React Native Web даёт единый компонентный код
- Expo Router работает как file-based router (аналог Next.js App Router)

**Web-first настройки:**
```json
// app.json
{
  "expo": {
    "web": {
      "bundler": "metro",
      "output": "single"
    }
  }
}
```

### State management
- **Zustand**: auth state, UI state (active tab, modal open/closed)
- **TanStack Query**: все серверные данные (tasks, lists, AI operations)
- Ключи запросов: `['tasks', { listId, status, ... }]`, `['lists']`, `['ai-operations']`

### API клиент
```typescript
// packages/api-client/src/index.ts (или apps/app-mobile-web/lib/api.ts)
const apiClient = axios.create({
  baseURL: process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000',
});
// Interceptor: добавлять Authorization header из Zustand store
// Interceptor: refresh token при 401
```

### Стилизация
Дизайн использует:
- Мягкий градиентный фон (lila → white → soft green)
- Белые карточки с тенью
- Минималистичный шрифт (Inter или системный sans-serif)
- Тёмные кнопки (чёрный fill) для primary CTA
- Светлые pill-кнопки для secondary actions

Реализация: `StyleSheet` React Native + `LinearGradient` для фона + система токенов в `@taska/ui`.

### RadarChart
Использовать `react-native-svg` + ручная SVG-отрисовка (простой polygon radar).

### Markdown Editor (AI Editor tab)
`@uiw/react-codemirror` или простой `<TextInput multiline>` с syntax highlighting через react-native-syntax-highlighter.

---

## Раздел 6: Шаблон обновления этого файла

После завершения каждой фазы агент должен:
1. Поставить ✅ напротив завершённых пунктов беклога
2. Обновить "Оценку готовности к фронтенду" в Разделе 1
3. Обновить таблицу статусов в `AGENTS.md` (Раздел 2)
4. Обновить таблицу реализации в `architecture.md` (Раздел 11)

---

## Раздел 7: Критический путь к демо

Минимальный путь, чтобы показать рабочее приложение:

```
B1 (Auth API)
  → C1 (Lists API)
  → C2 (Tasks API basic)
  → D0 (Expo init)
  → D1 (Auth screens)
  → D2 (Layout + tabs)
  → D3 (Task list + card)
  → D4 (Quick add task)
  ─────────────────────
  DEMO READY: ~10-12 дней разработки
```

После демо добавляются:
- C3/C4 (Subtasks + History)
- D5 (Мой день modal)
- D6 (AI prompt)
- E1-E3 (AI safe-mode)
- F1-F2 (Stats + Polish)
