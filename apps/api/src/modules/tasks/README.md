# tasks

## Purpose
Task CRUD, search/filter, and status lifecycle for list and card screens.

## MVP endpoints
- `GET /api/v1/tasks`
- `POST /api/v1/tasks`
- `GET /api/v1/tasks/:id`
- `PATCH /api/v1/tasks/:id`
- `DELETE /api/v1/tasks/:id`

## Query support (required by UI)
- `q` (text search)
- `listId`
- `status`
- `priority`
- `dueFrom` / `dueTo`

## Notes
- Must support fast updates for optimistic UI.
- Every mutation should emit history events.
