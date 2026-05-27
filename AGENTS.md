# CareFlow Agent Guide

Operational rules for coding agents working in the CareFlow repository.

CareFlow is a full-stack EHR-style scheduling and patient workflow app:
React + Vite frontend, Django + DRF backend, PostgreSQL, Vercel + Render.
API routes are versioned under `/v1/`. Framework and dependency versions live
in `frontend/package.json` and `backend/requirements.txt`; check those files
instead of copying version numbers here.

Product, UI, backend, and testing philosophy lives in `docs/engineering/`.
This root guide is for agent behavior, safety, continuity, and execution.

---

## Priority Order

When rules conflict, follow this order:

1. Explicit user request
2. Safety and data integrity
3. Current state in `CONTINUITY.md`
4. Existing architecture and product conventions
5. Scope minimization
6. Local style preferences

Do not sacrifice correctness, security, privacy, or data integrity for
stylistic consistency.

> Compliance note: Do not claim HIPAA compliance, SOC 2 status, or any
> regulatory posture unless formally audited. Treat CareFlow as
> healthcare-oriented software regardless of environment.

---

## Core Non-Negotiables

- Read `CONTINUITY.md` before acting.
- Do not read or rely on prior chat context unless the durable fact is recorded
  in `CONTINUITY.md`.
- Do not overwrite unrelated work.
- Preserve auth, facility scoping, and permission boundaries.
- Do not broaden scope without justification.
- Do not invent speculative abstractions.
- Verify important changes before finalizing.
- Keep patches reviewable and reversible.
- Do not print secrets, tokens, private keys, broad environment dumps, or real
  patient data.
- Do not ask the user to paste secrets.

---

## Quick Reference

Before any code:

1. Read `CONTINUITY.md`.
2. Confirm scope; ask only if ambiguity blocks progress.
3. Inspect the files you will touch.
4. Read the relevant engineering docs:
   - UI work: `docs/engineering/ui-principles.md`
   - Backend/API work: `docs/engineering/backend-guidelines.md`
   - Test planning: `docs/engineering/testing.md`
5. For non-trivial work, sketch a verification plan.

While coding:

- Every changed line traces to the request, required cleanup, or verification.
- Match local patterns; do not introduce new ones when existing ones work.
- State assumptions and surface meaningful tradeoffs.
- Iterate against verification, not vibes.

Before finishing:

- Run the verification checklist for the change type.
- Update `CONTINUITY.md` if state changed meaningfully.
- Call out residual risks and skipped checks.
- Start the final reply with a brief ledger snapshot: Goal, Now, Next, and Open
  Questions.

When in doubt, pause and ask, especially before auth changes, schema redesigns,
destructive git operations, workflow-critical UI changes, global UX systems, or
new paid/vendor dependencies.

---

## Anti-Patterns

Do not:

- overwrite unrelated work or broaden scope without justification
- invent speculative abstractions or premature configurability
- silently swallow errors or hide failures with fallback behavior
- build fake loading states or mock systems
- introduce formatting churn unrelated to the task
- introduce new patterns when existing ones work
- introduce new global UX systems unnecessarily, such as banner systems, toast
  systems, or loading frameworks
- weaken auth, facility scoping, or permission boundaries
- print secrets, tokens, environment dumps, SSNs, DOBs, or full patient records
- request user secrets
- write multi-sentence help blocks or inline guides ('how to' copy) that act as an app manual; keep interface labels and hints short and obvious

---

## Refactor Rules

Refactor only when:

- the current task requires it
- the existing structure blocks correctness
- the refactor reduces future complexity
- the refactor can be verified safely

Prefer local improvement over architectural rewrites. Drive-by refactors during
feature work are not allowed.

---

## Continuity Rules

`CONTINUITY.md` is the canonical workspace memory. The riskiest moment in
multi-agent work is handoff; the ledger exists so future agents do not
relitigate prior decisions.

### Required Behavior

- Read `CONTINUITY.md` before acting.
- Update it only for meaningful state changes.
- Keep entries factual, compact, and high-signal.
- Tag entries with `[USER]`, `[CODE]`, `[TOOL]`, or `[ASSUMPTION]`.
- Use `UNCONFIRMED` instead of guessing.
- Capture active risks, durable decisions, current state, and next steps.

### Bounds

- Snapshot: max 25 lines.
- Done (recent): max 7 bullets.
- Working Set: max 12 paths.
- Receipts: keep only recent relevant entries.

If sections grow noisy, compress older entries into milestone bullets with a
pointer to the relevant commit, PR, doc path, or log path.

### Durable Decisions

Use lightweight ADR-style entries:
`D001 ACTIVE: use shared modal composition for patient workflows.`

Entries should be specific and verifiable — include what changed, what was
verified, and whether a migration was required. Avoid vague summaries.

---

## Multi-Agent Workflow

Multiple coding assistants may work on CareFlow. All follow these rules
regardless of provider. Route work by task shape (UI iteration, long backend,
schema/migration, cross-cutting refactor), not by model brand. The agent with
verified access to the relevant tooling wins.

---

## Frontend Discipline

Before changing authenticated UI:

- Read `docs/engineering/ui-principles.md`.
- Reuse existing tokens/components.
- Preserve workflow density and visual restraint.
- Prefer composition over giant page components.
- Verify major UI changes visually in Chrome when feasible.

Use Google Chrome for CareFlow visual inspection/QA unless the user explicitly
asks for another browser surface.

---

## Backend Discipline

Before changing backend behavior:

- Read `docs/engineering/backend-guidelines.md`.
- Keep APIs facility-scoped and role-aware.
- Preserve auth and permission boundaries.
- Add migrations when models change; never edit existing migrations unless the
  user explicitly asks and the migration has not been shared.
- Keep storage abstractions compatible with future object storage backends.

Mutations to patient-adjacent models should be auditable. If a model lacks
audit hooks and your task touches it, flag this in `CONTINUITY.md` rather than
adding ad-hoc logging.

---

## Modularity

Split growing workflows into components, hooks, serializers, services, and
utilities. Keep public interfaces stable; isolate volatile logic behind smaller
helpers.

### File Size

Soft target: about 300 LOC for hand-written files. This is a smell, not a hard
rule.

When a hand-written file crosses about 400 LOC, either:

- justify why splitting would harm cohesion, or
- propose a split as part of the current task, only if the task already touches
  that file.

Do not split files purely to hit the target during unrelated work.

---

## Git Rules

Default to local-only work unless the user explicitly asks to stage, commit,
push, or open a PR.

Never:

- overwrite unrelated changes
- use destructive git operations without explicit instruction
- rebase, amend, force-push, reset, or delete branches unless requested
- stage unrelated files
- stage ignored local agent files such as `AGENTS.md` or `CONTINUITY.md` unless
  the user explicitly asks

Always:

- keep patches reviewable and scoped
- check `git status --short` before staging
- use non-interactive git commands
- avoid formatting churn unrelated to the task

Branch, commit, and PR naming conventions belong in project workflow docs. When
asked to name a branch, commit work, push, or draft PR copy, read
`docs/engineering/git-workflow.md` first. When drafting PR copy, also follow
`.github/pull_request_template.md`.

---

## Escalation Rules

Pause and ask before:

- destructive operations
- schema redesigns
- authentication behavior changes
- deleting large code sections
- introducing infrastructure or platform changes
- introducing paid or vendor dependencies
- changing workflow-critical UI patterns
- introducing new global UX systems
- making production or remote API writes

Never run commands against a shared or production database without explicit
instruction.

---

## Verification

Read `docs/engineering/testing.md` for full pass criteria.

- **UI**: no console errors, matches density/spacing tokens, no layout shift.
  Major changes: `npm run dev` + Chrome visual QA. Minor: use judgment, note if
  skipped.
- **Backend**: `manage.py check` + relevant tests pass. Facility-scoped
  endpoints reject cross-facility. Migrations apply cleanly.
- **Refactors**: existing tests pass, `npm run build` succeeds, grep confirms
  old symbols removed.

If checks are skipped, explain why.

---

## Commands

Run from the relevant subdirectory.

- **Frontend**: `npm run build`, `npx eslint <files>`, `npm run dev`
  (from `frontend/`).
- **Backend safe** (run unprompted): `./venv/bin/python manage.py check`,
  `./venv/bin/python manage.py test` (from `backend/`).
- **Backend state-changing** (need task justification):
  `manage.py migrate`, `makemigrations`, `loaddata <fixture>`.

Never run database reset/flush, destructive seeds, production migrations, or
shared-database writes without explicit instruction.

---

## Communication Style

- Think privately (e.g. in `<thought>` tags or internal thinking spaces).
- Do not print reasoning in the final response to the user.
- Skip preambles and explanations unless necessary.
- Only report actions, blockers, and final outputs.

---

## Definition Of Done

A task is complete when:

- requested behavior works or the requested question is answered
- diff is appropriately scoped
- relevant verification was performed
- skipped checks are explained
- migrations are included if required
- `CONTINUITY.md` is updated for meaningful state changes
- residual risks or follow-ups are called out clearly
