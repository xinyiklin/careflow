# Testing

CareFlow testing should prove the changed behavior, protect facility and auth
boundaries, and avoid wasting time on unrelated full-suite work when a targeted
check gives stronger feedback.

## Testing Mindset

- Define success before coding: reproduce or identify the behavior, change it,
  and run the smallest meaningful verification.
- Prefer targeted tests while iterating, then broaden when the blast radius is
  shared or user-facing.
- If a check fails, treat the failure as evidence. Fix the smallest real cause
  and rerun the smallest meaningful check before broader ones.
- If checks are skipped, explain why in the final response.

## Backend Coverage

Good backend tests cover:

- authorized happy path
- unauthenticated request returns 401 for protected endpoints
- cross-facility access returns 403 where facility scope applies
- serializer validation for required fields, unknown fields, and cross-field
  rules
- mutation side effects such as activity/audit records, timestamps, or related
  state changes
- migration creation when models change
- storage behavior without storing large binary bytes in database rows

Useful commands:

```bash
cd backend
./venv/bin/python manage.py check
./venv/bin/python manage.py makemigrations --check --dry-run
./venv/bin/python manage.py test
```

Use targeted test modules when possible, for example:

```bash
cd backend
./venv/bin/python manage.py test appointments
```

Run migrations only when schema changes are in scope:

```bash
cd backend
./venv/bin/python manage.py migrate
```

Do not run destructive reset/flush commands or production migrations without
explicit instruction.

## Frontend Coverage

Good frontend verification covers:

- affected route renders without runtime/console errors
- changed controls are reachable by keyboard
- loading/data refresh does not cause avoidable layout shift
- API error states show user-safe messaging
- components use shared tokens/primitives instead of one-off styles
- responsive behavior is checked when the touched surface depends on breakpoints

Useful commands:

```bash
cd frontend
npx eslint <changed-files>
npm run build
npm run dev
```

Prefer targeted lint for changed frontend files while iterating. Run
`npm run build` when frontend source changes before finalizing unless the user
explicitly asks for a faster partial pass.

## Chrome Visual QA

Chrome visual QA is expected for major UI changes when feasible.

Check:

- the affected route in the normal workflow
- light and dark mode when the surface uses theme tokens
- modal open/close and focus behavior when modals changed
- no overlapping text or controls
- no accidental nested card/panel treatment
- no spinner/loading/shimmer effects unless requested
- tablet or desktop breakpoints relevant to the changed surface

For tiny copy or class-only edits, visual QA may be skipped with a short reason.

## Refactors

Good refactor verification proves behavior parity:

- existing tests covering the behavior still pass
- `npm run build` succeeds if frontend source changed
- grep for old symbol names returns no meaningful hits after renames
- no new imports of deprecated paths
- affected call sites still use the intended public interface

Avoid drive-by refactors. Refactor only when the current task requires it, the
existing structure blocks correctness, or the improvement can be verified
safely.

## Docs-Only Changes

For docs-only changes:

- no frontend build or backend tests are required
- verify paths and links exist
- run a spelling/grep sanity check when useful
- update `CONTINUITY.md` if the docs change durable workflow, decisions, active
  risks, or next steps

Document skipped runtime checks as not applicable.
