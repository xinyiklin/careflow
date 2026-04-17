# CareFlow

A full-stack clinic scheduling system that simulates real-world healthcare workflows, including patient management, appointment scheduling, and facility-level configuration.

Designed and implemented with a focus on usability, scalability, and clean data modeling — going beyond basic CRUD with role-based access, dynamic configuration, and real-time UI interactions.

---

## Live Demo

https://careflow.xinyiklin.com

---

## Key Highlights

**Real-time Patient Search**

- Debounced search with filtering by name, DOB, and MRN
- Reduced unnecessary API calls and improved responsiveness

**Appointment Scheduling**

- Day-based calendar view with drag-and-drop rescheduling
- Full create/edit/delete workflow with validation

**Patient Management**

- Unified create/edit modal
- MRN system-controlled and immutable
- Integrated seamlessly with appointment flow
- Recent patients persistence via localStorage

**Facility-Based Configuration**

- Per-facility configuration for statuses, visit types, roles, and genders
- Timezone support — all times displayed in clinic's local timezone regardless of user location
- Eliminated hardcoded enums for scalability

**Authentication & Access Control**

- JWT-based authentication
- Facility-scoped data access

---

## Tech Stack

| Layer      | Technology                          |
| ---------- | ----------------------------------- |
| Frontend   | React, Tailwind CSS, Material UI    |
| Backend    | Django, Django REST Framework       |
| Database   | PostgreSQL                          |
| Deployment | Vercel (frontend), Render (backend) |

---

## Local Setup

```bash
git clone https://github.com/xinyiklin/careflow.git
cd careflow/backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

Configure your database in `config/settings.py`:

```python
DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.postgresql",
        "NAME": "careflow",
        "USER": "your_user",
        "PASSWORD": "your_password",
        "HOST": "localhost",
        "PORT": "5432",
    }
}
```

Run migrations and seed demo data:

```bash
python manage.py migrate
python manage.py seed_demo --reset-appointments
python manage.py runserver
```

---

## Demo Credentials

Username: admin  
Password: Admin123!

---

## 🧠 What I Learned

- Designing scalable relational data models
- Managing schema migrations and breaking changes
- Building intuitive UI tied to backend constraints
- Implementing authentication and multi-tenant logic
- Debugging database and deployment issues
