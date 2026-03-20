# Design tokens (`global.css`)

Единственный источник «сырых» цветов, сложных градиентов и числовых констант для визуала.  
**Правило:** в `*.module.css` — только `var(--token)` и локальная вёрстка (grid, flex, размеры без дублирования палитры).

## Секции в `:root`

| Блок | Назначение |
|------|------------|
| Page / marketing | Фон приложения, декоративные градиенты в `body` |
| Glass | Полупрозрачный белый: `--glass-44` … `--glass-96`, плюс `--glass-74`, `--glass-80`, `--glass-82`, `--glass-94` |
| Surfaces | `--panel-bg`, `--card-bg`, алиасы на glass |
| Ink borders | Нейтральные границы `--border*`, фокус кольца |
| Typography | `--text-*`, `--icon-muted`, веса `--font-weight-*` |
| Actions | `--btn-black`, `--btn-white`, `--toggle-track-*` |
| UI chrome | Slate-масштаб для табов/тулбара: `--ui-fg-*`, `--ui-line-*`, `--ui-shadow-*`, `--ui-selected-*` |
| Hero / AI | Панель, пузыри, inset кнопки отправки |
| Semantic | Успех / опасность, включая `--semantic-danger-pressed` и `--semantic-danger-soft-hover-bg` |
| Overlays | Скримы модалок: `--overlay-scrim-slate`, `--overlay-scrim-ink`, `--overlay-scrim-lavender` |
| Ink neutrals | Серые треки: `--ink-neutral-08` … `--ink-neutral-65` |
| My Day | `--gray-mood-*`, `--gray-energy-*`, радар `--radar-*`, `--on-accent*` |
| Menus | Единые hover/active/focus для всех выпадашек: `--menu-item-hover`, `--menu-item-active`, `--menu-focus-ring*` |
| Gradients | `--gradient-main-*`, `--gradient-balance-bloom`, `--gradient-avatar-fallback`, `--gradient-login-form-pane` |
| OAuth | Префикс `--oauth-google-*` (только кнопка Google) |
| Wish chips | `--wish-chip-*`, `--wish-input-border` |
| Motion / Z-index / Radii / Shadows | Как в файле |

## Добавление нового цвета

1. Подобрать существующий токен (часто хватит `--ui-fill-*` или `--glass-*`).
2. Если значение уникально и повторится ≥2 раз — добавить **одно** имя в `global.css` с комментарием контекста.
3. Не вводить второй «почти тот же» оттенок без сравнения с соседними токенами.

## Шрифты и иконки

- Шрифт: `--font` на `body` (`global.css`); в модулях не дублировать `font-family`, кроме осознанных исключений (например изолированный виджет).
- Иконки: файлы в `src/assests`; в CSS для иконок — `filter`, `opacity`, `color: currentColor` там, где применимо.
