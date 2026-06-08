# @careflow/api-types

TypeScript types generated from the CareFlow backend's OpenAPI schema. Single
source of truth for request/response shapes consumed by `@careflow/clinician`
and `@careflow/patient`.

## Regenerate

From the repo root:

```bash
npm run generate
```

Or from this package directory:

```bash
npm run generate
```

The script runs the backend's `manage.py spectacular` against the live Django
config to produce `src/schema.yaml`, then runs `openapi-typescript` to produce
`src/generated.ts`. Both files are committed — they are the stable contract
consumed by the patient app and CI. Regenerate them with `npm run generate` and
commit the result after backend API or schema changes.

Requires the backend Python virtualenv at `backend/venv/`. Run after backend
schema changes (new endpoints, serializer field changes, etc.).
