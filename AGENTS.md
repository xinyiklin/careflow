# CareFlow Agent Guide

Operational rules for coding agents working in the CareFlow repository.

CareFlow is a full-stack EHR-style clinic workflow demo: React + Vite
frontends, Django + DRF backend, PostgreSQL, Vercel + Render. API routes are
versioned under `/v1/`. The repo is an npm workspaces monorepo with clinician
and patient frontends in `apps/`, generated OpenAPI types in
`packages/api-types/`, shared icon assets in `packages/ui-icons/`, and the
Django backend in `backend/`.

This guide owns agent behavior, safety, continuity, and routing. Product intent
lives in `PRODUCT.md`; token and component vocabulary lives in `DESIGN.md`;
engineering details live in `docs/engineering/`.

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

## Source Of Truth

- `CONTINUITY.md`: current workspace state, handoff notes, active risks, durable
  decisions, and next steps.
- `PRODUCT.md`: product register, users, workflows, tone, boundaries, and
  roadmap.
- `DESIGN.md`: design tokens, density, component vocabulary, and screen
  standards.
- `docs/engineering/ui-principles.md`: UI behavior rules, copy/chrome
  constraints, loading/error states, and visual QA expectations.
- `docs/engineering/backend-guidelines.md`: API, auth, facility scoping, errors,
  logging, audit, migrations, storage, and deployment expectations.
- `docs/engineering/testing.md`: verification strategy and pass criteria.
- `docs/engineering/git-workflow.md`: branch, commit, PR, review, and merge
  workflow.
- `docs/engineering/architecture.md`: repo layout, app boundaries, shared
  packages, and deployment shape.
- App and backend README files: local setup and commands for that surface.

Do not merge these files together. If there is overlap, make the root guide a
router and keep detailed rules in the narrowest relevant document.

---

## Core Rules

Before acting:

- Read `CONTINUITY.md`.
- Do not rely on prior chat context unless the durable fact is recorded in
  `CONTINUITY.md`.
- Confirm scope only when ambiguity blocks progress.
- Inspect the files you will touch.
- Read the relevant source-of-truth docs for the task.
- For non-trivial work, choose a verification plan before editing.

While working:

- Every changed line must trace to the request, required cleanup, or
  verification.
- Preserve auth, facility scoping, permission boundaries, and patient privacy.
- Do not overwrite unrelated work.
- Do not broaden scope without justification.
- Do not invent speculative abstractions or new global UX systems.
- Match existing architecture and product conventions.
- Keep patches reviewable and reversible.
- Do not print secrets, tokens, private keys, broad environment dumps, SSNs,
  DOBs, or full patient records.
- Do not ask the user to paste secrets.

Before finishing:

- Run the verification checklist for the change type.
- Update `CONTINUITY.md` if state changed meaningfully.
- Call out skipped checks, residual risks, and follow-ups.
- For non-trivial tasks, start the final reply with a brief ledger snapshot:
  Goal, Now, Next, and Open Questions. Trivial Q&A may skip it.

---

## Continuity

`CONTINUITY.md` is the canonical workspace memory. Keep it factual, compact,
and high-signal so future agents do not relitigate prior decisions.

- Tag entries with `[USER]`, `[CODE]`, `[TOOL]`, or `[ASSUMPTION]`.
- Use `UNCONFIRMED` instead of guessing.
- Capture active risks, durable decisions, current state, and next steps.
- Keep the snapshot to about 25 lines, recent done items to about 7 bullets,
  working set to about 12 paths, and receipts to recent relevant entries.
- Compress noisy history into milestone bullets with a commit, PR, doc path, or
  log path pointer.

Use lightweight ADR-style entries for durable decisions:
`D001 ACTIVE: use shared modal composition for patient workflows.`

---

## Scope And Refactors

Refactor only when the current task requires it, the existing structure blocks
correctness, or the change clearly reduces future complexity and can be
verified safely.

Prefer local improvements over architectural rewrites. Drive-by refactors
during feature work are not allowed.

Hand-written files around 300 LOC are easier to review. When a touched file
crosses about 400 LOC, either justify the cohesion or propose a split if the
task already needs that area. Do not split files purely to hit a number. This
~300/400 LOC target is per file; the separate per-PR size budget lives in
`docs/engineering/git-workflow.md`.

---

## Frontend Work

Before changing authenticated UI, read `PRODUCT.md`, `DESIGN.md`, and
`docs/engineering/ui-principles.md`.

- Reuse existing tokens, components, and density patterns.
- Preserve workflow density and visual restraint.
- Prefer composition over giant page components.
- Avoid tutorial-style copy, multi-sentence help blocks, example placeholders,
  and instructional helper text. CareFlow is for trained staff.

---

## Backend Work

Before changing backend behavior, read
`docs/engineering/backend-guidelines.md`.

- Keep APIs facility-scoped, role-aware, and auditable where patient-adjacent.
- Preserve auth and permission boundaries.
- Add migrations when models change.
- Never edit an existing migration unless the user explicitly asks and the
  migration has not been pushed to the remote or applied to any shared
  environment.
- Keep storage abstractions compatible with future object storage backends.
- If a patient-adjacent model lacks audit hooks and your task touches it, flag
  the gap in `CONTINUITY.md` instead of adding ad-hoc logging.

Destructive and shared/production-DB command rules live under Common Commands
and `docs/engineering/backend-guidelines.md`.

---

## Git And Escalation

Default to local-only work unless the user explicitly asks to stage, commit,
push, open a PR, merge, or delete a branch.

- Check `git status --short` before staging.
- Stage only files related to the requested work.
- Stage and commit `AGENTS.md` and `CLAUDE.md` like any other tracked file when
  they're part of the change; do not single them out to exclude. `CONTINUITY.md`
  and the local agent toolkit under `.claude/` are gitignored, so they never
  appear as staging candidates.
- Use non-interactive git commands.
- Do not rebase, amend, force-push, reset, delete branches, or run destructive
  operations unless explicitly requested. Feature-branch history rewrites and
  the `--force-with-lease` exception are governed by
  `docs/engineering/git-workflow.md`; never force-push `main`.
- Never bypass pre-commit hooks (`--no-verify`, `--no-gpg-sign`); if a hook
  fails, fix the cause (detail in `docs/engineering/git-workflow.md`).
- Before branch naming, committing, pushing, or drafting PR copy, read
  `docs/engineering/git-workflow.md`.
- For PR copy, also follow `.github/pull_request_template.md`.

Pause and ask before destructive operations, schema redesigns, auth behavior
changes, deleting large code sections, infrastructure/platform changes, new
paid or vendor dependencies, workflow-critical UI pattern changes, new global
UX systems, or production/remote API writes.

---

## Verification

Read `docs/engineering/testing.md` for full pass criteria.

- UI: no console errors, density/spacing match tokens, no layout shift. Major
  changes need `npm run dev:*` plus visual QA when feasible.
- Frontend packages: run affected `lint`, `typecheck`, and `build` scripts.
- Backend: run `manage.py check` and relevant tests. Facility-scoped endpoints
  must reject cross-facility access.
- Refactors: existing tests pass, builds succeed, and grep confirms old symbols
  or stale paths were removed.
- Docs-only changes: run `git diff --check` and targeted grep for stale terms.

Explain skipped checks.

---

## Communication

Keep reasoning private. Report actions, blockers, verification, skipped checks,
residual risks, and final outputs; avoid preambles unless they help the user
act.

---

## Common Commands

Run workspace commands from the repo root unless a README says otherwise.

- Clinician frontend:
  `npm -w @careflow/clinician run lint|typecheck|build`
- Patient frontend:
  `npm -w @careflow/patient run lint|typecheck|build`
- Local dev:
  `npm run dev:clinician` and `npm run dev:patient`
- Generated API types:
  `npm run generate`
- Backend safe checks from `backend/`:
  `./venv/bin/python manage.py check`
  `./venv/bin/python manage.py test`
- Backend state-changing commands need task justification:
  `./venv/bin/python manage.py migrate`
  `./venv/bin/python manage.py makemigrations`
  `./venv/bin/python manage.py loaddata <fixture>`

Port reservations: CareFlow owns `5173-5180`. The clinician app is fixed to
`5173` and the patient app to `5174` (both `strictPort`; see each app's
`README` for per-surface detail). If a reserved port is bound, the app is
already running — connect to it instead of starting a second dev server or
switching ports. Sibling projects: role-fit-ai `5181-5183`, portfolio
`5184-5185`.

Never run database reset/flush, destructive seeds, production migrations, or
shared-database writes without explicit instruction.

---

## Definition Of Done

A task is complete when the requested behavior works or the requested question
is answered, the diff is scoped, relevant verification was performed, skipped
checks are explained, migrations are included when required, `CONTINUITY.md` is
updated for meaningful state changes, and residual risks or follow-ups are
called out clearly.
