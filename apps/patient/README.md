# CareFlow Patient Portal

Patient-facing React frontend. Read-only views of profile, appointments,
medications, and allergies. Authenticates against the same Django backend as
the clinician app but through `/v1/portal/` endpoints gated by
`IsPortalPatient` permission.

## Local Setup

From the repo root:

```bash
npm install
npm run dev:patient
```

Or `npm run dev` from this directory.

Dev server runs on `http://localhost:5174` with `strictPort`. Backend default
remains `http://localhost:8000`. To override, create `apps/patient/.env.local`:

```bash
VITE_API_URL=http://localhost:8000
VITE_APP_URL=http://localhost:5174
```

## Demo Credentials

After `python manage.py seed_demo` from `backend/`:

```text
Username: patient_demo
Password: Patient123!
```
