# TASKA AI Assistant — Current Architecture and Operating Guide

> Date: 2026-03-21  
> Status: documents the **current** AI assistant implementation that already exists in the repository.  
> Purpose: provide one centralized place that explains how the AI assistant works today: architecture, files, flows, dependencies, contracts, constraints, and current limitations.

---

## 1. What this document is

This document is the centralized technical reference for the current TASKA AI assistant.

It explains:

- what the assistant does right now;
- which endpoints and modules are involved;
- how safe-mode works;
- how My Day currently works;
- where OpenAI is used and where it is **not** trusted;
- what data is stored in `AiOperation`;
- which frontend files trigger which backend flows;
- what is deterministic vs model-generated;
- what architectural constraints must not be broken.

This document is intentionally about the **current implementation**, not the long-term target design.

---

## 2. Executive summary

Today TASKA's AI assistant is a **safe-mode planning system** built around persisted AI operations.

The core model is:

1. user asks AI to prepare a plan;
2. backend gathers context;
3. OpenAI generates a **structured preview**;
4. backend normalizes and stores that preview in `AiOperation.planPayload`;
5. user can inspect and revise the plan;
6. user explicitly confirms the plan;
7. backend executes the plan **deterministically** via normal application services;
8. backend stores undo metadata;
9. user can undo the last AI-applied operation.

So the current assistant is **not** a free-form autonomous agent.
It is a **controlled planning-and-execution orchestrator**.

---

## 3. Core architectural principles

The current AI assistant is built around the following principles.

### 3.1. Safe-mode first

The assistant may generate a plan preview, but it does not directly mutate user data during planning.
Mutations happen only after:

- plan creation,
- optional revision,
- explicit confirmation,
- explicit execution.

### 3.2. OpenAI is used for planning, not for execution

OpenAI only produces a structured plan proposal.
The actual mutations are performed by backend services such as:

- `ListsService`
- `TasksService`
- `SubtasksService`
- `HistoryService`

This is critical because it preserves:

- ownership checks,
- system list rules,
- soft-delete rules,
- history logging,
- deterministic behavior.

### 3.3. My Day is virtual

`"Мой день"` is not a physical database list.
It is a smart list represented by task deadlines that fall inside the current day.

That means:

- AI must not create a real list called `Мой день`;
- AI must modify tasks through `UPDATE_TASK` and deadline changes;
- frontend My Day visibility depends on the `dueToday`-style task selection model.

### 3.4. Every AI action becomes a persisted operation

Each plan is stored as an `AiOperation` row and carries:

- prompt,
- scope,
- plan preview,
- execution metadata,
- undo metadata,
- status lifecycle.

This gives traceability and allows later inspection, revision, execution, and rollback.

---

## 4. High-level system map

```text
Frontend AI surfaces
  ├─ Hero AI panel
  ├─ Task assistant modal
  └─ My Day modal
        │
        ▼
HTTP API /ai/*
        │
        ▼
AiAssistantController
        │
        ▼
AiAssistantService
  ├─ build context
  ├─ call OpenAI for plan JSON
  ├─ normalize plan
  ├─ persist AiOperation
  ├─ confirm
  ├─ execute via app services
  └─ undo via stored undo payload
        │
        ├─ ListsService
        ├─ TasksService
        ├─ SubtasksService
        ├─ HistoryService
        └─ PrismaService
```

---

## 5. Main backend files and what each one does

## 5.1. `apps/api/src/modules/ai-assistant/controller.ts`

Role:
- exposes the AI HTTP endpoints;
- protects them with JWT auth;
- forwards requests to the service layer.

This file is the module entry point on the backend.

### Endpoints currently exposed
- `POST /ai/plan`
- `POST /ai/operations/:id/revise`
- `GET /ai/operations/:id`
- `POST /ai/operations/:id/confirm`
- `POST /ai/operations/:id/execute`
- `POST /ai/operations/:id/undo`
- `GET /ai/health`

---

## 5.2. `apps/api/src/modules/ai-assistant/dto.ts`

Role:
- defines request DTOs and validation rules for AI endpoints.

### Important DTOs

#### `CreateAiPlanDto`
Used by `POST /ai/plan`.
Contains:
- `prompt`
- `scope`
- `taskId` for task scope
- `context`

#### `AiPlanContextDto`
Optional context object used to narrow relevant entities.
Contains:
- `listIds`
- `taskIds`
- `search`
- `limit`
- `myDay`

#### `MyDayContextDto`
Structured day-state input used by My Day planning.
Contains:
- `mood`
- `energyLevel`
- `wishes`
- `timeBudgetMinutes`
- `dayIntent`
- `focusCapacity`
- `stressLevel`
- `interactionPreference`

#### `ReviseAiPlanDto`
Used for revising a pending plan.
Can include:
- a revision prompt,
- replacement operations,
- metadata.

#### `ConfirmAiOperationDto` and `UndoAiOperationDto`
Used for confirm/undo user intent notes.

---

## 5.3. `apps/api/src/modules/ai-assistant/ai-assistant.service.ts`

Role:
- main orchestration engine of the current AI assistant.

This is the central backend file for AI behavior.

### Responsibilities

#### A. Plan creation
- validates scope;
- builds planning context;
- sends prompt + context to OpenAI;
- normalizes model output;
- stores `AiOperation` with preview payloads;
- returns preview to frontend.

#### B. Plan revision
- loads existing planned operation;
- allows revision by new prompt or explicit operation replacement;
- persists updated preview.

#### C. Confirmation
- marks operation as confirmed;
- stores approval note inside execution metadata.

#### D. Execution
- loads planned operations;
- executes them via regular domain services;
- records deterministic results;
- stores undo mutations;
- writes history.

#### E. Undo
- replays stored undo mutations in reverse order;
- marks operation undone;
- records AI undo history.

#### F. Operation inspection
- returns stored plan/execution/undo payloads for the frontend.

### Important internal concepts

#### `OperationPlan`
Normalized plan preview structure used internally.
Contains:
- `version`
- `scope`
- `summary`
- `assistantMessage`
- `operations`
- `warnings`
- optional `planKind`
- optional `plannerContext`

#### `PlanOperation`
One atomic planned action.
Supported types currently are:
- `CREATE_LIST`
- `UPDATE_LIST`
- `CREATE_TASK`
- `UPDATE_TASK`
- `DELETE_TASK`
- `CREATE_SUBTASK`
- `UPDATE_SUBTASK`
- `DELETE_SUBTASK`

#### `executionPayload`
Stores execution-related metadata such as:
- context summary;
- planner metadata;
- approval note;
- execution results;
- undo reason.

#### `undoPayload`
Stores rollback mutations that allow the system to revert the operation later.

---

## 5.4. `apps/api/src/modules/ai-assistant/day-planning.service.ts`

Role:
- first backend foundation layer for structured My Day planning.

This service does **not** yet build the final ranked day plan.
Instead, it prepares normalized day-context and lightweight heuristics.

### Current responsibilities

#### `normalizeMyDayContext()`
Takes `MyDayContextDto` and normalizes it into a stable internal structure.
It:
- clamps numeric values;
- deduplicates wishes;
- infers defaults for missing values;
- derives:
  - `dayIntent`
  - `focusCapacity`
  - `stressLevel`
  - `interactionPreference`

#### `buildMyDayPreview()`
Builds a compact preview from:
- normalized My Day context,
- current candidate tasks.

It currently calculates:
- candidate task count;
- recommended task limit;
- urgent task count;
- quick-win task count;
- heuristic guidance notes.

### Important note

This service is currently a **foundation**, not the full ranking engine from the long-term blueprint.
It gives the AI flow structured day metadata, but it does not yet produce multi-variant ranked day plans by itself.

---

## 5.5. `apps/api/src/modules/ai-assistant/module.ts`

Role:
- wires the AI assistant module together;
- registers:
  - controller,
  - `AiAssistantService`,
  - `DayPlanningService`.

It also imports dependent modules:
- history,
- lists,
- tasks,
- subtasks.

---

## 5.6. `apps/api/prisma/schema.prisma`

Role:
- contains the persisted shape of `AiOperation` and related entities.

The AI assistant depends primarily on the `AiOperation` model.

### Relevant `AiOperation` fields
- `id`
- `userId`
- `taskId?`
- `scope`
- `operationType`
- `model`
- `prompt`
- `planPayload`
- `executionPayload`
- `undoPayload`
- `status`
- timestamps for approved / executed / undone / failed
- `errorMessage`

This table is the durable source of truth for AI operation state.

---

## 6. Main frontend files and what each one does

## 6.1. `apps/app-mobile-web/src/hooks/queries.ts`

Role:
- defines frontend mutations/queries that talk to the AI backend.

### Relevant hooks
- `useCreateAiPlan()`
- `useReviseAiPlan()`
- `useConfirmAiOperation()`
- `useExecuteAiOperation()`
- `useUndoAiOperation()`
- `useAiOperation()`

### Important detail

`useCreateAiPlan()` now supports structured My Day context through:

```ts
context: {
  ...
  myDay?: MyDayPlanningContext;
}
```

So the frontend can now send more than just a prompt.

---

## 6.2. `apps/app-mobile-web/src/lib/types.ts`

Role:
- central frontend type definitions for AI payloads.

### Relevant types
- `AiPlanResponse`
- `AiOperationDetail`
- `AiPlanOperation`
- `MyDayPlanningContext`

### Why this matters

This file is the type bridge between:
- backend AI contracts,
- React Query hooks,
- UI rendering layers.

---

## 6.3. `apps/app-mobile-web/src/components/my-day/MyDayModal.tsx`

Role:
- user-facing entry point for My Day setup.

### What it currently does
- captures mood;
- captures energy;
- captures wishes;
- computes day profile visual data;
- derives `myDayContext` through `inferMyDayContext()`;
- calls `onCreateMyDay()` with:
  - `profile`
  - `mood`
  - `energy`
  - `wishes`
  - `myDayContext`

### Important note

The modal currently does **not** expose all future planner controls in the UI yet.
For example, some fields are still inferred rather than explicitly selected.

---

## 6.4. `apps/app-mobile-web/src/pages/MainPage.tsx`

Role:
- orchestrates the main My Day AI flow on the frontend.

### Current My Day flow in this file
1. gathers current tasks;
2. builds a My Day prompt;
3. sends `POST /ai/plan` with:
   - prompt,
   - scope,
   - task IDs,
   - structured `myDay` context;
4. checks if the plan actually created a today-bound mutation;
5. if not, sends a revise request with deterministic fallback operations;
6. auto-confirms the operation;
7. auto-executes the operation;
8. updates local UI state and saved-day flags.

### Important product note

Today My Day is still auto-confirm + auto-execute from the modal flow.
So while the backend is safe-mode capable, this specific UX path currently chooses to advance immediately after the plan stage.
That is an important implementation detail for future admin tooling.

---

## 6.5. `apps/app-mobile-web/src/stores/ui.ts`

Role:
- stores frontend UI state related to My Day and theme.

Relevant to AI because it manages:
- modal state,
- saved My Day state,
- day energy,
- theme application after My Day creation.

This is not AI-planning logic itself, but it affects the visible My Day experience.

---

## 7. Current backend dependencies and why they matter

The AI assistant depends on several backend services.

## 7.1. `PrismaService`
Used for:
- persisting `AiOperation`;
- reading lists/tasks/subtasks directly where needed;
- updating execution and undo metadata.

## 7.2. `TasksService`
Used during execute and task-scope context loading.
Ensures AI-applied task mutations still obey backend business logic.

## 7.3. `SubtasksService`
Used during execution and undo for subtask operations.

## 7.4. `ListsService`
Used for safe list creation/rename flows.
Also preserves list protections.

## 7.5. `HistoryService`
Used to record:
- `AI_EXECUTED`
- `AI_UNDONE`

This keeps AI actions inside the same audit model as the rest of the application.

---

## 8. OpenAI dependency

## 8.1. Where OpenAI is called

OpenAI is called inside `AiAssistantService.generatePlan()`.

The service sends:
- system instructions;
- user prompt;
- structured context payload;
- a JSON schema describing the required output shape.

## 8.2. What OpenAI returns

It returns a JSON plan payload that is expected to contain:
- summary;
- assistant message;
- warnings;
- array of operations.

## 8.3. Why JSON schema matters

The backend forces the model into a structured response format so the plan can be:
- validated;
- normalized;
- persisted;
- reviewed;
- executed deterministically.

## 8.4. Important trust boundary

The model is trusted to propose.
It is **not** trusted to execute.

That is the main boundary that keeps the system safe and maintainable.

---

## 9. Planning scopes

The AI assistant currently supports two scopes.

## 9.1. `GLOBAL`
Used when AI works over multiple lists/tasks.
Typical for:
- My Day;
- hero/global assistant flows;
- broad task-manager actions.

## 9.2. `TASK`
Used for task-specific assistance.
Typical for:
- task assistant modal;
- operations focused on a single task.

In task scope, backend context collection is narrower and includes task history.

---

## 10. Context building logic

Context building happens before OpenAI is called.

## 10.1. Global context

When scope is `GLOBAL`, backend gathers:
- matching lists;
- matching tasks;
- task subtasks;
- smart-list hints (`Мой день`, `Все`);
- protected-list hints (`Без списка`);
- reserved/protected list names;
- optional normalized My Day context;
- optional planner preview metadata.

## 10.2. Task context

When scope is `TASK`, backend gathers:
- target task;
- task history.

## 10.3. Why this matters

The assistant does not receive arbitrary free-form context.
It receives **curated domain context** prepared by the backend.
This reduces hallucinations and keeps the model grounded in real entities.

---

## 11. My Day logic — current implementation

## 11.1. Current user flow

The current flow for My Day is:

1. user opens My Day modal;
2. selects mood / energy / wishes;
3. frontend derives extra planning context;
4. frontend sends prompt + task slice + `myDay` context to `/ai/plan`;
5. backend builds context and, if `myDay` exists, computes `plannerMeta`;
6. OpenAI returns a structured plan;
7. backend stores the plan as `AiOperation`;
8. frontend checks whether the returned operations actually place tasks into today;
9. if not, frontend revises the plan with deterministic fallback operations;
10. frontend confirms;
11. frontend executes;
12. tasks become part of virtual My Day through today-bound deadlines.

## 11.2. What My Day means technically today

Today My Day is not stored as a separate day-plan entity.
Instead, it is represented through task deadlines that place tasks into the today filter.

## 11.3. What is already structured

My Day now has a backend-understandable structured context containing:
- mood,
- energy,
- wishes,
- inferred day intent,
- inferred focus capacity,
- inferred stress level,
- optional time budget,
- interaction preference.

## 11.4. What is not yet implemented

The system does **not yet** fully implement:
- deterministic ranked My Day variants (`light`, `balanced`, `focus`);
- a full backend scoring engine;
- deferred-task rationale payloads;
- planner-grade explanation objects;
- explicit admin console / operator controls.

So My Day is now **more structured than before**, but still not the full target hybrid planner.

---

## 12. Supported operation types and execution mechanics

The current plan operation types are:

- `CREATE_LIST`
- `UPDATE_LIST`
- `CREATE_TASK`
- `UPDATE_TASK`
- `DELETE_TASK`
- `CREATE_SUBTASK`
- `UPDATE_SUBTASK`
- `DELETE_SUBTASK`

## 12.1. Execution behavior

During execute:
- each normalized operation is processed one by one;
- backend calls domain services for the actual mutation;
- each mutation produces an undo mutation;
- results are persisted into `executionPayload` and `undoPayload`.

## 12.2. Undo behavior

Undo works by replaying stored rollback mutations in reverse order.

This is why AI actions are inspectable and reversible.

---

## 13. Special treatment of system lists

The assistant has explicit logic and prompt hints for these virtual/protected list concepts.

## 13.1. `Мой день`
- virtual smart list;
- represented through task deadlines;
- never create/rename as a real list.

## 13.2. `Все`
- virtual technical list;
- not a real DB list.

## 13.3. `Без списка`
- protected system bucket;
- task movement is modeled through `listId = null`.

This logic is important because it prevents the model from generating invalid list operations.

---

## 14. Current state model of an AI operation

Each `AiOperation` goes through a lifecycle.

### Statuses
- `PLANNED`
- `CONFIRMED`
- `EXECUTED`
- `UNDONE`
- `FAILED`

### Typical path
```text
PLANNED -> CONFIRMED -> EXECUTED -> UNDONE
```

or

```text
PLANNED -> CONFIRMED -> FAILED
```

This state machine is one of the most important control surfaces for any future admin interface.

---

## 15. What is deterministic vs model-driven today

## 15.1. Model-driven

The following are currently model-driven:
- preview summary;
- assistant message;
- proposed list/task/subtask operations;
- warnings;
- general plan wording.

## 15.2. Deterministic

The following are deterministic:
- ownership enforcement;
- DTO validation;
- context assembly;
- operation normalization;
- mutation execution;
- rollback mutation generation;
- history recording;
- My Day fallback operations in frontend;
- current My Day context normalization and preview heuristics.

This split is very important for understanding where the assistant can behave variably and where it cannot.

---

## 16. Current limitations

The current assistant is powerful but still transitional.

### Main limitations
- no full backend scoring engine yet;
- no true multi-variant day-plan builder yet;
- no centralized admin panel yet;
- no explicit operator prompt-management UI;
- no test harness UI for plan simulation yet;
- some My Day logic still relies on frontend prompt composition and fallback;
- current My Day UX auto-confirms/auto-executes rather than exposing a rich review step.

---

## 17. What to treat as the main source files for future admin tooling

If the next step is to build an admin or operator interface for AI control, the most important source files are:

### Backend
- `apps/api/src/modules/ai-assistant/ai-assistant.service.ts`
- `apps/api/src/modules/ai-assistant/day-planning.service.ts`
- `apps/api/src/modules/ai-assistant/dto.ts`
- `apps/api/src/modules/ai-assistant/controller.ts`
- `apps/api/prisma/schema.prisma`

### Frontend
- `apps/app-mobile-web/src/hooks/queries.ts`
- `apps/app-mobile-web/src/lib/types.ts`
- `apps/app-mobile-web/src/pages/MainPage.tsx`
- `apps/app-mobile-web/src/components/my-day/MyDayModal.tsx`
- `apps/app-mobile-web/src/components/HeroPanel.tsx`
- `apps/app-mobile-web/src/components/EditTaskModal.tsx`

These files define the current operational surface of the assistant.

---

## 18. How to think about the current assistant as a system

The simplest accurate mental model is:

> TASKA AI is currently a **safe-mode operation planner** with persisted previews, deterministic backend execution, and a partially structured My Day planning foundation.

It is **not yet**:
- a full hybrid recommender engine,
- an autonomous agent runtime,
- or an operator-managed AI control center.

But it already has the most important backbone needed for those next steps:
- persisted AI operations,
- explicit lifecycle,
- structured context support,
- deterministic apply/undo,
- and frontend entry points.

---

## 19. Recommended use of this document

Use this file as the single reference when you need to answer:

- “How does the current AI assistant work?”
- “Where is the logic for My Day?”
- “What does OpenAI actually control?”
- “How are plans stored?”
- “What should an admin panel plug into?”
- “Which files should be touched next?”

---

## 20. Next practical step

The next logical layer above this document is an **AI administration interface** for the project owner.

That interface should likely centralize:
- current prompt templates and system rules;
- plan inspection;
- test requests;
- operation logs;
- planner-mode toggles;
- My Day planning controls;
- model selection / environment visibility;
- maybe dry-run tools for AI plans.

This document is meant to be the reference base for that next step.
