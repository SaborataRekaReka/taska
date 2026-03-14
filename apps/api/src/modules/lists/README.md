# lists

## Purpose
List management for top navigation tabs (`Мой день`, `Работа`, `Личное`, etc.).

## MVP endpoints
- `GET /api/v1/lists`
- `POST /api/v1/lists`
- `PATCH /api/v1/lists/:id`
- `DELETE /api/v1/lists/:id`
- `POST /api/v1/lists/reorder`

## Notes
- Keep support for system/default lists.
- Deleting a list must follow explicit task migration policy.
