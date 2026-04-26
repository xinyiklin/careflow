# Backend README

## Overview

This is the Django backend for CareFlow. It provides authentication, facility-scoped scheduling APIs, patient registration, document workflows, insurance, pharmacy, audit, and admin configuration APIs.

## Tech Stack

- Django
- Django REST Framework
- PostgreSQL
- Simple JWT

## Apps

- `users` - custom user model, authentication, memberships, and preferences
- `facilities` - facility, staff, resources, appointment status/type, and security configuration
- `appointments` - appointment scheduling and activity behavior
- `patients` - patient records, registration, search, documents, and pharmacies
- `insurance` - carriers and patient insurance policies
- `organizations` - organization profile, memberships, and pharmacy preferences
- `audit` - audit-style event records

## Core Features

- JWT-based authentication
- Facility-scoped access control
- Appointment CRUD endpoints
- Patient CRUD and search
- Patient document upload, preview, download, categories, and bundled PDF export
- Configurable appointment statuses, types, resources, operating hours, patient genders, and document categories
- Django admin for operational configuration
- Demo data seeding

## Local Setup

### Create and activate virtual environment

```bash
python -m venv venv
source venv/bin/activate
```

### Install dependencies

```bash
pip install -r requirements.txt
```

### Database configuration

Example local database settings:

```python
DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.postgresql",
        "NAME": "careflow",
        "USER": "careflow_user",
        "PASSWORD": "password",
        "HOST": "localhost",
        "PORT": "5433",
    }
}
```

### Run migrations

```bash
python manage.py migrate
```

### Seed demo data

```bash
python manage.py seed_demo
python manage.py seed_patient_documents
```

### Start server

```bash
python manage.py runserver
```

## Useful Commands

### Make migrations

```bash
python manage.py makemigrations
```

### Open Django shell

```bash
python manage.py shell
```

### Open database shell

```bash
python manage.py dbshell
```

### Check migration state

```bash
python manage.py showmigrations
```

## Notes

- If models change, make sure migrations are created and applied in both local and deployed environments.
- Production admin errors often come from migration mismatches between code and database schema.
- `seed_demo` populates the CareFlow demo organization, Clinic A/B/C, users, staff, resources, patients, phones, emergency contacts, insurance, pharmacies, local previewable documents, and appointments.
- `seed_patient_documents` refreshes or adds local previewable PDF documents for document workflow testing without reseeding the whole demo database.
- Development document files are stored under `backend/local_documents/`; database rows store metadata and a storage key, not the file bytes.
