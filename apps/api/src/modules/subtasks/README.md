# subtasks

## Purpose
Nested checklist behavior in task cards and editor mode.

## MVP endpoints
- `GET /api/v1/tasks/:taskId/subtasks`
- `POST /api/v1/tasks/:taskId/subtasks`
- `PATCH /api/v1/subtasks/:id`
- `DELETE /api/v1/subtasks/:id`

## Notes
- Parent task and subtask must belong to same user.
- Protect from hierarchy cycles.
