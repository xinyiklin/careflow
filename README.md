# CareFlow

CareFlow is a full-stack EHR-style clinic workflow demo for scheduling,
patient registration, facility administration, and document management.

The project is designed as a portfolio-grade healthcare operations app rather
than a basic CRUD sample. It focuses on facility-scoped workflows, configurable
clinical scheduling, secure-by-default data handling, and UI patterns that feel
closer to a real clinic workspace.

## Live Demo

https://careflow.xinyiklin.com

CareFlow uses synthetic demo data only. It is not production medical software,
not a real EHR, and has not been formally audited or certified for HIPAA
compliance.

## Highlights

- Appointment scheduling with facility-local time, configurable statuses,
  visit types, resources, rooms, blocks, and multi-column schedule views.
- Patient workflows with smart search, Quick Start registration, inline
  demographics editing, masked sensitive fields, emergency contacts, insurance,
  care-team details, and a modal-based Patient Hub.
- Document Center with patient-scoped uploads, preview/download actions,
  category management, local development storage, optional Cloudflare R2/S3
  storage, and combined PDF export for selected documents.
- Facility and organization administration for resources, staff, roles,
  permissions, appointment configuration, document categories, pharmacy
  preferences, and organization profile data.
- Authentication hardened around short-lived access tokens and HTTP-only
  refresh cookies, with facility-scoped API access and user preferences.
- Design-system-oriented React UI using shared tokens, reusable primitives, and
  modular feature boundaries for future growth.

## Tech Stack

| Layer | Technology |
| --- | --- |
| Frontend | React 19, Vite, React Router, React Query, Tailwind CSS v4 tokens, Material UI date pickers |
| Backend | Django, Django REST Framework, Simple JWT, Whitenoise |
| Database | PostgreSQL |
| Documents | Local filesystem for development; Cloudflare R2/S3-compatible storage optional |
| Deployment | Vercel frontend, Render backend |

## Project Structure

```text
backend/
  appointments/     Scheduling and appointment activity APIs
  audit/            Audit-style event records
  facilities/       Facilities, staff, resources, roles, and configuration
  insurance/        Insurance carriers and patient policies
  organizations/    Organization profile and membership APIs
  patients/         Patients, search, demographics, documents, pharmacies
  shared/           Cross-domain models, serializers, and seed utilities
  users/            Auth, memberships, and user preferences

frontend/src/
  app/              App shell, routing, providers, and error boundary
  features/         Admin, auth, appointments, documents, patients, schedule
  shared/           API client, UI primitives, constants, hooks, tokens
```

## Local Setup

### Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

Create `backend/.env` for local settings as needed:

```bash
DEBUG=True
SECRET_KEY=careflow-dev-secret-key-change-me
DB_NAME=careflow
DB_USER=careflow_user
DB_PASSWORD=password
DB_HOST=localhost
DB_PORT=5433
DEMO_MODE=True
DEMO_USERNAME=demo_admin
```

Run migrations, seed synthetic demo data, and start the API:

```bash
python manage.py migrate
python manage.py seed_demo
python manage.py seed_patient_documents
python manage.py runserver
```

The backend serves versioned APIs under `/v1/`.

### Frontend

```bash
cd frontend
npm install
```

Create `frontend/.env.local` if the API is not using the default local URL:

```bash
VITE_API_URL=http://localhost:8000
VITE_APP_URL=http://localhost:5173
VITE_DEMO_MODE=true
```

Start the Vite dev server:

```bash
npm run dev
```

## Demo Credentials

After running `python manage.py seed_demo`:

```text
Username: demo_admin
Password: Admin123!
```

Additional seeded users include demo physician, nursing, staff, and facility
admin accounts for role-based workflow testing.

## Verification

Backend:

```bash
cd backend
./venv/bin/python manage.py check
./venv/bin/python manage.py test
```

Frontend:

```bash
cd frontend
npx eslint src
npm run build
```

For major UI changes, run the app locally and visually inspect the changed flow
in Chrome.

## Document Storage

Local development stores uploaded/generated document files under
`backend/local_documents/`, which is intentionally gitignored. Database rows
store metadata and storage keys, not file bytes.

For object storage, configure the R2/S3-compatible backend with:

```bash
PATIENT_DOCUMENT_STORAGE_BACKEND=r2
CLOUDFLARE_R2_ACCOUNT_ID=...
CLOUDFLARE_R2_ACCESS_KEY_ID=...
CLOUDFLARE_R2_SECRET_ACCESS_KEY=...
CLOUDFLARE_R2_BUCKET=...
CLOUDFLARE_R2_ENDPOINT_URL=...
```

## Development Notes

- Keep patient data synthetic. Do not use real PHI in local, demo, or portfolio
  environments.
- Treat sensitive fields as masked by default. Full SSN display should be
  intentional and user-triggered.
- Keep APIs facility-scoped and permission-aware.
- Keep UI compact, calm, and workflow-oriented rather than schema-oriented.
- Prefer modular feature files and reusable shared UI primitives as workflows
  grow.

## License

This project is not open source. The source code is provided for portfolio
review and demonstration only. See [LICENSE](./LICENSE) for the full
all-rights-reserved notice.
