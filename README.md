# 🏥 Full-Stack Clinic Scheduler

[![Live Demo](https://img.shields.io/badge/Live-Demo-green)](https://clinic-scheduler-xinyiklins-projects.vercel.app/)

A multi-tenant appointment scheduling system built with React and Django, designed for healthcare environments with role-based access and real-time scheduling workflows.

---

## 🚀 Features

### 🔐 Authentication
- JWT-based authentication (access + refresh tokens)
- Secure login/logout flow
- Automatic token refresh on expiration
- Protected API routes

### 🏥 Multi-Tenant Architecture
- Facility-based data isolation
- Users scoped to a single facility
- Facility-specific:
  - Appointment statuses
  - Appointment types
  - Staff roles & titles

### 📅 Scheduler
- Interactive day-view scheduler
- Drag-and-drop rescheduling
- Double-click to create appointment
- Real-time frontend/backend sync
- Color-coded appointment statuses and visit types

### 👨‍⚕️ Staff & Patients
- Role-based access (Admin, Physician, Staff)
- Physician list integration for scheduling
- Patient management with uniqueness constraints per facility

---

## 🛠 Tech Stack

### Frontend
- React (Vite)
- Tailwind CSS
- Custom Fetch API client (centralized)

### Backend
- Django
- Django REST Framework
- SimpleJWT (authentication)

### Database
- PostgreSQL

---

## ⚙️ Architecture Highlights

- Modular Django apps:
  - `accounts` (authentication)
  - `facilities` (multi-tenant core)
  - `patients`
  - `scheduler`
- Centralized API client (`client.js`)
- Automatic token refresh + retry mechanism
- Clean separation of UI, API layer, and business logic

---

## ⚙️ Setup Instructions

### 1. Clone the repository

```bash
git clone https://github.com/xinyiklin/clinic-scheduler.git
cd clinic-scheduler
```

---

### 2. Backend Setup

```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

---

### 3. Configure PostgreSQL

Update `settings.py`:

```python
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.postgresql',
        'NAME': 'clinic_scheduler',
        'USER': 'clinic_user',
        'PASSWORD': 'password',
        'HOST': 'localhost',
        'PORT': '5433',
    }
}
```

---

### 4. Run migrations

```bash
python manage.py migrate
```

---

### 5. Seed demo data

```bash
python manage.py seed_demo
```

---

### 6. Start backend

```bash
python manage.py runserver localhost:8000
```

---

### 7. Frontend Setup

```bash
cd ../frontend
npm install
npm run dev
```

Frontend runs on:

```
http://localhost:5173
```

---

## 🔐 Demo Accounts

### Admin
- Username: admin
- Password: Admin123!

### Physician
- Username: dr_smith
- Password: Doctor123!

---

## 🔄 API Overview

| Endpoint | Description |
|--------|------------|
| `/api/accounts/token/` | Login (JWT) |
| `/api/accounts/token/refresh/` | Refresh token |
| `/api/facilities/me/` | Current user + facility |
| `/api/scheduler/appointments/` | Appointment CRUD |

---

## 📌 Notes

- Appointment statuses, types, roles, and titles are auto-generated per facility
- Data is fully isolated per facility (multi-tenant design)
- Token refresh is handled automatically on the frontend
- Ensure PostgreSQL is running on port 5433 (or update settings accordingly)

---

## 🌐 Future Improvements

- Material UI DatePicker integration
- Weekly/monthly calendar views
- Patient search/autocomplete
- Notifications and reminders
- Multi-facility switching
- Deployment (Render + Vercel)

---

## 📬 Contact

- Email: kevinlin11426@gmail.com
- LinkedIn: https://www.linkedin.com/in/xinyiklin/
- Portfolio: https://xinyiklin.github.io/