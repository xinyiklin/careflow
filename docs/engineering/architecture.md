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
    ui-icons/           @careflow/ui-icons — shared icon assets, consumed
                        by both frontends
    ui-tokens/          @careflow/ui-tokens — shared cf-* token contract for
                        clinician workspace and landing
  apps/
    clinician/          @careflow/clinician — staff/admin/clinical app
    patient/            @careflow/patient — patient portal app
    landing/            @careflow/landing — public marketing front door
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
charting, documents, billing, refills, messaging, admin. Dense,
desktop-first, keyboard-friendly. Hits the clinician-side `/v1/*` endpoints
(facility-scoped, role-aware).

Auth: same Django `User` model, but the user must have `OrganizationMembership`
+ `Staff` profile to access the clinician surface. Per-facility permissions
gate every viewset via `FacilityScopedViewSetMixin`.

### `apps/patient`

Patient-facing portal: dashboard/profile, appointments, medications/refills,
preferred pharmacy, allergies, medical summary, vitals, messaging,
localization, and theme preferences. Calm, mobile-first, self-service. Hits the
patient-side `/v1/portal/*` endpoints (single-patient-scoped via portal account
link).

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

### `apps/landing`

Public marketing page and front door for the whole project. A single static
page (React + Vite, no client routing) that introduces CareFlow and links out
to the two authenticated portals. Unauthenticated, calls no API, and carries no
patient data. It is the one **marketing-register** surface; everything inside
the two portals stays product-register (see `PRODUCT.md`).

Reuses the brand: the committed `cf-*` token names, Inter, and the shared
`@careflow/ui-icons` mark. Portal targets are env-configurable
(`VITE_CLINICIAN_URL` / `VITE_PATIENT_URL`) so the same build points at
whatever subdomains a given environment uses.

## Payer and pharmacy directory ownership

Payers and pharmacies use a shared canonical directory with tenant adoption,
not tenant-owned copies of imported rows:

- An ownerless carrier or pharmacy is a global canonical record maintained by
  an external directory sync or an application administrator.
- An organization preference links a canonical record and owns organization
  policy such as availability, preference, notes, sort order, fee schedule,
  and payer-specific operational configuration.
- A facility may inherit an organization preference or link a canonical record
  directly. Direct facility linking does not require prior organization
  adoption.
- Custom records are explicitly owned by one organization or one facility and
  are never offered to another tenant. Promoting one to the global directory is
  an application-administrator workflow, not an in-place tenant edit.
- Tenant APIs cannot edit canonical identity/contact fields. Directory updates
  may propagate to every link while tenant-owned preference fields remain
  unchanged.

The canonical row stores source/external sync metadata; organization and
facility link models store tenant policy. This prevents one tenant's edit from
silently changing another tenant's payer or pharmacy.

## Shared code

### `packages/api-types`

Generated from `drf-spectacular` (Django) → OpenAPI 3 schema →
`openapi-typescript` → `generated.ts`. `schema.yaml` and `generated.ts` are
committed so frontend consumers have a stable contract. Regenerate with
`npm run generate` from the repo root after backend API or serializer schema
changes. CI regenerates both files and fails when committed contracts drift.

### `packages/ui-icons`

`@careflow/ui-icons` — shared icon assets consumed by both the clinician and
patient frontends, keeping a single source of truth for iconography across
surfaces.

### `packages/ui-tokens`

`@careflow/ui-tokens` owns the shared light-theme `cf-*` semantic tokens and
the common dark palette used by the clinician workspace and landing. Each
consumer owns its theme selector and local extensions: clinician adds sidebar
tokens, while landing adds its marketing shell and ambient background values.
The patient portal deliberately keeps its separate palette and does not consume
this package.

### Why no other shared packages yet

`packages/api-client/` (lift the duplicated `client.ts`) is deliberately
deferred. Today both apps carry verbatim copies of `client.ts`
(~400 LOC each). The token systems are not yet shareable: the clinician app uses
`--color-cf-*` tokens while the patient portal runs its own unprefixed palette,
so the patient palette remains local. The clinician and landing now share their
verbatim `cf-*` light-theme contract through `packages/ui-tokens/`; the cost of
that narrow extraction is justified because the landing is a third surface that
already consumed a copy.

When to extract:

- The clinician and patient versions of `client.ts` have meaningfully diverged
  (different refresh logic, different base URL resolution) — at that point
  the shared interface starts to fork.
- Both apps need to consume the same hand-written cross-domain util
  (date formatter, validator) — extract that single util, don't pre-build
  a whole `packages/shared/`.

## Subdomain plan

Live (AWS Amplify frontends + Render API):

```text
careflow.xinyiklin.com    → apps/landing build (marketing front door)
clinician.xinyiklin.com   → apps/clinician build
patient.xinyiklin.com     → apps/patient build
api.careflow.xinyiklin.com → backend (Render)
```

The two portals are **siblings of the `careflow.` apex, not children of it**.
Only the landing page and the API sit under `careflow.xinyiklin.com`. Nothing in
the auth flow depends on the frontends sharing a domain with the API:

- **Refresh cookie** (`careflow_refresh`, `backend/users/views.py`) is set with
  no `Domain` attribute, so it is host-only to the API. `SameSite=None; Secure`
  means the browser still attaches it to cross-site XHR from either portal
  origin. It is also `Path`-scoped per surface — clinician to `/v1/users/`,
  portal to `/v1/portal/` — so the browser never sends one surface's refresh
  cookie to the other, keeping the two sessions disjoint. The portal keeps its
  separate portal-account role boundary under `/v1/portal/`.
- **CSRF cookie** is host-only: `CSRF_COOKIE_DOMAIN` defaults to `None`, so the
  cookie is scoped to the API host that sets it. The portals never read it from
  `document.cookie` — `/v1/users/csrf/` is `@ensure_csrf_cookie` and returns the
  token in its JSON body (`{"csrfToken": ...}`), and each `client.ts` takes it
  from there — so the double-submit check passes from any origin. It was
  previously a `.careflow.xinyiklin.com` wildcard, which granted breadth nothing
  used once the portals moved off that subtree. Env-overridable if a
  same-subtree surface ever needs a shared cookie domain.

**Origin allowlists:** `clinician.xinyiklin.com` and `patient.xinyiklin.com` are
in `CORS_ALLOWED_ORIGINS`, `CSRF_TRUSTED_ORIGINS`, and `ALLOWED_HOSTS` (all
env-overridable; defaults in `backend/config/settings.py`) so the Amplify portals
clear CORS, CSRF, and host checks against the Render API. The `careflow.` landing
page is static and makes no API calls; its origin is kept only as headroom. The
retired `portal.careflow.xinyiklin.com` Vercel origin has been removed.

> **Deploy note:** these settings are env-var-first. If the Render service defines
> `ALLOWED_HOSTS`, `CORS_ALLOWED_ORIGINS`, `CSRF_TRUSTED_ORIGINS`, or
> `CSRF_COOKIE_DOMAIN`, those values override the code defaults above — a domain
> change must be applied in the Render dashboard too, not just here.

## Per-app deployment

Each frontend is a separate Amplify app pointing at the same repo:

```text
apps/clinician  → clinician.xinyiklin.com
apps/patient    → patient.xinyiklin.com
apps/landing    → careflow.xinyiklin.com (front door)
```

For every app: root directory is the app dir, but the install step runs at
the **repo root** so npm workspaces resolves the `@careflow/*` symlinks before
the per-app build (a root `npm install` in the Amplify build spec). Without it
the build fails on the cross-package import. Build command `npm run build`,
output `dist`.

The two portals are client-routed SPAs and need a catch-all rewrite to
`/index.html` (an Amplify 200-rewrite rule). The
landing page is a single static page and needs no rewrite. Set
`VITE_API_URL=https://api.careflow.xinyiklin.com` on the clinician and patient
projects so API resolution is explicit rather than relying on the hostname
fallback in each `client.ts`.

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

For a form, list, and message-heavy portal, Capacitor is the natural landing
zone after PWA proves out. Don't pre-build the pipeline.

## When to add Turborepo

Today: two `npm run build`s in parallel finish in under a minute. Turborepo's
value (task graph caching, remote caching) doesn't pay back at this scale.

Triggers to add it:

- Total CI wall time consistently >5 min.
- A third app appears and CI starts duplicating work.
- Cross-app build dependencies (e.g., `apps/*` depend on a built artifact from
  `packages/*` that must compile first).

When you add it, point the Amplify build command at
`turbo build --filter=clinician` (and likewise for patient). The matrix CI
job in `.github/workflows/ci.yml` becomes a single `turbo run build lint
typecheck` invocation.

## Follow-ups (tracked here, not built)

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
