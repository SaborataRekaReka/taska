# GradientBlob + Day Color Theme — архитектура компонента

Этот документ описывает систему динамического цветового оформления, связывающую модалку «Мой день» и фон главной страницы через единую цветовую пару.

---

## Обзор

Пользователь настраивает свой день (настроение, энергия, пожелания) в модалке `MyDayModal`. На основе этих настроек вычисляется `DayProfile`, из которого генерируется пара цветов `[c0, c1]`. Эта пара:

1. Управляет интерактивным SVG-блобом за ромбом (радарчартом) в модалке.
2. После нажатия «Создать мой день» сохраняется в Zustand-стор и применяется как статичный фон на главной странице.

---

## Файловая структура

```
src/
├── lib/
│   └── profileColors.ts          # Цветовая логика: profileToColors, softenColors, dayColorsToBackground
├── components/
│   ├── GradientBackground.tsx     # Компонент GradientBlob (интерактивный SVG-блоб)
│   ├── GradientBackground.module.css
│   └── my-day/
│       ├── MyDayModal.tsx         # Модалка (потребитель GradientBlob + profileToColors)
│       └── computeDayProfile.ts   # Вычисление DayProfile из задач + mood/energy/wishes
├── pages/
│   ├── MainPage.tsx               # Главная страница (потребитель dayColors из стора)
│   └── MainPage.module.css
└── stores/
    └── ui.ts                      # Zustand: dayColors: [string, string] | null
```

---

## Поток данных

```
MyDayModal
  ├─ mood (1-5), energy (0-20), wishes (string[])
  │
  ├─ computeDayProfile(tasks, mood, energy, wishes) → DayProfile
  │     { importance, urgency, duration, load, dayLabel }
  │
  ├─ profileToColors(profile, mood, energy) → [c0, c1]
  │     mood  → hue (холодный ↔ тёплый)
  │     energy → saturation (приглушённый ↔ яркий)
  │     urgency/importance/load → нюансы hue и lightness
  │
  ├─ <GradientBlob c0={c0} c1={c1} />   ← интерактивный блоб в модалке
  │
  └─ «Создать мой день» onClick:
       useUiStore.setDayColors([c0, c1])

MainPage
  ├─ dayColors = useUiStore(s => s.dayColors)
  │
  └─ if dayColors:
       softenColors(dayColors) → [c0soft, c1soft]  (менее насыщенные, полупрозрачные)
       dayColorsToBackground([c0soft, c1soft]) → CSS background string
       → <div className={styles.dayBg} style={{ background }} />
```

---

## Компонент GradientBlob

**Файл:** `GradientBackground.tsx`
**Экспорт:** `GradientBlob`

### Props

| Prop | Тип | Default | Описание |
|------|-----|---------|----------|
| `c0` | `string` | `'#8a64eb'` | Цвет центра градиента (HSL или HEX) |
| `c1` | `string` | `'#64e8de'` | Цвет края градиента |
| `size` | `number` | `400` | Размер viewBox SVG (влияет на grain scale) |
| `className` | `string` | `''` | Дополнительный CSS-класс |

### Как работает

1. SVG-круг с `radialGradient` (3 стопа: `c0` → `c1` → `c1 transparent`).
2. Два SVG-фильтра:
   - `blob-distort` — фрактальный шум + displacement для искажения формы.
   - `blob-grain` — более мелкий шум для зернистости/дизеринга.
3. CSS: `filter: blur(18px) url(#blob-distort) url(#blob-grain)` на `<circle>`.
4. Интерактивность: глобальный `mousemove` listener двигает `fx`/`fy` (фокусную точку) `radialGradient` вслед за курсором.
5. `pointer-events: none` на контейнере — UI поверх блоба полностью кликабелен.

### Ограничения

- **ID фильтров глобальные** (`blob-distort`, `blob-grain`, `blob-grad`). Если на странице > 1 экземпляра `GradientBlob`, они будут конфликтовать. Для множественных блобов нужно параметризовать ID.
- Размер блоба определяется CSS (`.svg { width: 60%; height: 60% }`), а не prop `size`. `size` влияет только на `viewBox` и `grainScale`.

---

## profileColors.ts — цветовая логика

### `profileToColors(profile, mood?, energy?): [string, string]`

Основная функция маппинга. Возвращает пару HSL-строк.

**Входы и их влияние:**

| Параметр | Влияние на c0 (primary) | Влияние на c1 (secondary) |
|----------|------------------------|--------------------------|
| `mood` (1-5) | Hue: 220 (холодный) → 50 (тёплый) | Hue: 210 → 60 |
| `energy` (0-20) | Saturation: 32% → 76% | Saturation: 28% → 68% |
| `urgency` | Сдвигает hue к красному/оранжевому | Небольшой сдвиг hue |
| `importance` | Сдвигает hue к пурпурному | Сдвигает hue |
| `load` | Затемняет lightness | Затемняет lightness |

### `softenColors(colors): [string, string]`

Берёт `[c0, c1]` в формате `hsl(...)`, снижает насыщенность на 10, повышает яркость на 8, устанавливает opacity 0.28. Результат — `hsla(...)` строки для мягкого фона.

### `dayColorsToBackground(colors): string`

Строит CSS `background` из двух `radial-gradient` (с разным позиционированием) + базовый `linear-gradient` подложки. Используется для `MainPage`.

---

## Zustand store (`ui.ts`)

```ts
dayColors: [string, string] | null   // null = стандартный фон, иначе цвета дня
setDayColors: (colors) => void       // вызывается при "Создать мой день"
```

---

## Где что рендерится

### Модалка «Мой день» (`MyDayModal.tsx`)

```tsx
<section className={styles.rightColumn}>
  <GradientBlob c0={c0} c1={c1} size={480} />   ← за ромбом, z-index: 0
  <DayProfileRadar profile={profile} />           ← ромб, z-index: 1
</section>
```

Цвета пересчитываются реактивно при любом изменении mood/energy/wishes.

### Главная страница (`MainPage.tsx`)

```tsx
{dayColors && (
  <div
    className={styles.dayBg}       ← position: fixed; inset: 0; z-index: 0
    style={{ background: dayColorsToBackground(softenColors(dayColors)) }}
  />
)}
```

Фон не интерактивный, статичный, использует те же оттенки что и блоб, но мягче.

---

## Как модифицировать

- **Другие цветовые схемы**: изменить `profileToColors` в `profileColors.ts`. Все hue/sat/light значения подобраны через `lerp()`, легко двигать диапазоны.
- **Размер блоба**: менять `width`/`height` в `GradientBackground.module.css` (`.svg`).
- **Blur / grain**: в CSS файле — `filter: blur(Xpx)`, в SVG — `baseFrequency` у `feTurbulence`.
- **Прозрачность фона**: менять `0.28` в `softenColors()`.
- **Множественные блобы**: параметризовать ID SVG-фильтров/градиентов через props.
