# CareFlow Agent Guide

Operational rules for coding agents working in the CareFlow repository.

CareFlow is a full-stack EHR-style clinic workflow demo: React + Vite
frontends, Django + DRF backend, PostgreSQL, AWS Amplify + Render. API routes are
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

- `CONTINUITY.md` — current state, handoff notes, active risks, durable
  decisions, next steps.
- `PRODUCT.md` — product register, users, workflows, tone, boundaries, roadmap.
- `DESIGN.md` — tokens, density, component vocabulary, screen standards.
- `docs/engineering/` — `ui-principles.md` (UI behavior, copy/chrome, loading
  and error states, visual QA), `backend-guidelines.md` (API, auth, facility
  scoping, errors, logging, audit, migrations, storage, deploy),
  `testing.md` (verification strategy and pass criteria), `git-workflow.md`
  (branch, commit, PR, review, merge), `architecture.md` (repo layout, app
  boundaries, shared packages, deployment shape).
- App and backend README files — local setup and commands for that surface.

Do not merge these files together. If there is overlap, make the root guide a
router and keep detailed rules in the narrowest relevant document.

---

## Delivery Workflow

Non-trivial work runs through the portable `product-delivery` workflow
(Product Partner → Delivery Lead → Verifier) installed at
`~/.agents/workflows/product-delivery/`. That package owns the process: the two
exact user-approval gates, Change Request escalation, and honest verification
reporting. Do not copy it here. This repo may strengthen it, never weaken it.

- **Independent review:** after the implementer's own verification, one fresh
  reviewer by default. Only the user may waive it for a specific change. If the
  user asks for more reviewers, give a firm risk-based recommendation first,
  then honor the request.
- **Expect a second reviewer** for auth or permission-boundary changes,
  facility scoping, non-additive migrations, and patient-adjacent data paths.
- **Extra Change Request triggers** beyond the portable list: weakening
  facility scoping or audit coverage, and any migration that is not additive
  and reversible.
- **Task artifacts** live under `.agent-work/tasks/<task-id>/` and stay local,
  like `CONTINUITY.md` and `.claude/`. Keep continuity entries self-contained
  so they remain useful without those files, and tag them `[TASK <task-id>]`.

The seven workflow templates are building blocks, not mandatory files. A normal
task uses Product Brief, Delivery Plan, Alignment Review, Implementation
Report, and Verification Report; create a Decision Log or Change Request only
when its trigger occurs.

---

## Core Rules

**Before acting:** read `CONTINUITY.md` and the source-of-truth docs the task
touches; inspect the files you will change; choose a verification plan for
non-trivial work. Do not rely on prior chat context unless the durable fact is
recorded in `CONTINUITY.md`. Confirm scope only when ambiguity blocks progress.

**While working:** every changed line traces to the request, its cleanup, or
verification. Preserve auth, facility scoping, permission boundaries, and
patient privacy. Match existing architecture and product conventions; keep
patches reviewable and reversible. Do not overwrite unrelated work, broaden
scope without justification, or invent speculative abstractions and new global
UX systems. Never print secrets, tokens, private keys, broad environment dumps,
SSNs, DOBs, or full patient records, and never ask the user to paste a secret.

**Before finishing:** run the verification checklist for the change type,
update `CONTINUITY.md` if state changed meaningfully, and call out skipped
checks, residual risks, and follow-ups. Open non-trivial replies with a Goal /
Now / Next / Open Questions snapshot.

---

## Continuity

`CONTINUITY.md` is the canonical workspace memory — factual, compact, and
high-signal, so future agents do not relitigate prior decisions. Capture active
risks, durable decisions, current state, and next steps; tag entries `[USER]`,
`[CODE]`, `[TOOL]`, or `[ASSUMPTION]`; write `UNCONFIRMED` instead of guessing.
Keep Snapshot ~25 lines, recent Done ~7 bullets, working set ~12 paths, and
compress noisy history into milestone bullets pointing at a commit, PR, doc, or
log. Durable decisions take ADR-lite form:
`D001 ACTIVE: use shared modal composition for patient workflows.`

---

## Scope And Refactors

Refactor only when the task requires it, the structure blocks correctness, or
the change clearly reduces future complexity and can be verified safely. Prefer
local improvements over rewrites; drive-by refactors during feature work are
not allowed.

Files around 300 LOC are easier to review. Past ~400 in a file the task already
touches, justify the cohesion or propose a split — never split just to hit a
number. That target is per file; the per-PR size budget lives in
`docs/engineering/git-workflow.md`.

Keep implementation scope literal. An improvement you notice but the request
does not require gets presented to the user and waits for approval — including
drive-by fixes in files you are already editing.

Before adding or upgrading a dependency, read the constraints already in force
— root `package.json` and `package-lock.json` for the workspaces, and the
backend `requirements*.txt` and `pyproject.toml` — then verify the current
stable release from npm, PyPI, or the maintainer's release notes. Never choose
a version from memory. Prefer the latest compatible stable release, keep the
project's package manager and range policy, update the lockfile, and explain
any deliberate pin to an older or prerelease version.

Comment only for non-obvious rationale, constraints, or safety. Do not narrate
self-explanatory code; durable rationale belongs in `docs/engineering/`.

---

## Frontend Work

Before changing authenticated UI, read `PRODUCT.md`, `DESIGN.md`, and
`docs/engineering/ui-principles.md`.

- Reuse existing tokens, components, and density patterns; preserve workflow
  density and visual restraint; prefer composition over giant page components.
- Avoid tutorial-style copy, multi-sentence help blocks, example placeholders,
  and instructional helper text. CareFlow is for trained staff.

---

## Backend Work

Before changing backend behavior, read `docs/engineering/backend-guidelines.md`
— it owns the detail; the invariants below are the ones never to trade away.

- Keep APIs facility-scoped, role-aware, and auditable where patient-adjacent,
  and preserve auth and permission boundaries.
- Add migrations when models change. Never edit an existing migration unless
  the user asks *and* it has not been pushed or applied to a shared
  environment.
- Keep storage abstractions compatible with future object-storage backends.
- If a patient-adjacent model lacks audit hooks and your task touches it, flag
  the gap in `CONTINUITY.md` rather than adding ad-hoc logging.

---

## Git And Escalation

Default to local-only work unless the user explicitly asks to stage, commit,
push, open a PR, merge, or delete a branch. Read
`docs/engineering/git-workflow.md` before branch naming, committing, pushing,
or drafting PR copy, and follow `.github/pull_request_template.md` for PRs.

- Check `git status --short` before staging; stage only related files; use
  non-interactive commands.
- Stage `AGENTS.md`/`CLAUDE.md` like any other tracked file when they're part of
  the change. `CONTINUITY.md` and `.claude/` are gitignored here.
- Do not rebase, amend, force-push, reset, delete branches, or run destructive
  operations unless explicitly requested. Feature-branch rewrites and the
  `--force-with-lease` exception are governed by the git-workflow doc; never
  force-push `main`.
- Never bypass hooks (`--no-verify`, `--no-gpg-sign`); fix the cause.

Pause and ask before destructive operations, schema redesigns, auth behavior
changes, deleting large code sections, infrastructure/platform changes, new
paid or vendor dependencies, workflow-critical UI pattern changes, new global
UX systems, or production/remote API writes.

---

## Verification

Read `docs/engineering/testing.md` for full pass criteria.

- UI: no console errors, density/spacing match tokens, no layout shift. Browser
  QA is flag-first — skip by default, and when a change carries real layout or
  density risk, name the risk and let the user decide instead of starting
  `npm run dev:*` unasked (`CLAUDE.md` has the mechanics).
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

- Frontends: `npm -w @careflow/clinician run lint|typecheck|build` (and
  `@careflow/patient`); dev via `npm run dev:clinician` / `dev:patient`.
- Generated API types: `npm run generate`.
- Backend, from `backend/` with `./venv/bin/python`: `manage.py check` and
  `manage.py test` are safe; `migrate`, `makemigrations`, and
  `loaddata <fixture>` change state and need task justification.

Never run database reset/flush, destructive seeds, production migrations, or
shared-database writes without explicit instruction.

Ports: CareFlow owns `5173-5180` — clinician `5173`, patient `5174`, landing
`5175`, all `strictPort`; backend `8000`. A bound reserved port means the app is
already running: connect to it rather than starting a second server or
switching ports. Siblings: role-fit-ai `5181-5183` + `5186`, portfolio
`5184-5185`, token-dashboard `5187-5189`.

---

## Definition Of Done

A task is complete when the requested behavior works or the requested question
is answered, the diff is scoped, relevant verification was performed, skipped
checks are explained, migrations are included when required, `CONTINUITY.md` is
updated for meaningful state changes, and residual risks or follow-ups are
called out clearly.
