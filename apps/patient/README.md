# CareFlow Patient Portal

Patient-facing React + TypeScript frontend. A self-service workspace where
patients view their care and act on it: book and cancel appointments, request
medication refills, update their preferred pharmacy, review a medical summary,
and exchange secure messages with their care team. Authenticates against the
same Django backend as the clinician app, but through `/v1/portal/` endpoints
gated by the `IsPortalPatient` permission and a `PatientPortalAccount` join
model.

The portal runs as a separate app with a cookie-isolated session, so a patient
session and a clinician session can coexist without colliding on a shared
parent domain.

## Tech Stack

- React 19
- TypeScript
- Vite
- React Router
- TanStack React Query
- Tailwind CSS v4 tokens
- i18next / react-i18next for localization
- lucide-react icons

## Product Areas

- Dashboard with a welcome strip, next-appointment hero, and medications and
  messages summary cards.
- Profile view of demographics and contact details.
- Appointments: upcoming/past list, online self-scheduling (visit type →
  provider → slot → confirm), and cancellation.
- Medications with patient-initiated refill requests (create and cancel) and
  preferred-pharmacy updates.
- Allergies list.
- Medical summary aggregating clinical context, including vitals.
- Secure messaging with threaded conversations and replies to the care team.
- Light/dark theme toggle.
- Multi-language UI: English, Spanish, and Chinese (Simplified and Traditional).

## Local Setup

From the repo root:

```bash
npm install
npm run dev:patient
```

Or `npm run dev` from this directory. Installing at the repo root is preferred —
the repo is an npm workspaces monorepo, so shared deps and the
`@careflow/api-types` and `@careflow/ui-icons` packages hoist correctly.

Dev server runs on `http://localhost:5174` with `strictPort`. Backend default
remains `http://localhost:8000`, with requests versioned under `/v1`. To
override, create `apps/patient/.env.local`:

```bash
VITE_API_URL=http://localhost:8000
```

## Scripts

```bash
npm run dev
npm run build
npm run preview
npm run lint
npm run lint:fix
npm run typecheck
npm run format
npm run format:check
```

`npm run build` runs `typecheck` before `vite build`. From the repo root, the
same checks are available as `npm run lint:patient`, `npm run typecheck:patient`,
and `npm run build:patient`.

## Project Structure

```text
src/
  app/              App shell, routing, and providers
  features/
    dashboard/      Landing dashboard with summary cards
    profile/        Patient profile view
    appointments/   Appointment list and cancellation
    schedule/       Online self-scheduling flow (multi-step booking)
    medications/    Medications list and refill requests
    allergies/      Allergies list
    medical-summary/ Medical summary including vitals
    messages/       Secure messaging threads and replies
    auth/           Login and portal auth flow
  i18n/             i18next setup and locale resources (en, es, zh-CN, zh-TW)
  shared/           API client, UI primitives, theme, hooks, and config
```

## API And Auth

- Calls the Django backend through `src/shared/api/client.ts`, versioned
  under `/v1`.
- All portal traffic uses the dedicated `/v1/portal/` namespace, gated by the
  `IsPortalPatient` permission.
- Access tokens are kept in memory; the refresh token lives in an HTTP-only
  cookie scoped to the portal session.
- Requests use `credentials: "include"` so refresh-cookie auth works across the
  deployed frontend/backend domains.

## Demo Credentials

After `python manage.py seed_demo` from `backend/`:

```text
Username: patient_demo
Password: Patient123!
```

This account is linked to a seeded patient via `PatientPortalAccount` and is
populated with appointments, medications, allergies, vitals, and a sample
message thread for exercising the full portal flow.

## Deployment

The production portal is deployed on AWS Amplify at
`patient.xinyiklin.com`. Typical Amplify settings:

```text
AMPLIFY_MONOREPO_APP_ROOT: apps/patient
Build Command: npm run build
Output Directory: dist
```

The install step runs at the repo root so npm workspaces resolve the shared
`@careflow/*` symlinks before the build runs from `apps/patient`. Set the
deployed backend base URL:

```bash
VITE_API_URL=https://api.careflow.xinyiklin.com
```

The backend must allow the portal origin in its CORS and CSRF settings. A
catch-all rewrite rule (Amplify 200-rewrite to `/index.html`) is needed for
client-side routing.

## Safety

CareFlow uses synthetic demo data only. Do not enter real patient data, PHI,
tokens, or secrets into local or demo environments.
