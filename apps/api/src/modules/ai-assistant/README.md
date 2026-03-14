# ai-assistant

## Purpose
Safe-mode AI orchestration for planning and task transformation actions.

## MVP endpoints
- `POST /api/v1/ai/plan`
- `POST /api/v1/ai/operations/:id/confirm`
- `POST /api/v1/ai/operations/:id/execute`
- `POST /api/v1/ai/operations/:id/undo`

## Notes
- Never apply destructive actions without explicit confirmation.
- Persist operation lifecycle and bind all changes to history records.
