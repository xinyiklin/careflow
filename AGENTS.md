# CareFlow Agent Guide

CareFlow is an EHR-style clinic workflow demo: React + Vite apps in `apps/`,
shared packages in `packages/`, a Django + DRF backend in `backend/` with routes
under `/v1/`, PostgreSQL, deployed on AWS Amplify + Render. This guide owns
agent behavior, safety, and routing; state only what an agent cannot infer
from the repository, and keep it under 8 KiB.

Safety, security, correctness, data integrity, privacy, and authorization
boundaries limit every request; within them, follow the user's current request, then current
`CONTINUITY.md` facts over older conversation, then existing conventions.

> Do not claim HIPAA compliance, SOC 2 status, or any regulatory posture unless
> formally audited. Treat CareFlow as healthcare-oriented software in every
> environment.

## Source Of Truth

- `CONTINUITY.md` — current state, active risks, durable decisions, next steps.
- `PRODUCT.md` — product register, users, workflows, tone, roadmap.
- `DESIGN.md` — tokens, density, component vocabulary, screen standards.
- `docs/engineering/README.md` — routes to UI, backend, testing, Git, and
  architecture guides. App and backend READMEs own local setup.

## Delivery Workflow

Non-trivial work runs through the `product-delivery` workflow installed at
`~/.agents/workflows/product-delivery/`, which owns plan authorization,
material-change escalation, and verification reporting. Do not copy it here;
this repo may strengthen it, never weaken it.

- **Independent review:** after your own verification, every change gets one
  fresh review by the installed Verifier (`mb-verifier` in Claude,
  `mb_verifier` in Codex), which must not have made the change. Only the user
  may waive it; record the waiver, never a pass. If the reviewer is
  unavailable, report the gap and ask for a replacement or waiver. If the user
  asks for more reviewers, recommend by risk first, then honor the request.
- **Second reviewer** (local Claude `/careflow-review`, else a second fresh
  Verifier) for auth or permission-boundary changes, facility scoping,
  non-additive migrations, and patient-adjacent data paths.
- **Extra material-change triggers** beyond the portable list: weakening
  facility scoping or audit coverage, and any migration that is not additive
  and reversible.
- **Task artifacts** live under `.agent-work/tasks/<task-id>/`, stay local, and
  go to the trash when the task's final PR merges. Keep continuity entries
  self-contained and tag them `[TASK <task-id>]`.

A normal task creates one living Implementation Plan and a Verification
Report; the package's other templates are optional.

## Core Rules

**Before acting:** read `CONTINUITY.md` and the source-of-truth docs the task
touches; inspect the files you will change; choose a verification plan for
non-trivial work.

**While working:** preserve auth, facility scoping, permission boundaries, and
patient privacy, and do not overwrite unrelated work. Never print secrets,
tokens, private keys, broad environment dumps, SSNs, DOBs, or full patient
records, and never ask the user to paste a secret.

**Before finishing:** the requested behavior works or the question is
answered, the diff is scoped, verification ran, migrations are included when
required, and `CONTINUITY.md` reflects meaningful state changes. Report
skipped checks with reasons, residual risks, and follow-ups; keep reasoning
private. When a harness or session limit prevents a required process, say so
and continue authorized work; never skip it silently. Open non-trivial replies
with a Goal / Now / Next / Open Questions snapshot.

## Continuity

`CONTINUITY.md` holds current state only, within 160 lines: active risks,
durable decisions, next steps. Tag entries `[USER]`, `[CODE]`, `[TOOL]`, or
`[ASSUMPTION]`; write `UNCONFIRMED` instead of guessing. Decisions use
ADR-lite form (`D001 ACTIVE: <rule>`). Rotate resolved entries verbatim to the
local, append-only
`docs/continuity/YYYY-MM.md`; the `continuity` skill does this.

## Scope And Refactors

Keep implementation scope literal: every changed line traces to the request,
its cleanup, or verification. An improvement the request does not require —
including a drive-by fix in a file you are already editing — goes to the user
and waits for approval. No speculative abstractions or new global UX systems.

Refactor only when the task requires it, the structure blocks correctness, or
the change clearly reduces future complexity and can be verified safely.
Files around 300 LOC are easier to review; past ~400 in a file the task
touches, justify the cohesion or propose a split. The per-PR budget lives in
`docs/engineering/git-workflow.md`.

Never choose a dependency version from memory; follow
`docs/engineering/architecture.md` § Dependencies.

## Frontend Work

Before changing authenticated UI, read `PRODUCT.md`, `DESIGN.md`, and
`docs/engineering/ui-principles.md`.

- Reuse existing tokens, components, and density patterns; prefer composition
  over giant page components.
- Avoid tutorial-style copy, multi-sentence help blocks, example placeholders,
  and instructional helper text. CareFlow is for trained staff.

## Backend Work

Before changing backend behavior, read `docs/engineering/backend-guidelines.md`.
Never trade away these invariants:

- Keep APIs facility-scoped, role-aware, and auditable where patient-adjacent,
  and preserve auth and permission boundaries.
- Add migrations when models change. Never edit an existing migration unless
  the user asks *and* it has not been pushed or applied to a shared
  environment.
- Keep storage abstractions compatible with future object-storage backends.
- If a patient-adjacent model lacks audit hooks and your task touches it, flag
  the gap in `CONTINUITY.md` rather than adding ad-hoc logging.

## Git And Escalation

Default to local-only work unless the user explicitly asks to stage, commit,
push, open a PR, merge, or delete a branch. Read
`docs/engineering/git-workflow.md` before any branch, commit, push, or PR work;
PRs follow `.github/pull_request_template.md`.

- Check `git status --short` before staging; stage only related files; use
  non-interactive commands. `CONTINUITY.md` and `.claude/` are gitignored.
- Do not rebase, amend, force-push, reset, delete branches, or run destructive
  operations unless explicitly requested. Feature-branch rewrites and the
  `--force-with-lease` exception are governed by the git-workflow doc; never
  force-push `main`.
- Never bypass hooks (`--no-verify`, `--no-gpg-sign`); fix the cause.

Pause and ask before destructive operations, schema redesigns, auth behavior
changes, deleting large code sections, infrastructure/platform changes, new
paid or vendor dependencies, workflow-critical UI pattern changes, new global
UX systems, or production/remote API writes.

## Verification

`docs/engineering/testing.md` owns pass criteria, including visual QA, which is
flag-first: name real layout or density risk and let the user decide instead
of starting a dev server unasked.

- Frontend packages: run affected `lint`, `typecheck`, and `build` scripts.
- Backend: run `manage.py check` and relevant tests. Facility-scoped endpoints
  must reject cross-facility access.
- Refactors: existing tests pass, builds succeed, and grep confirms old symbols
  or stale paths were removed.
- Docs-only changes: run `git diff --check` and targeted grep for stale terms.

## Common Commands

- Frontends: `npm -w @careflow/<app> run lint|typecheck|build`; dev via
  `npm run dev:<app>` (clinician, patient, landing).
- Generated API types: `npm run generate`.
- Backend, from `backend/` with `./venv/bin/python`: `manage.py check` and
  `manage.py test` are safe; `migrate`, `makemigrations`, and
  `loaddata <fixture>` change state and need task justification.

Never run database reset/flush, destructive seeds, production migrations, or
shared-database writes without explicit instruction.

Ports: clinician `5173`, patient `5174`, landing `5175` (all `strictPort`),
backend `8000`; CareFlow reserves `5173-5180`. A bound port means the app is
already running: connect to it rather than starting a second server or
switching ports.
