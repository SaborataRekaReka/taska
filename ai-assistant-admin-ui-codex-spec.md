# TASKA AI Admin UI â€” Codex Implementation Spec (Frontend-First)

> Date: 2026-03-21  
> Status: frontend implemented; backend phase-1/phase-2 added (`GET /ai/operations`, `GET /ai/runtime`, `GET/PATCH /ai/admin/config`)  
> Scope of this document: implementation reference for AI Admin UI with current backend foundation  
> Backend note: further backend expansion is still gated by explicit owner approval

---

## 1) Purpose

This document is the execution spec for building a centralized **AI Control Center UI** in TASKA.

Primary goal:

1. Centralized control over AI assistant operations.
2. Clear visibility into how the assistant is built and behaves.
3. Reuse of current safe-mode architecture without breaking invariants.

This spec is written as a direct, actionable guide for Codex to implement with minimal ambiguity.

---

## 2) Baseline Context (Current System Reality)

The current assistant is already a safe-mode planner:

1. `plan -> revise -> confirm -> execute -> undo`.
2. AI proposes; backend services execute deterministically.
3. AI operations are persisted in `AiOperation`.
4. My Day is virtual (deadline-driven), not a physical list.

Key existing backend endpoints:

1. `POST /ai/plan`
2. `GET /ai/operations`
3. `POST /ai/operations/:id/revise`
4. `GET /ai/operations/:id`
5. `POST /ai/operations/:id/confirm`
6. `POST /ai/operations/:id/execute`
7. `POST /ai/operations/:id/undo`
8. `GET /ai/health`
9. `GET /ai/runtime`
10. `GET /ai/admin/config`
11. `PATCH /ai/admin/config`
12. `GET /history` (compat fallback source)

Key existing frontend routes:

1. `/app`
2. `/app/ai-admin`.

---

## 3) Invariants (Must Not Be Broken)

1. Ownership isolation: UI must only operate via authenticated user endpoints.
2. Safe-mode lifecycle is mandatory: no hidden direct mutations.
3. My Day remains virtual (`UPDATE_TASK`/deadline semantics).
4. Existing API response envelope remains expected as-is.
5. No breaking changes in current HeroPanel / Task modal / My Day UX.

---

## 4) Scope of This Phase

## In scope

1. New admin route and page in web app: `/app/ai-admin`.
2. Centralized operation monitoring and inspection UI.
3. Action controls for existing safe-mode endpoints (`confirm/execute/undo/revise` where valid).
4. Architecture transparency block (live system map + operation state machine view).
5. Read/operate using existing backend APIs only.

## Out of scope (deferred)

1. Dry-run/simulation backend endpoint for plans.
2. Versioned prompt-template management backend.
3. Full planner tuning backend (weights, scenario controls, experiments).

---

## 5) Target Information Architecture

Create one page with left sidebar sections and right content workspace.

Sections:

1. Overview
2. Operations
3. Inspector
4. My Day Policy (frontend-configurable draft controls only)
5. Prompt Rules (read-only + local draft notes)
6. Safety (read-only current constraints + local draft toggles)
7. Logs

Layout principle:

1. Left = controls/navigation.
2. Right = data + explanation.
3. Every card must map to a real lifecycle stage or payload field.

---

## 6) File-Level Implementation Plan

Create/modify the following files.

## New files

1. `apps/app-mobile-web/src/pages/AiAdminPage.tsx`
2. `apps/app-mobile-web/src/pages/AiAdminPage.module.css`
3. `apps/app-mobile-web/src/components/ai-admin/AiAdminSidebar.tsx`
4. `apps/app-mobile-web/src/components/ai-admin/AiAdminSidebar.module.css`
5. `apps/app-mobile-web/src/components/ai-admin/AiOverviewPanel.tsx`
6. `apps/app-mobile-web/src/components/ai-admin/AiOverviewPanel.module.css`
7. `apps/app-mobile-web/src/components/ai-admin/AiOperationsTable.tsx`
8. `apps/app-mobile-web/src/components/ai-admin/AiOperationsTable.module.css`
9. `apps/app-mobile-web/src/components/ai-admin/AiOperationInspector.tsx`
10. `apps/app-mobile-web/src/components/ai-admin/AiOperationInspector.module.css`
11. `apps/app-mobile-web/src/components/ai-admin/AiSystemMapCard.tsx`
12. `apps/app-mobile-web/src/components/ai-admin/AiSystemMapCard.module.css`
13. `apps/app-mobile-web/src/components/ai-admin/AiLogsPanel.tsx`
14. `apps/app-mobile-web/src/components/ai-admin/AiLogsPanel.module.css`
15. `apps/app-mobile-web/src/components/ai-admin/types.ts`
16. `apps/app-mobile-web/src/lib/ai-admin.ts`

## Existing files to update

1. `apps/app-mobile-web/src/App.tsx`
2. `apps/app-mobile-web/src/hooks/queries.ts`
3. `apps/app-mobile-web/src/lib/types.ts`
4. `apps/app-mobile-web/src/components/Header.tsx` (add admin entry point link/button)

---

## 7) Routing and Navigation

Update `App.tsx`:

1. Add route `/app/ai-admin` under `AuthGuard`.
2. Keep `/app` behavior unchanged.

Navigation entry:

1. Add button/link in header: `AI Admin`.
2. Desktop-first; no complex responsive redesign required in this phase.

---

## 8) Data Layer Strategy (Current)

Current preferred feed source:

1. `GET /ai/operations?limit=...`

Frontend fallback for compatibility with older backend builds:

1. `GET /history?limit=...`
2. filter `entityType === AI_OPERATION`
3. request `GET /ai/operations/:id` for each id

Current hooks:

1. `useAiOperationsFeed(limit?: number)`
2. `useAiOperationHealth()`
3. `useAiRuntime()`

---

## 9) UI Modules and Behavior

## 9.1 Overview

Show KPI cards:

1. `PLANNED` count
2. `CONFIRMED` count
3. `EXECUTED` count
4. `FAILED` count
5. `UNDONE` count
6. Undo rate and fail rate (derived)

Plus:

1. Current health status (`/ai/health`).
2. Lightweight architecture card (`AiSystemMapCard`).

## 9.2 Operations Table

Columns:

1. `createdAt`
2. `operationId`
3. `scope`
4. `status`
5. `planKind` (if present)
6. `model`
7. `operations count`
8. `actions`

Filters:

1. status
2. scope
3. text search by prompt/id

Actions:

1. `Inspect` (always)
2. `Confirm` (only if `PLANNED`)
3. `Execute` (only if `CONFIRMED`)
4. `Undo` (only if `EXECUTED`)

## 9.3 Inspector

For selected operation show:

1. Core meta (`id`, `status`, `scope`, `model`, timestamps).
2. Prompt.
3. Plan payload summary + operation list.
4. `executionPayload` JSON viewer.
5. `undoPayload` JSON viewer.
6. State timeline visualization.

Inspector must include explicit â€œtrust boundaryâ€ badge:

1. â€œAI proposedâ€
2. â€œBackend executedâ€

## 9.4 Logs Panel

Derived incident list:

1. Failed operations (with `errorMessage`).
2. High-undo patterns.
3. My Day fallback marker if metadata suggests fallback path.

No backend logging changes in this phase; derive from loaded operation details.

## 9.5 Policy/Rules/Safety Sections (Current behavior)

This phase provides:

1. Read-only runtime/safety context from backend.
2. Persisted operator controls through `GET/PATCH /ai/admin/config`.
3. Explicit connected/degraded badges when backend config is unavailable.

Purpose:

1. Centralize current operator controls around one backend-backed surface.
2. Keep operator mental model unified now while larger admin capabilities are still pending.

---

## 10) Types to Add

In `src/components/ai-admin/types.ts` define frontend view-model types:

1. `AiAdminSection`
2. `AiOperationView`
3. `AiOperationMetrics`
4. `AiIncidentItem`
5. `AiPolicyDraftState`

Keep API-level contracts in `src/lib/types.ts`.
Do not pollute API types with view-only fields.

---

## 11) UX and Content Guidelines

1. Tone: operator-facing, concise, clear, audit-friendly.
2. Avoid vague labels; use lifecycle-native wording.
3. Every action button must show current precondition.
4. Any destructive action (`undo`) must require explicit confirmation.
5. JSON blocks should be copyable and wrapped in readable containers.

---

## 12) Acceptance Criteria (Definition of Done)

Implementation is complete for this phase if all points pass.

1. `/app/ai-admin` route exists and is protected by auth.
2. AI Admin entry appears in app UI.
3. Overview shows live counts from operation feed.
4. Operations table loads data from history+detail adapter.
5. Inspector renders full operation data with payload blocks.
6. Confirm/Execute/Undo actions work from admin UI and refresh data.
7. Health status card works via `/ai/health`.
8. No regressions in existing `/app` workflows.
9. TypeScript build passes.
10. Lint passes.

---

## 13) Suggested Implementation Order for Codex

1. Add route + blank page + header entry.
2. Implement data adapter (`ai-admin.ts`) and hooks.
3. Build Overview with metrics.
4. Build Operations table + row selection.
5. Build Inspector pane.
6. Wire action buttons (`confirm/execute/undo`) + optimistic loading states.
7. Add Logs panel and static Policy/Rules/Safety panels.
8. Polish styles and responsive behavior for desktop + narrow widths.
9. Run checks, fix lint/types, finalize.

---

## 14) Commands for Validation

From repo root:

```powershell
pnpm --filter @taska/app-mobile-web run build
pnpm --filter @taska/app-mobile-web run lint
pnpm run check:encoding
```

---

## 15) Backend Start Gate (Explicit)

Further backend work beyond current foundation must **not** start from this document alone.

Before backend kickoff, owner provides explicit go-ahead for:

1. optional dry-run endpoint;
2. prompt-template/versioning endpoints;
3. operator audit/event stream extensions;
4. advanced planner control endpoints.

Until then, frontend uses current backend foundation and marks unavailable controls as pending.

---

## 16) Handoff Note for Next Codex Session

If a new Codex session starts, use this order:

1. Read `AGENTS.md`
2. Read `architecture.md`
3. Read `ai-assistant-current-architecture.md`
4. Read this file: `ai-assistant-admin-ui-codex-spec.md`
5. Execute section **13) Suggested Implementation Order for Codex**


