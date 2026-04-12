# Frontend README

## Overview

This is the React frontend for Clinic Scheduler. It provides the scheduling UI, patient search and patient detail flows, appointment create/edit forms, and facility-scoped configuration driven by the backend API.

## Tech Stack

- React
- Vite
- Tailwind CSS
- Material UI
- React Query

## Key Features

- Day-view scheduler
- Drag-and-drop appointment rescheduling
- Appointment create/edit modal
- Patient search with debounced filtering
- Patient create/edit modal
- React Query for server-state fetching and cache invalidation
- Feature-based folder structure

## Project Structure

```text
src/
  app/
    App.jsx
    providers.jsx
  features/
    appointments/
    auth/
    facility/
    patients/
  shared/
    api/
    components/
    utils/
```

## Development Setup

### Install dependencies

```bash
npm install
```

### Start development server

```bash
npm run dev
```

### Build for production

```bash
npm run build
```

### Preview production build

```bash
npm run preview
```

## Expected Backend

The frontend expects the Django backend API to be running and reachable by the configured API client.

Common endpoints used by the frontend include:

- `/api/accounts/token/`
- `/api/accounts/token/refresh/`
- `/api/facilities/me/`
- `/api/facilities/physicians/`
- `/api/facilities/appointment-statuses/`
- `/api/facilities/appointment-types/`
- `/api/facilities/patient-genders/`
- `/api/scheduler/appointments/`
- `/api/patients/`

## Notes

- React Query is used for server state, cache invalidation, and query lifecycle handling.
- Modal layouts are designed to stay within the available window height and scroll internally on smaller screens.
- Authentication tokens are stored in local storage in the current implementation.
