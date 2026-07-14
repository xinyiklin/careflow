# CareFlow Clinician App

React frontend for CareFlow clinicians and admin staff, an EHR-style clinic
workflow demo covering
scheduling, patient registration, clinical charting, vitals, medications,
allergies, refill management, secure patient messaging, documents, billing,
facility administration, and organization administration.

The app is built to feel like a compact clinical workspace: facility-scoped,
permission-aware, keyboard-friendly where practical, and organized around
front-desk and clinical workflows rather than raw database tables.

## Tech Stack

- React 19
- TypeScript
- Vite
- React Router
- TanStack React Query
- Tailwind CSS v4 tokens
- Material UI date pickers
- React PDF/PDF.js for in-app document previews

## Product Areas

- Schedule workspace with agenda, day, multi-day, and resource-oriented views.
- Appointment creation/editing with patient search, drag/drop, context actions,
  activity log, configurable status/type colors, rooms, and resources.
- Patient workflows with Quick Start registration, smart search, inline Patient
  Hub registration editing, phone/SSN formatting, insurance, pharmacy, care
  team, emergency contacts, and a unified Timeline.
- Clinical charting with encounters, SOAP progress notes, and a vitals intake
  modal, including draft, signed, and unsigned states.
- Medications and allergies tracked in Patient Hub with active/historical state.
- Refill request inbox plus a per-patient refills tab for reviewing and
  resolving patient-initiated medication refill requests.
- Secure messaging Inbox with threaded clinician–patient conversations, unread
  badges, and reply/resolve actions.
- Document Center with patient-scoped document lists, uploads, in-app PDF
  preview, download, category management, and bundled PDF export.
- Billing workspace with encounter-linked records and fee-schedule handoff.
- Admin areas for organization profile, facilities, staff, roles/permissions,
  resources, appointment statuses/types, operating hours, document categories,
  fee schedules, payer/pharmacy preferences, and activity logs.
- User preferences for theme, schedule behavior, sidebar startup state,
  appointment block display, and persisted recent patients.

## Project Structure

```text
src/
  app/              App shell, route modules, providers, and error boundary
  features/
    admin/          Organization/facility admin surfaces
    appointments/   Appointment API, modals, blocks, history, mutations
    auth/           Login, auth provider, current-user flow
    billing/        Billing workspace and encounter billing records
    documents/      Document Center and shared patient document workspace
    facilities/     Active facility context and facility config hooks
    medications/    Refill inbox, refill request actions, and hooks
    messaging/      Secure messaging Inbox, threads, and reply composer
    patients/       Patient search, Patient Hub, clinical, insurance
    schedule/       Schedule page, grid/agenda/resource views, utilities
  shared/
    api/            Versioned API client and auth refresh behavior
    components/     Navbar, sidebar, shared modals, UI primitives
    constants/      Navigation, layout, appointment display options
    context/        Theme and user preference providers
    hooks/          Shared hooks
    utils/          Cross-feature helpers
```

## Local Setup

From the repo root:

```bash
npm install
npm run dev:clinician
```

Or from this directory: `npm install` then `npm run dev`. Either works — the
repo is an npm workspaces monorepo, so installing at the root hoists shared
deps.

The Vite dev server is fixed to `http://localhost:5173` with `strictPort`.
For local QA, use that port instead of falling back to a different one. If
`5173` is already occupied, confirm whether the CareFlow clinician app is
running there and use it if so; otherwise stop the stale process and rerun
`npm run dev`.

The default local API base is `http://localhost:8000`; requests are versioned
under `/v1`. If the backend is elsewhere, create `apps/clinician/.env.local`:

```bash
VITE_API_URL=http://localhost:8000
VITE_DEMO_MODE=true
```

`VITE_API_URL` may include or omit `/v1`; the API client normalizes it.

## Scripts

```bash
npm run dev
npm run build
npm run preview
npm run lint
npm run lint:fix
npm run format:check
npm run format
```

For touched frontend source, prefer targeted lint while iterating. Before a
deploy or larger UI change, run:

```bash
npm run build
```

## API And Auth

- The frontend calls the Django backend through `src/shared/api/client.ts`.
- API routes are automatically prefixed with `/v1`.
- Access tokens are kept in memory only.
- Refresh tokens are expected to live in an HTTP-only cookie set by the backend.
- Requests use `credentials: "include"` so refresh-cookie auth works across the
  deployed frontend/backend domains.
- Legacy local-storage auth tokens are cleared by the client.

Current auth endpoints include:

```text
/v1/users/token/
/v1/users/csrf/
/v1/users/demo-login/
/v1/users/token/refresh/
/v1/users/logout/
/v1/users/me/
/v1/users/me/preferences/
```

## UI Notes

- Prefer shared primitives from `src/shared/components/ui/`.
- Use root `PRODUCT.md` for product register and `DESIGN.md` for token/component
  vocabulary before larger UI changes.
- Prefer existing CareFlow tokens/classes from `src/index.css` over one-off
  colors.
- Keep clinical screens compact and calm; avoid extra subtitles, wrappers, and
  hidden overflow unless the component intentionally owns scrolling.
- For major UI work, inspect the changed flow in Chrome before finalizing.
- Dev-only visual experiments belong in `apps/clinician/dev-previews/`, which
  is gitignored.

## Deployment

The production frontend is deployed on AWS Amplify at
`clinician.xinyiklin.com`. Typical Amplify settings:

```text
AMPLIFY_MONOREPO_APP_ROOT: apps/clinician
Build Command: npm run build
Output Directory: dist
```

The install step runs at the repo root so npm workspaces resolve the
`@careflow/*` symlinks before the build runs from `apps/clinician`.

Set `VITE_API_URL` to the deployed backend base URL:

```bash
VITE_API_URL=https://api.careflow.xinyiklin.com
VITE_DEMO_MODE=true
```

The backend must allow the frontend origin in CORS and CSRF settings.

A catch-all rewrite rule (Amplify 200-rewrite to `/index.html`) is needed so
direct visits or browser refreshes on routes such as `/schedule`, `/documents`,
or `/admin/facility` serve `index.html` and let React Router handle the route.

## Safety

CareFlow uses synthetic demo data only. Do not enter real patient data, PHI,
tokens, or secrets into local or demo environments.
