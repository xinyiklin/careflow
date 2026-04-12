# Backend README

## Overview

This is the Django backend for Clinic Scheduler. It provides authentication, facility-scoped scheduling APIs, patient APIs, and admin tools for configuration data.

## Tech Stack

- Django
- Django REST Framework
- PostgreSQL
- Simple JWT

## Apps

- `accounts` - custom user model and authentication endpoints
- `facilities` - facility, staff, appointment status/type, patient gender configuration
- `patients` - patient records
- `scheduler` - appointment scheduling and related APIs

## Core Features

- JWT-based authentication
- Facility-scoped access control
- Appointment CRUD endpoints
- Patient CRUD and search
- Configurable appointment statuses, appointment types, and patient genders
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
        "NAME": "clinic_scheduler",
        "USER": "clinic_user",
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
python manage.py seed_demo --reset-appointments
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
- `seed_demo` populates a demo clinic, demo users, patients, and appointments for local testing.
