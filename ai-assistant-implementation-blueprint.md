# TASKA AI Assistant Implementation Blueprint

> Version: 1.0  
> Date: 2026-03-21  
> Scope: Strengthening TASKA's AI assistant for **My Day** and broader task-management flows while preserving existing architectural invariants.

---

## 1. Purpose

This document is the execution blueprint for evolving TASKA's current AI safe-mode foundation into a more capable, explainable, and product-aligned assistant.

The target outcome is not a generic chat bot. The target outcome is a **hybrid AI planner** that:

- builds a realistic daily plan from user state and task context;
- recommends tasks that fit the user's current capacity;
- explains recommendations clearly;
- proposes lighter alternatives when needed;
- decomposes heavy tasks into safe starter steps;
- preserves TASKA's `plan -> confirm -> execute -> undo` workflow;
- keeps **"Мой день"** virtual and deterministic.

---

## 2. Product Principle

### 2.1 Core product statement

TASKA should position the feature as:

> **AI helps assemble a realistic and useful daily plan based on user state, available time, urgency, progress, and cognitive load — then presents it as a safe-mode proposal before applying anything.**

### 2.2 What TASKA should avoid promising

Avoid positioning the feature as:

- “AI magically knows what you should do”;
- “AI chooses tasks only by mood”;
- “AI chat decides everything for the user”.

### 2.3 Correct mental model

The assistant should behave like:

- a **ranker**,
- a **day planner**,
- a **task decomposer**,
- an **anti-friction helper**,
- and later a **reflection/personalization layer**.

---

## 3. Non-Negotiable Architectural Constraints

All implementation stages must preserve the current architecture.

### 3.1 Hard invariants

1. **Ownership**: only current-user entities are considered.
2. **AI safe-mode**: no mutation before confirm.
3. **My Day remains virtual**: never create or rename a real list for `"Мой день"`.
4. **Deterministic execute**: backend services apply approved operations.
5. **History append-only**: no mutation of historical records.
6. **Response envelope**: existing API response convention stays intact.
7. **Soft-delete rules remain untouched**.

### 3.2 Architectural consequences

From those invariants, the implementation must follow these rules:

- `/ai/plan` remains the primary My Day planning entry point in the near term.
- `/ai/chat` is not the first-class mechanism for day planning.
- LLM output must not directly define business truth without backend filtering and validation.
- `AiOperation.planPayload` becomes the main container for recommendation preview.
- `execute` must only perform supported deterministic mutations.
- New database fields should be postponed unless their value is validated.

---

## 4. Current Project Baseline

TASKA already has:

- My Day setup UI with `mood`, `energy`, `wishes`;
- a frontend-derived day profile (`importance`, `urgency`, `duration`, `load`);
- AI safe-mode backend foundation with persisted `AiOperation`;
- global AI hero flow and proposal cards;
- revise / confirm / execute / undo mechanics;
- My Day represented through tasks becoming “today tasks” instead of a physical DB list;
- frontend fallback logic when the AI plan fails to place tasks into today.

### 4.1 Main gap

The main missing capability is:

> **a backend recommendation engine that can explainably decide which tasks fit the user’s day best.**

Without that layer, TASKA can generate plans, but it does not yet have a strong and deterministic notion of *why these tasks today*.

---

## 5. Target System Model

### 5.1 End-to-end planning pipeline

```text
User My Day inputs
  -> Normalize day context
  -> Load candidate tasks
  -> Apply hard filters
  -> Derive task features
  -> Score and rank tasks
  -> Compose 2-3 day-plan variants
  -> Use LLM for explanation and decomposition
  -> Persist preview in AiOperation.planPayload
  -> User reviews proposal
  -> Confirm
  -> Execute deterministic operations
  -> Record history
  -> Optionally capture feedback later
```

### 5.2 Assistant roles in the target system

#### Role 1 — Ranker
Decides what is most suitable *now* or *today*.

#### Role 2 — Day Planner
Builds a realistic day scenario, not just a list of top tasks.

#### Role 3 — Decomposer
Turns heavy tasks into starter steps or lighter versions.

#### Role 4 — Explainer
Tells the user briefly why this plan fits the current day.

#### Role 5 — Reflection layer (later)
Learns from what the user accepts, revises, skips, or completes.

---

## 6. Strategic Delivery Philosophy

### 6.1 Build in layers

The implementation should be layered in this order:

1. **structured context**,
2. **deterministic ranking**,
3. **plan variants**,
4. **explainability**,
5. **decomposition**,
6. **feedback/personalization**.

### 6.2 What to defer

The following should be deferred until the core planner is stable:

- advanced personalization;
- broad Prisma expansion for many task metadata fields;
- free-form AI chat as the main My Day engine;
- hidden or broad auto-mutations.

---

## 7. Target Domain Concepts

### 7.1 MyDayContext

This becomes the normalized backend representation of the user’s current day state.

#### Proposed shape

```ts
interface MyDayContextDto {
  mood: number;
  energyLevel: number;
  wishes: string[];
  timeBudgetMinutes?: number | null;
  dayIntent?: 'LIGHT' | 'BALANCED' | 'PROGRESS' | 'FOCUS' | 'CATCH_UP' | null;
  focusCapacity?: 'LOW' | 'MEDIUM' | 'HIGH' | null;
  stressLevel?: 'LOW' | 'MEDIUM' | 'HIGH' | null;
  interactionPreference?: 'SOLO' | 'MIXED' | 'SOCIAL' | null;
}
```

#### Notes

- `mood` stays for UX continuity.
- `wishes` stay as soft intent hints.
- New fields can be optional initially.
- Backend must support defaults so current frontend flows do not break.

### 7.2 TaskFeatures

These are derived features used for ranking.

```ts
interface TaskFeatures {
  estimatedMinutes: number | null;
  focusDemand: 'LOW' | 'MEDIUM' | 'HIGH';
  energyDemand: 'LOW' | 'MEDIUM' | 'HIGH';
  taskType: 'ADMIN' | 'COMMUNICATION' | 'ROUTINE' | 'DEEP' | 'CREATIVE' | 'MIXED';
  frictionScore: number;      // 0..100
  impactScore: number;        // 0..100
  urgencyScore: number;       // 0..100
  momentumScore: number;      // 0..100
  overloadRisk: number;       // 0..100
  starterStepPossible: boolean;
  quickWin: boolean;
  blocked: boolean;
}
```

### 7.3 PlanVariant

```ts
type PlanVariantType = 'BALANCED' | 'LIGHT' | 'FOCUS';
```

Each variant is a user-facing scenario for the day.

### 7.4 Recommendation primitives

```ts
interface TaskRecommendation {
  taskId: string;
  score: number;
  reasonLabels: string[];
  starterStep?: string | null;
  estimatedMinutes?: number | null;
}

interface DeferredTaskRecommendation {
  taskId: string;
  reason: string;
}
```

---

## 8. Data Strategy

### 8.1 First-wave strategy: derive instead of persist

Do **not** start by adding many Prisma fields.

Instead:

- derive features on the fly in the AI planning layer;
- use current task fields and content as signals;
- store recommendation detail inside `planPayload`;
- validate usefulness before schema expansion.

### 8.2 Existing data signals to use immediately

The planner can already use:

- task `priority`;
- task `deadline`;
- task `status`;
- list context;
- title/description language;
- subtasks;
- whether a task is already partially progressed;
- whether a task is near completion;
- created / updated timestamps if helpful;
- current My Day-related preferences (`dayMood`, `dayEnergy`, `dayWishes`).

### 8.3 Candidate persisted fields for a later phase

Only after proving value should TASKA consider persisting fields like:

- `estimatedMinutes`;
- `taskType`;
- `focusDemand`;
- `energyDemand`;
- maybe `impactScore` if it becomes editable and meaningful.

Do **not** persist everything the model can infer.

---

## 9. Backend Implementation Plan

# 9.1 Phase 1 — Contract and service foundation

## Objective
Create the backend scaffolding for deterministic day planning.

## Work items

### 9.1.1 Introduce DTOs
Add backend DTOs for:

- `MyDayContextDto`
- `BuildMyDayPlanRequestDto` or equivalent structured `/ai/plan` context subtype
- optional `ReviseMyDayPlanDto` helper payload if revise actions become structured

### 9.1.2 Introduce planner-specific types
Create internal types for:

- `TaskFeatures`
- `ScoredTask`
- `PlanVariant`
- `RecommendationSummary`
- `MyDayPlanPayload`

### 9.1.3 Create `DayPlanningService`
Responsibilities:

- normalize context;
- load candidate tasks;
- derive features;
- rank tasks;
- compose variants;
- request explanation payload from LLM;
- return `planPayload + operations`.

### 9.1.4 Keep compatibility with current `/ai/plan`
The implementation should extend, not break, the current AI foundation.

The service should be plugged into current planning flow under a My Day-specific branch, not as a separate standalone mutation system.

---

# 9.2 Phase 2 — Candidate collection and hard filters

## Objective
Reduce noise before any model assistance.

## Candidate pool rules

Include tasks that are:
- active;
- owned by the current user;
- not deleted;
- not already completed;
- optionally in scope for the current AI request.

## Hard filters v1

Exclude or strongly de-prioritize tasks that:
- are `DONE`;
- are impossible to begin today;
- clearly exceed available time without breakdown potential;
- are clearly blocked;
- are in conflict with current day mode;
- would require unsupported operation types to represent in My Day.

## Important nuance

Where exact data is unavailable, introduce **soft exclusion or heavy score penalties**, not fake certainty.

Example:
- if blocked state is not explicit, use a heuristic and lower confidence.

---

# 9.3 Phase 3 — Derived feature engine

## Objective
Create a reusable feature-extraction layer for tasks.

## Inputs

- current task fields;
- text content;
- subtasks;
- current status;
- deadline proximity;
- user context;
- optionally history hints.

## Output categories

### a) Time cost
Estimate whether task is:
- short,
- medium,
- long.

### b) Cognitive demand
Estimate whether task needs:
- low focus,
- medium focus,
- deep focus.

### c) Energy demand
Estimate whether task is suitable for:
- low energy,
- medium energy,
- high energy.

### d) Friction
Estimate how hard it is to start.

### e) Impact
Estimate strategic value / unblock power.

### f) Momentum
Estimate whether continuing it now is efficient.

### g) Decomposability
Estimate whether a meaningful starter step can be proposed.

## Implementation note

This feature engine should be deterministic by default. If LLM assistance is used for feature classification, it should be constrained, cached if possible, and not treated as absolute truth.

---

# 9.4 Phase 4 — Scoring engine

## Objective
Turn ranked choice into a transparent backend responsibility.

## Base formula

```text
score = urgency + impact + dayFit + momentum + strategicValue - friction - overloadRisk
```

## Subscore definitions

### urgency
Factors:
- overdue;
- due today;
- due tomorrow;
- high priority;
- stale unfinished urgent work.

### impact
Factors:
- priority proxy;
- unblock effect;
- relevance to important work streams;
- high-value outcome potential.

### dayFit
Factors:
- fit to current energy;
- fit to current focus capacity;
- fit to selected day intent;
- compatibility with wishes.

### momentum
Factors:
- already started;
- nearly complete;
- continuing it is cheaper than switching.

### strategicValue
Factors:
- good “one meaningful thing today” candidate;
- contributes visible progress;
- aligns with `FOCUS` or `PROGRESS` mode.

### friction
Factors:
- vague start;
- unpleasant setup burden;
- heavy communication cost;
- emotional resistance;
- high uncertainty.

### overloadRisk
Factors:
- too long for current time budget;
- too many heavy tasks in one plan;
- poor fit to current energy/stress state.

## Weighting philosophy

Start with understandable weights, not a black-box formula. Weights should be easy to tune after internal testing.

---

# 9.5 Phase 5 — Day-plan composition

## Objective
Build day scenarios instead of a single ranked list.

## Required variants

### Variant A — BALANCED
Structure:
- 1 primary task;
- 2 supporting tasks;
- 1 fallback task.

Use case:
- default realistic day;
- balances urgency and progress.

### Variant B — LIGHT
Structure:
- 2–3 low-friction tasks;
- optionally one starter step for an important task;
- lower overload ceiling.

Use case:
- low energy;
- high stress;
- “don’t burn out but move forward”.

### Variant C — FOCUS
Structure:
- 1 major deep task;
- 1–2 short supporting tasks;
- reduce context switching.

Use case:
- high energy;
- high focus;
- visible progress day.

## Additional output

Each variant should also include:
- deferred tasks;
- load assessment;
- short explanation;
- estimated total effort.

---

# 9.6 Phase 6 — LLM explanation and decomposition layer

## Objective
Use the model where it adds the most value.

## LLM responsibilities

The model should:
- explain *why this plan fits today*;
- produce human-readable selection reasons;
- suggest starter steps for difficult tasks;
- suggest lighter alternatives if asked;
- optionally refine unclear derived classifications.

## LLM non-responsibilities

The model should not:
- decide raw business logic alone;
- bypass backend filtering;
- invent unsupported mutations;
- redefine My Day as a physical DB list;
- create hidden broad side effects.

## Input to LLM

Send:
- normalized day context;
- ranked shortlist;
- derived features;
- allowed operation constraints;
- required output schema.

Do **not** send only an enormous free-form prompt with raw tasks as the main decision mechanism.

---

# 9.7 Phase 7 — `planPayload` expansion

## Objective
Make `AiOperation.planPayload` useful both for UI preview and deterministic execute.

## Target payload structure

```ts
interface MyDayPlanPayload {
  kind: 'MY_DAY_RECOMMENDATION';
  context: {
    mood: number;
    energyLevel: number;
    wishes: string[];
    timeBudgetMinutes: number | null;
    dayIntent: string | null;
    focusCapacity: string | null;
    stressLevel: string | null;
    interactionPreference: string | null;
  };
  featuresVersion: string;
  scoringSummary: {
    strategy: string;
    weights: Record<string, number>;
  };
  variants: Array<{
    type: 'BALANCED' | 'LIGHT' | 'FOCUS';
    title: string;
    summary: string;
    primaryTask: TaskRecommendation | null;
    supportingTasks: TaskRecommendation[];
    fallbackTask: TaskRecommendation | null;
    deferredTasks: DeferredTaskRecommendation[];
    loadAssessment: {
      estimatedMinutes: number | null;
      effort: 'LOW' | 'MEDIUM' | 'HIGH';
      riskOfOverload: 'LOW' | 'MEDIUM' | 'HIGH';
    };
    whyThisPlan: string;
  }>;
  selectedVariant?: 'BALANCED' | 'LIGHT' | 'FOCUS';
  operations: unknown[];
  executionPreview: {
    affectsVirtualMyDay: true;
    changesDeadlines: boolean;
    createsSubtasks: boolean;
  };
}
```

## Why this matters

This allows the frontend to present:
- scenarios,
- explanations,
- deferred-task rationale,
- and safe-mode actions,

without losing compatibility with backend execution.

---

# 9.8 Phase 8 — Execute and undo safety rules

## Objective
Preserve deterministic and bounded side effects.

## Allowed execute behavior for My Day v1

Prefer these operations only:
- `UPDATE_TASK` to move tasks into “today” through deadline logic;
- `CREATE_SUBTASK` for starter-step assistance;
- carefully bounded supporting mutations if already supported by backend infrastructure.

## Explicit non-goals for v1 execute

Do not do all of the following in the first release:
- broad status rewrites;
- invisible priority rewrites;
- physical “My Day list” creation;
- large bulk task restructuring;
- high-risk mutation bundles.

## Undo expectations

Undo must remain clear and bounded, especially when deadline changes are used to represent My Day membership.

---

## 10. Frontend Implementation Plan

# 10.1 Phase 1 — Preserve current UX while extending context

## Objective
Keep current My Day modal familiar while unlocking better planning.

## Stage 1 UI inputs
Keep:
- mood;
- energy;
- wishes.

Add progressively:
- time budget;
- day intent;
- optional focus mode;
- optional gentle-vs-push toggle.

## Design rule

The modal must stay lightweight. It should feel like a quick setup, not like filling a productivity form.

---

# 10.2 Phase 2 — My Day preview redesign

## Objective
Present a day plan as understandable scenarios.

## Preview should show

For each variant:
- title;
- short summary;
- primary task;
- supporting tasks;
- fallback task;
- why this plan fits;
- what was intentionally deferred;
- estimated load.

## Required user actions

- choose this plan;
- revise it lighter;
- revise it for stronger focus;
- break down the primary task;
- regenerate with current preferences.

---

# 10.3 Phase 3 — Proposal card specialization

## Objective
Use the current proposal-card paradigm but make it My Day-native.

## Card sections

- variant header;
- plan summary;
- primary task block;
- supporting tasks block;
- fallback block;
- deferred items block;
- “why this fits today” explanation;
- CTA cluster.

## CTA cluster examples

- **Choose this plan**
- **Make it lighter**
- **Focus on one big thing**
- **Break down main task**
- **Rebuild from current state**

---

# 10.4 Phase 4 — Revise UX as quick actions

## Objective
Reduce reliance on free-form text revise.

## Quick revise actions

- Make the day lighter
- Add more quick wins
- Keep only essential items
- Replace the main task
- Break the main task into a first step
- Reduce overload

## Why this matters

This aligns better with safe-mode and helps users steer the planner without crafting prompts.

---

## 11. Task Modal and Broader Task-Management AI

# 11.1 Expand the task assistant beyond My Day

The task assistant should support these focused actions:

1. **Break down this task**
2. **What is the best first step?**
3. **Give me a 10-minute version**
4. **Make this task easier to start**
5. **Should this be part of today?**
6. **What can I defer instead?**

# 11.2 Shared planning logic

The same derived-task-feature and decomposition logic used for My Day should be reusable in task modal flows.

This prevents duplication and helps the product feel like one assistant, not separate AI islands.

---

## 12. Feedback and Personalization Roadmap

# 12.1 Do not start with personalization as the foundation

Personalization must come **after** ranking quality is acceptable.

# 12.2 Minimal feedback loop

After plan use, optionally ask:
- Was this plan helpful?
- Too hard or too easy?
- What did you actually complete?

# 12.3 Early feedback storage strategy

Initially, feedback can be stored without major schema changes, for example in:
- AI operation metadata;
- history payloads;
- or a narrowly scoped feedback structure later.

# 12.4 Later personalization opportunities

Possible future tuning dimensions:
- tolerance for hard tasks on low-energy days;
- preference for quick wins vs deep work;
- morning/evening focus patterns;
- communication-task avoidance under stress;
- willingness to continue in-progress work.

---

## 13. Prisma and Data Evolution Strategy

# 13.1 First-wave principle

No major Prisma expansion unless required.

# 13.2 Potential second-wave additions

Only later, and only if justified:
- `estimatedMinutes`
- `taskType`
- `focusDemand`
- `energyDemand`
- editable strategic/impact hints

# 13.3 Avoid overfitting the schema too early

Many recommendation signals are ephemeral and day-dependent. Those should remain computed rather than stored.

---

## 14. Observability, Analytics, and Quality Control

# 14.1 Engineering telemetry

For each My Day plan generation, record structured logs including:
- requestId;
- userId;
- candidate count;
- filtered count;
- shortlist count;
- selected variant;
- fallback usage;
- execute outcome;
- undo usage.

# 14.2 Product metrics

Track:
- proposal acceptance rate;
- confirm rate;
- execute rate;
- undo rate;
- revise frequency;
- selected variant distribution;
- number of tasks completed from My Day;
- how often light plan outperforms balanced plan in actual completion.

# 14.3 Quality alerts

Investigate if any of these happen often:
- AI frequently fails to generate today-bound operations;
- low-energy days receive deep heavy plans;
- users often undo My Day operations;
- users repeatedly revise to make plans lighter;
- plan explanations are vague or generic;
- deferred-task reasons do not make sense.

---

## 15. Risk Register and Mitigations

### Risk 1 — LLM makes noisy or odd recommendations
**Mitigation:** shortlist and rank in backend first.

### Risk 2 — Overloading the user’s day
**Mitigation:** load caps, variant design, overload penalties.

### Risk 3 — My Day stops being virtual
**Mitigation:** keep deadline-based representation and existing smart-list rules.

### Risk 4 — Prompt-only logic becomes fragile
**Mitigation:** move decision logic into deterministic planner service.

### Risk 5 — Premature schema bloat
**Mitigation:** derived features first, migrations later only if justified.

### Risk 6 — UI complexity increases too fast
**Mitigation:** add new day-context controls gradually and keep defaults strong.

### Risk 7 — Explanation layer becomes essay-like and noisy
**Mitigation:** enforce concise structured explanation schema.

---

## 16. Delivery Roadmap by Milestones

# Milestone 1 — Planning contracts and backend skeleton

### Deliverables
- structured `MyDayContextDto`;
- internal planning types;
- `DayPlanningService` shell;
- My Day-specific planning branch inside AI flow;
- no breaking API changes.

### Success criteria
- planning logic has a stable home;
- frontend compatibility preserved.

---

# Milestone 2 — Deterministic ranking MVP

### Deliverables
- candidate selection;
- hard filters;
- derived features v1;
- score formula v1;
- ranked shortlist;
- variant composition;
- basic `planPayload` expansion.

### Success criteria
- My Day quality no longer depends mainly on free-form prompt wording.

---

# Milestone 3 — Explainable My Day preview

### Deliverables
- variant-based proposal card UX;
- “why this plan” explanation;
- deferred-task rationale;
- choose/revise plan interactions.

### Success criteria
- user understands and trusts why the plan looks the way it does.

---

# Milestone 4 — Decomposition and anti-friction support

### Deliverables
- starter-step suggestions;
- lighter alternatives;
- quick-action revise controls;
- task modal reuse.

### Success criteria
- assistant helps not only choose tasks, but start them.

---

# Milestone 5 — Feedback and lightweight personalization

### Deliverables
- short post-plan feedback capture;
- product metrics wiring;
- early preference tuning rules.

### Success criteria
- planner becomes incrementally more personal without changing core architecture.

---

## 17. Prioritization

### P0 — Must-have
- backend normalized My Day context;
- deterministic ranking layer;
- hard filters;
- plan variants;
- expanded `planPayload`;
- safe-mode compatibility;
- virtual My Day preservation.

### P1 — Strongly recommended
- starter steps;
- concise explanation schema;
- deferred-task reasons;
- quick revise actions;
- product telemetry.

### P2 — Later
- personalization;
- new persisted task metadata;
- richer long-term task profiling;
- broader `/ai/chat` role in planning.

---

## 18. Explicit First-Release Non-Goals

Do **not** attempt all of this in the first implementation wave:

- full ML-style personalization;
- many new task metadata fields in Prisma;
- turning My Day into its own stored list entity;
- free-form chat as the main daily-planning engine;
- broad automatic task-state rewrites;
- large UX overhauls that discard current AI proposal flows.

---

## 19. Practical End-State Vision

When this blueprint is executed successfully, the user experience should feel like this:

1. The user opens My Day.
2. They quickly choose state signals.
3. TASKA proposes 2–3 realistic day scenarios.
4. Each scenario is brief, understandable, and clearly justified.
5. The user chooses the version that fits their day.
6. If the main task feels heavy, TASKA offers a starter step.
7. Only after confirmation does TASKA apply bounded changes.
8. Over time, TASKA gets better at recommending the right plan shape.

That is the target: **a calm, trustworthy planner — not a chaotic AI oracle.**

---

## 20. Recommended Next Blueprint (follow-up implementation spec)

After this document is approved, the next execution document should define:

1. exact file/module placement;
2. DTO definitions;
3. `planPayload` schema in code terms;
4. score formula v1 with initial weights;
5. LLM prompt/schema for explanation;
6. frontend variant-preview component contract;
7. commit-by-commit implementation sequence.

---

## 21. Final Recommendation

For TASKA, the strongest path is:

> **Hybrid AI planner**  
> = backend ranking and filtering  
> + LLM explanation and decomposition  
> + safe-mode preview  
> + confirm before execute  
> + later personalization

This path is aligned with the current architecture, minimizes risk, and gives the largest real product improvement for both My Day and broader task-management AI.
