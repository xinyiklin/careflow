# Architecture

CareFlow is an npm workspaces monorepo with a single Django backend and
multiple React frontends. This doc covers the layout, the boundaries between
apps, and where future surfaces slot in.

## Layout

```text
careflow/
  backend/              Django + DRF; stays at root (different toolchain)
  packages/
    api-types/          @careflow/api-types — OpenAPI-generated TS types,
                        single source of truth shared by both frontends
  apps/
    clinician/          @careflow/clinician — staff/admin/clinical app
    patient/            @careflow/patient — patient portal app
```

`backend/` is deliberately not under `apps/` or `services/`. It uses pip +
venv, not npm workspaces, and ships through a separate deploy pipeline
(Render). Mixing it into `apps/` would imply a uniformity that doesn't exist.
If a second backend service appears (worker, websocket, FHIR adapter), rename
`backend/` to `services/api/` and create siblings under `services/`. Not
before — the rename touches dozens of doc/script references for no gain.

## App boundaries

### `apps/clinician`

Staff-facing EHR-style workspace: scheduling, patient registration, clinical
charting, documents, billing, admin. Dense, desktop-first, keyboard-friendly.
Hits the clinician-side `/v1/*` endpoints (facility-scoped, role-aware).

Auth: same Django `User` model, but the user must have `OrganizationMembership`
+ `Staff` profile to access the clinician surface. Per-facility permissions
gate every viewset via `FacilityScopedViewSetMixin`.

### `apps/patient`

Patient-facing portal: view profile, upcoming/past appointments, medications,
allergies. Calm, mobile-first, read-only in v1. Hits the patient-side
`/v1/portal/*` endpoints (single-patient-scoped via portal account link).

Auth: a `User` with an active `PatientPortalAccount` linking to one
`patients.Patient` row. `PatientPortalAccount.clean()` rejects any user that
already has clinician roles (`OrganizationMembership` or `Staff`), keeping
the two surfaces provably disjoint in v1. The portal namespace lives entirely
under `/v1/portal/` so the clinician routes can't accidentally be hit by a
portal token.

Why a join model instead of a `User.role` flag or `Patient.user` FK:

- Putting `User` on `Patient` couples two domains and makes future
  parent/guardian access awkward (one user → multiple patients).
- A `role` flag on `User` collides with `OrganizationMembership`'s
  one-org-per-user invariant.
- `PatientPortalAccount` keeps `User` neutral, lets each role context declare
  itself, and relaxes cleanly later (OneToOne → ForeignKey when proxy access
  is needed).

## Shared code

### `packages/api-types`

Generated from `drf-spectacular` (Django) → OpenAPI 3 schema → `openapi-typescript`
→ `generated.ts`. Both `schema.yaml` and `generated.ts` are gitignored;
developers regenerate with `npm run generate` from the repo root. Regenerate
after backend serializer changes. The CI guard runs `npm run generate` and
fails the build if `generated.ts` diverges from what HEAD expects (added
in a future PR — see Follow-ups).

### Why no other shared packages yet

`packages/api-client/` (lift the duplicated `client.ts`) and
`packages/ui-tokens/` (lift the duplicated `cf-*` Tailwind tokens) are obvious
candidates but **deliberately deferred**. Today both apps have verbatim copies
of these files (~400 LOC + ~80 LOC each). The cost of extracting is real
(workspace config, build orchestration, refactor in both apps); the benefit
only materializes once a third surface needs them or the two copies drift
meaningfully. Premature extraction usually guesses the wrong API.

When to extract:

- A third app appears (mobile wrap, admin-only surface, etc.).
- The clinician and patient versions of `client.ts` have meaningfully diverged
  (different refresh logic, different base URL resolution) — at that point
  the shared interface starts to fork.
- Both apps need to consume the same hand-written cross-domain util
  (date formatter, validator) — extract that single util, don't pre-build
  a whole `packages/shared/`.

## Subdomain plan

```text
app.careflow.xinyiklin.com      → apps/clinician build (Vercel project A)
portal.careflow.xinyiklin.com   → apps/patient build (Vercel project B)
api.careflow.xinyiklin.com      → backend (Render)
```

Cookie domain in production is `.careflow.xinyiklin.com`
(`backend/config/settings.py`). The refresh cookie issued by `/v1/users/token/`
is therefore valid across all three subdomains — no separate auth flow per
app is needed.

When the patient subdomain goes live, add `https://portal.careflow.xinyiklin.com`
to `CORS_ALLOWED_ORIGINS` and `CSRF_TRUSTED_ORIGINS` in the backend's
production environment (same vars that today list `app.careflow...`).

## Vercel configuration (per project)

Each app is a separate Vercel project pointing at the same repo:

```text
Project: careflow-clinician
  Root Directory: apps/clinician
  Install Command: npm install --workspaces --include-workspace-root
  Build Command: npm run build
  Output Directory: dist
  Domains: app.careflow.xinyiklin.com

Project: careflow-patient
  Root Directory: apps/patient
  Install Command: npm install --workspaces --include-workspace-root
  Build Command: npm run build
  Output Directory: dist
  Domains: portal.careflow.xinyiklin.com
```

The Install Command runs at the repo root so npm workspaces resolves the
`@careflow/api-types` symlink before the build runs from the app dir. Without
it the build fails on the cross-package import.

## Mobile (future)

The patient portal is the natural starting point for a mobile presence.
Three options, in order of effort:

1. **PWA-first** — add a web manifest + service worker to `apps/patient/`.
   Install-to-home-screen works on iOS (16+) and Android. Cheapest, no app
   store presence. Limited push notification support on iOS.
2. **Capacitor wrap** — wrap the same React build in a native shell. Add
   `npx cap init` inside `apps/patient/` (creates `ios/` + `android/` siblings)
   or as a new `apps/patient-mobile/` consuming the dist. Same codebase ships
   to web + App Store + Play Store. Adds App Store presence at the cost of
   build/release pipelines per store.
3. **React Native (Expo)** — true native UI, separate codebase, shares only
   business logic via shared packages. Heaviest, best UX. Only worth it if the
   portal becomes engagement-heavy (long sessions, gestures, offline-first).

For a read-mostly portal (forms, lists, messages), Capacitor is the natural
landing zone after PWA proves out. Don't pre-build the pipeline.

## When to add Turborepo

Today: two `npm run build`s in parallel finish in under a minute. Turborepo's
value (task graph caching, remote caching) doesn't pay back at this scale.

Triggers to add it:

- Total CI wall time consistently >5 min.
- A third app appears and CI starts duplicating work.
- Cross-app build dependencies (e.g., `apps/*` depend on a built artifact from
  `packages/*` that must compile first).

When you add it, point the Vercel build command at
`turbo build --filter=clinician` (and likewise for patient). The matrix CI
job in `.github/workflows/ci.yml` becomes a single `turbo run build lint
typecheck` invocation.

## Follow-ups (tracked here, not built)

- **Schema-drift CI guard**: `npm run generate && git diff --exit-code
  packages/api-types/src/generated.ts`. Catches the case where a serializer
  change lands without a regenerated `generated.ts`.
- **Patient self-registration**: out of scope in v1. When added, route through
  a clinician-issued one-time token rather than a public signup endpoint.
- **2FA / SSO**: lives on `User`, not `PatientPortalAccount`. Benefits both
  apps when added (django-otp or similar).
- **Multi-patient proxy access (parent/guardian)**: relax
  `PatientPortalAccount.patient` from `OneToOneField` to `ForeignKey`, add a
  `relationship` field. No model rewrite needed.
- **Audit events for portal reads**: deferred — would flood the audit log for
  read traffic. If patient self-access ever needs auditing, add a light
  portal-read audit class rather than the full `AdminAuditEvent` shape.
- **`apps/clinician/Dockerfile`**: still single-package layout. Workspace-aware
  rewrite needed before the optional Docker dev workflow works again. Docker
  is optional per `backend-guidelines.md`, so this hasn't blocked anyone.
