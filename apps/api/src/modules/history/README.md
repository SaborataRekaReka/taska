# history

## Purpose
Append-only audit trail and foundation for undo mechanics.

## MVP endpoints
- `GET /api/v1/history`
- `GET /api/v1/history/:entityType/:entityId`

## Notes
- Record events for list/task/subtask mutations.
- Keep event ordering deterministic by timestamp/id.
