# ai-assistant

## Purpose
Safe-mode AI orchestration for planning and task transformation actions backed by OpenAI.

## Current endpoints
- `POST /ai/plan` — generate a structured safe-mode preview without mutating data
- `POST /ai/operations/:id/revise` — revise a pending plan before approval
- `GET /ai/operations/:id` — inspect stored plan/execution payloads
- `POST /ai/operations/:id/confirm` — approve a planned operation
- `POST /ai/operations/:id/execute` — apply the confirmed plan via backend services
- `POST /ai/operations/:id/undo` — revert a previously executed AI plan
- `GET /ai/health` — module health

## Notes
- OpenAI is used only for planning; execution is deterministic and happens on the backend.
- All mutations still go through ownership checks, soft-delete rules, and history recording.
- `AiOperation.planPayload` stores the preview; `executionPayload` and `undoPayload` store apply/rollback metadata.
