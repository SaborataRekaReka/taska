# ListTabs + Drag-and-Drop Reorder — архитектура блока

Этот документ описывает текущую реализацию блока `ListTabs` в web-клиенте TASKA, включая режим редактирования списков и кастомный drag-and-drop без сторонних библиотек.

---

## Обзор

`ListTabs` — верхний навигационный блок главной страницы со следующими задачами:

1. Переключение между мета-списками (`Мой день`, `Все`) и пользовательскими списками.
2. Добавление нового списка.
3. Режим `Редактировать`: переименование и изменение порядка списков.
4. Панель фильтров второй строки: поиск, срочность, приоритет.
5. Горизонтальный drag-scroll вкладок при переполнении.

Ключевая UX-идея: в обычном режиме список ведёт себя как tab-navigation, в режиме редактирования остаётся визуально тем же блоком, но активируются inline-edit и “живой” reorder.

---

## Файловая структура

```
apps/app-mobile-web/src/
├── components/
│   ├── ListTabs.tsx               # Логика и рендер блока
│   ├── ListTabs.module.css        # Стили, анимации, состояния drag/reorder
│   ├── GRADIENT_BLOB_README.md    # Референсный формат документации
│   └── LIST_TABS_README.md        # Этот документ
├── stores/
│   └── ui.ts                      # Zustand-стор: списки, фильтры, reorder API
└── assests/
    ├── edit_2.svg
    └── clock.svg
```

---

## Зависимости от Zustand (`ui.ts`)

`ListTabs` использует стор как источник данных и интерфейс мутаций:

| Поле / метод | Назначение |
|---|---|
| `demoLists` | Исходный порядок и названия пользовательских списков |
| `activeListId` | Текущий выбранный список |
| `setActiveList` | Переключение активного списка |
| `addDemoList` | Создание нового списка |
| `renameDemoList` | Переименование списка |
| `reorderDemoLists` | Перемещение списка относительно другого |
| `searchQuery`, `setSearch` | Поисковая строка |
| `filterUrgency`, `setFilterUrgency` | Фильтр срочности |
| `filterPriority`, `setFilterPriority` | Фильтр приоритета |
| `isTempListVisible`, `saveTempList` | Логика временного списка |

---

## Режимы блока

`listsPanelMode`:

| Режим | Поведение |
|---|---|
| `default` | Навигация по спискам, drag-scroll при переполнении |
| `rename` | Клик по названию включает `input`, ручка `⋮⋮` включает reorder |

При выходе из `rename`:

1. Коммитятся переименования через `renameDemoList`.
2. Завершается активный reorder-сеанс (если был).
3. Сбрасываются локальные временные состояния.

---

## Рендер-пайплайн списков

1. Из `demoLists` формируется базовый порядок `tabOrder`.
2. В начало добавляются мета-табы `my-day`, `all`.
3. В зависимости от контекста могут быть скрыты специальные табы.
4. Вычисляется `renameableTabIds` (только пользовательские табы).
5. Во время drag в `rename` строится `renderedTabs`:
   - мета-табы остаются на месте,
   - reorderable-подмножество берётся из `reorderPreviewIds`.

Итог: пользователь видит живую локальную перестановку до коммита в стор.

---

## Drag-and-Drop без библиотек

### 1) Модель сеанса

```ts
interface ReorderDragSession {
  listId: string;
  pointerId: number;
  startClientX: number;
  currentClientX: number;
  startScrollLeft: number;
  currentScrollLeft: number;
  hasMoved: boolean;
}
```

Состояния:

- `reorderDrag` — реактивное состояние для рендера.
- `reorderPreviewIds` — временный порядок во время перетаскивания.
- `reorderDragRef` / `reorderPreviewRef` — актуальные значения для pointer-обработчиков без stale-closure.

### 2) Старт перетаскивания

`startListReorderDrag` вызывается на `onPointerDown` у ручки `⋮⋮`:

1. Проверяет, что включён режим `rename`.
2. Проверяет, что список reorderable.
3. Захватывает pointer через `setPointerCapture(pointerId)`.
4. Создаёт `ReorderDragSession`.
5. Инициализирует preview-порядок (`reorderPreviewIds`).

### 3) Живое перемещение

`moveDraggedList(clientX, pointerId)` вызывается на `onPointerMove`:

1. Проверяет активный session/pointer.
2. Делает автоскролл ленты при приближении к левому/правому краю.
3. Берёт текущий порядок (`reorderPreviewRef.current` или baseline).
4. Удаляет из него перетаскиваемый id.
5. Ищет `insertIndex` по центрам соседних табов (`rect.left + rect.width / 2`).
6. Вставляет id в найденную позицию.
7. Обновляет session (`currentClientX`, `currentScrollLeft`, `hasMoved`).
8. Если порядок изменился, обновляет preview и запускает FLIP-анимацию соседей.

### 4) FLIP-анимация соседей

`animateReorderShift(firstLeftById, draggedId)`:

1. Перед перестановкой снимает `first`-позиции элементов.
2. После обновления preview в `requestAnimationFrame` получает `last`-позиции.
3. Для каждого соседнего таба анимирует `transform: translateX(delta) -> 0`.
4. Используется easing `cubic-bezier(0.22, 1, 0.36, 1)` и длительность ~220ms.

Это создаёт эффект “подстраивания” других табов под движущийся элемент.

### 5) Завершение

`finishReorderDrag(applyResult)` вызывается из:

- `onPointerUp` (обычное завершение),
- `onPointerCancel`,
- `onLostPointerCapture`.

Логика:

1. Если `applyResult=true` и было движение, вызывается `commitReorder(preview)`.
2. `commitReorder` синхронизирует финальный порядок в стор через серию `reorderDemoLists(..., 'before')`.
3. Состояния drag/preview очищаются.
4. Включается кратковременное подавление click (`suppressTabClickRef`) для защиты от ложного клика после drag.

---

## Визуальная часть drag/reorder

Классы в `ListTabs.module.css`:

| Класс | Роль |
|---|---|
| `.tabDragSource` | Перевод перетаскиваемого таба в верхний слой (`z-index`, `will-change`) |
| `.tabMainDragSource` | Тень и усиление “floating-card” эффекта |
| `.activeIndicatorHidden` | Временное скрытие индикатора активного таба во время drag |
| `.dragHandle` | Ручка перетаскивания с hover/active-состояниями |
| `.tab` | Базовый transition по `transform` для мягких микросдвигов |

Смещение drag-элемента вычисляется в рантайме:

```ts
dragOffsetX =
  (currentClientX - startClientX) +
  (currentScrollLeft - startScrollLeft)
```

и применяется через inline-style `transform: translate3d(...)`.

---

## Поиск и фильтры (вторая строка)

Вторая строка отделена от drag-логики списков, но находится в том же компоненте:

1. Search-триггер (лупа) раскрывает инлайн-поле.
2. `Ctrl/Cmd+K` фокусирует поиск.
3. `Esc` очищает или закрывает поиск.
4. Срочность — popup-меню.
5. Приоритет — выдвижной rail вправо.

Это позволяет документировать весь блок целиком в одном файле, но сохранять независимую логику подсистем.

---

## Инварианты реализации

1. Drag/reorder работает только в `rename`-режиме.
2. Мета-табы (`my-day`, `all`) не участвуют в reorder.
3. Порядок в стор меняется только на завершении drag (`finishReorderDrag(true)`).
4. Визуальный preview не ломает активный список и не пишет в стор на каждом move.
5. Все изменения совместимы с текущим Zustand API (`reorderDemoLists`).

---

## Ограничения текущей версии

1. Reorder реализован только pointer-gesture через ручку `⋮⋮`.
2. Нет отдельной клавиатурной перестановки (стрелками) для accessibility-режима reorder.
3. Коммит в стор выполняется серией операций `before` (нормально для текущего масштаба списков).

---

## Как развивать дальше

1. Добавить клавиатурный reorder (`Space` для захвата, `ArrowLeft/ArrowRight` для перемещения).
2. Добавить haptic-like visual cue (например, micro-scale на старте захвата).
3. Вынести reorder-движок в отдельный hook (`useListTabsReorder`) для упрощения `ListTabs.tsx`.
4. Добавить e2e-проверку порядка после drag (Playwright).

---

## Краткий чек-лист регрессий

1. В обычном режиме табы переключаются кликом.
2. В режиме `Редактировать` клик по названию открывает inline-input.
3. Ручка `⋮⋮` перетаскивает таб визуально, соседи плавно перестраиваются.
4. После отпускания порядок сохраняется.
5. Быстрый клик после drag не переключает список случайно.
6. `pnpm --filter @taska/web run lint` проходит.
