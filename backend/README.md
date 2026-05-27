# CareFlow Backend

Django REST backend for CareFlow, an EHR-style clinic workflow demo covering
scheduling, patient registration, clinical charting, medications, allergies,
documents, insurance, billing, facility administration, organization
administration, permissions, and audit-style activity records.

The backend is built around facility-scoped access control. APIs should preserve
facility boundaries, role checks, and masked/safe handling of sensitive patient
fields.

## Tech Stack

- Django
- Django REST Framework
- Simple JWT
- PostgreSQL
- Whitenoise
- Cloudflare R2/S3-compatible document storage via `boto3` when enabled

## Apps

- `allergies` - patient allergy and adverse reaction records.
- `appointments` - scheduling, appointment mutations, edit sessions, status/type
  activity, and appointment history.
- `audit` - audit-style event records and helpers.
- `billing` - encounter-linked superbills, fee schedules, and CPT catalog.
- `clinical` - encounters and progress note charting.
- `facilities` - facilities, staff, resources, roles, security permissions,
  appointment config, operating hours, and seeded defaults.
- `insurance` - insurance carriers and patient insurance policies.
- `medications` - patient medication records.
- `organizations` - organization profile, memberships, facilities,
  organization-level preferences, and pharmacy/payer administration.
- `patients` - demographics, search, phones, emergency contacts, care team,
  pharmacies, document metadata, document previews/downloads, and categories.
- `shared` - cross-domain models, serializers, and management commands.
- `users` - custom user model, auth endpoints, memberships, and user
  preferences.

APIs are versioned under `/v1/`.

## Core Features

- JWT auth with short-lived access tokens and HTTP-only refresh cookie support.
- Facility-scoped scheduling APIs for day, multi-day, agenda, and resource
  workflows.
- Appointment CRUD with status/type/resource/provider behavior and activity
  history.
- Patient registration, search, inline demographics editing, masked SSN flow,
  phone validation, emergency contacts, insurance, care team, and pharmacy data.
- Clinical encounters and SOAP progress notes with draft, signed, and unsigned
  workflows.
- Patient medications and allergies with active/historical state and audit
  history.
- Patient document upload, preview, download, category management, and bundled
  PDF export.
- Encounter-linked billing records, organization/facility fee schedules,
  overrides, and CPT catalog population.
- Local filesystem document storage for development and optional Cloudflare R2
  storage for deployed demos.
- Organization/facility admin APIs for staff, roles, permissions, resources,
  operating hours, appointment config, fee schedules, payer/pharmacy
  preferences, document categories, and read-only activity logs.
- Synthetic demo seeding for Clinic A, Clinic B, Clinic C, users, patients,
  appointments, clinical records, medications, allergies, billing workflows,
  admin config, and sample documents.

## Local Setup

```bash
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

Create `backend/.env` as needed:

```bash
DEBUG=True
SECRET_KEY=careflow-dev-secret-key-change-me
DB_NAME=careflow
DB_USER=careflow_user
DB_PASSWORD=password
DB_HOST=localhost
DB_PORT=5433
DEMO_MODE=True
DEMO_USERNAME=demo
```

Run migrations and seed synthetic demo data:

```bash
python manage.py migrate
python manage.py seed_demo
```

`seed_demo` already creates demo users, Clinic A/B/C, facility configuration,
patients, appointments, insurance, pharmacies, document categories, clinical
records, medications, allergies, billing records, fee schedules, CPT catalog
items, and sample documents. Use the document-only command when you want to
refresh/add sample documents without reseeding the whole database:

```bash
python manage.py seed_patient_documents
```

Start the local API:

```bash
python manage.py runserver
```

## Demo Login

After `seed_demo`:

```text
Username: demo
Password: Admin123!
```

Additional seeded users include physician, nursing, staff, and facility-admin
accounts for role-based workflow testing.

## Verification

```bash
python manage.py check
python manage.py makemigrations --check --dry-run
python manage.py test
```

For backend lint/format checks when touching Python source:

```bash
python -m ruff check .
python -m black --check .
```

## Document Storage

Document bytes should not be stored in database rows. Patient document rows
store metadata plus a storage key.

Local development defaults to:

```text
backend/local_documents/
```

That directory is gitignored. For Cloudflare R2/S3-compatible storage, set:

```bash
PATIENT_DOCUMENT_STORAGE_BACKEND=r2
CLOUDFLARE_R2_ACCOUNT_ID=...
CLOUDFLARE_R2_ACCESS_KEY_ID=...
CLOUDFLARE_R2_SECRET_ACCESS_KEY=...
CLOUDFLARE_R2_BUCKET=...
CLOUDFLARE_R2_ENDPOINT_URL=...
CLOUDFLARE_R2_REGION=auto
```

Keep supported upload types conservative: PDF, TIFF, PNG, and JPEG.

## Deployment

The backend is intended for Render.

If the Render service root is `backend`:

```bash
# Build Command
pip install -r requirements.txt && python manage.py collectstatic --noinput && python manage.py migrate

# Start Command
gunicorn config.wsgi:application
```

If the Render service root is the repository root, prefix backend commands:

```bash
cd backend && pip install -r requirements.txt && python manage.py collectstatic --noinput && python manage.py migrate
cd backend && gunicorn config.wsgi:application
```

For a one-time destructive demo reset when Render Shell is unavailable, use a
temporary build command for one deploy only:

```bash
pip install -r requirements.txt && python manage.py collectstatic --noinput && python manage.py migrate && python manage.py flush --noinput && python manage.py seed_demo
```

After that deploy succeeds, immediately restore the normal build command. Do
not leave `flush` or seed commands in a recurring build command.

## Environment Notes

Common deployed settings:

```bash
DEBUG=False
SECRET_KEY=...
DATABASE_URL=...
ALLOWED_HOSTS=api.careflow.xinyiklin.com,.onrender.com
CORS_ALLOWED_ORIGINS=https://careflow.xinyiklin.com
CSRF_TRUSTED_ORIGINS=https://careflow.xinyiklin.com,https://api.careflow.xinyiklin.com
DEMO_MODE=True
DEMO_USERNAME=demo
PATIENT_DOCUMENT_STORAGE_BACKEND=r2
```

Do not commit real secret values. When `DEBUG=False`, `SECRET_KEY` must be at
least 32 bytes so JWT signing uses a strong HMAC key.

## Useful Commands

```bash
python manage.py showmigrations
python manage.py dbshell
python manage.py shell
python manage.py seed_demo
python manage.py seed_patient_documents --patients-per-facility 3
python manage.py seed_patient_documents --refresh-existing
```

## Safety

CareFlow is a synthetic demo and portfolio project. Do not use real patient
data or claim HIPAA compliance. Phrase compliance-related behavior as supporting
a compliance-minded workflow unless the system has been formally audited.
