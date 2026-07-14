# @careflow/landing

The public marketing page and front door for CareFlow. A single static page
(no client routing) that introduces the project and links out to the two
authenticated portals.

Serves the apex domain (`careflow.xinyiklin.com`) on AWS Amplify. The two
authenticated portals sit on sibling subdomains of `xinyiklin.com`
(`clinician.` and `patient.`), not under `careflow.`.

## Local

```bash
npm run dev:landing          # from the repo root
# or
npm -w @careflow/landing run dev
```

Runs on `http://localhost:5175` (`strictPort`; CareFlow owns 5173-5180, with the
clinician app on 5173 and the patient app on 5174).

## Commands

```bash
npm -w @careflow/landing run lint | typecheck | build
```

## Environment

All optional; sensible defaults ship in `src/content.ts`.

| Variable | Default | Purpose |
| --- | --- | --- |
| `VITE_CLINICIAN_URL` | `https://clinician.xinyiklin.com` | Clinician portal target |
| `VITE_PATIENT_URL` | `https://patient.xinyiklin.com` | Patient portal target |
| `VITE_GITHUB_URL` | _(unset)_ | Adds a "Source" link in the footer when set |

## Screenshots

The hero and portal cards render real product screenshots from
`public/shots/` (`clinician-schedule.png`, `patient-portal.png`). Until those
files exist the frame shows an honest labeled placeholder, not a mock UI. Drop
in real captures to complete the page.

## Deploy (AWS Amplify)

Separate Amplify app pointing at this workspace:

- Build root: `apps/landing`
- Install at the repo root so npm workspaces resolves `@careflow/ui-icons`
  before the build (`npm install` from the monorepo root).
- Build command: `npm run build` (emits `dist/`).
- No SPA rewrite needed: this is a single static page.
