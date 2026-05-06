# Backend Guidelines

CareFlow's backend is a Django + Django REST Framework API for a
healthcare-oriented demo app. It must preserve facility boundaries, permission
checks, safe patient-data handling, and versioned `/v1/` API behavior.

## App Boundaries

Use the current backend layout:

- `appointments/`: scheduling, appointment behavior, edit sessions, activity.
- `facilities/`: facilities, staff, resources, roles, permissions, operating
  hours, and appointment configuration.
- `organizations/`: organization profile, memberships, facilities, and
  organization-level preferences.
- `patients/`: demographics, search, Patient Hub data, phones, emergency
  contacts, care team, pharmacies, and documents.
- `insurance/`: insurance carriers and patient policies.
- `users/`: auth, memberships, current-user behavior, and preferences.
- `audit/`: audit-style event records.
- `shared/`: cross-domain models, serializers, and management utilities.

When a workflow grows, split it into serializers, viewsets, services, storage
helpers, or utilities instead of packing business logic into one large view.

## API Design

- Keep APIs explicit, facility-scoped, role-aware, and versioned under `/v1/`.
- Prefer explicit serializers/viewsets over hidden side effects or overly
  generic endpoints.
- Derive facility, user, and role context from the authenticated request.
- Never trust client-supplied `facility_id`, `user_id`, membership, or role
  fields.
- Reject unknown or unsupported fields rather than silently dropping them when
  accepting structured input.
- Return stable response shapes for frontend workflows; avoid surprise
  shape-shifting based on role unless the contract calls for it.
- Keep list endpoints predictable with explicit filtering, ordering, and
  pagination decisions when result sets can grow.
- Use `select_related` and `prefetch_related` deliberately for list/detail
  endpoints with known relational access.

## Validation

- Validate request data at the serializer layer when possible.
- Keep cross-field validation close to the serializer or a small service helper.
- Do not add default fallbacks during development just to hide missing required
  values.
- Let missing required configuration fail loudly enough to fix the real cause.
- Mask sensitive patient fields by default when appropriate. Full SSN display
  must be intentional and user-triggered.

## Permissions And Facility Scope

- Preserve auth, facility scoping, and permission checks whenever adding or
  changing endpoints.
- Facility-scoped data must be filtered by the active/request facility.
- Cross-facility access should return 403 for authenticated users lacking access.
- Unauthenticated access to protected endpoints should return 401.
- Do not loosen permission classes to make tests or UI wiring easier.
- If a workflow spans organization and facility data, make the boundary explicit
  in the serializer and viewset.

## Error Handling

- Do not leave empty `catch`/`except` blocks or silently swallow errors.
- Return user-safe validation errors for expected client mistakes.
- Let unexpected server failures surface as server errors after logging enough
  context to debug them safely.
- Avoid leaking secrets, tokens, PHI, raw documents, SSNs, DOBs, or full patient
  records into error messages.
- Do not expose raw exception messages, stack traces, SQL/database errors, or
  endpoint/internal path details in user-facing responses.
- Keep frontend-facing error messages stable enough for UI handling.
- Shape recoverable errors so the frontend can render inline validation,
  localized workflow errors, or compact retry affordances instead of global
  banners or toast spam.

## Logging

- Log auth failures, permission denials, and 5xx errors with safe request
  context such as `user_id`, `facility_id`, endpoint, and request id if
  available.
- Never log passwords, tokens, SSNs, DOBs, uploaded document bytes, or full
  patient records.
- Prefer structured logging or structured context fields.
- Do not interpolate PHI into log messages.

## Audit Trail

Mutations to patient-adjacent models should be auditable. If a touched model
lacks audit hooks, flag it in `CONTINUITY.md` instead of adding ad-hoc logging.

Audit-style records should answer:

- who changed the data
- which facility and patient-adjacent record was affected
- what kind of mutation occurred
- when it happened
- where the request came from when safe to capture

## Migrations

- Add migrations when models change.
- Do not edit existing migrations unless the user explicitly asks and the
  migration has not been shared.
- Verify migration state with `makemigrations --check --dry-run` when schema
  changes are expected to be complete.
- Verify migrated behavior with targeted tests or `manage.py check`.
- Never run destructive database reset/flush commands without explicit user
  instruction.

## Document Workflow

- Local development document files live under `backend/local_documents/`, which
  is gitignored.
- Store document metadata and storage keys in the database, not large binary
  files.
- Keep the local storage backend compatible with future S3/R2-style object
  storage.
- Supported upload types should stay conservative: PDF, TIFF, PNG, and JPEG.
- Multi-document open/download should produce a single combined PDF.
- Fax and email/send actions are future-facing; do not wire real sending unless
  the user explicitly asks.

## Deployment And Infrastructure

- Current production shape is Vercel frontend and Render backend.
- Docker Compose exists for optional local development only.
- Do not introduce infrastructure, platform changes, or paid/vendor
  dependencies without asking.
- Do not make production or remote API writes unless explicitly requested. When
  possible, dry-run write-oriented remote commands first.
