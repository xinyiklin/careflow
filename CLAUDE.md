# CareFlow — Claude Overrides

`AGENTS.md` is the canonical guide. Read it and `CONTINUITY.md` before acting.
This file adds Claude-specific behavior; when it conflicts with `AGENTS.md`,
this file wins.

## Tool Use

- `Read` before `Edit`/`Write`. Never `Write` without reading first.
- Prefer `Grep` over shell grep for codebase searches; otherwise use `rg`.
- Frontend lives in an npm workspaces monorepo. Run workspace commands from
  the repo root (`npm -w @careflow/clinician run ...`) or from
  `apps/clinician/` directly. Backend commands run from `backend/` with
  `./venv/bin/python`.

## Visual QA

Use `mcp__Claude_in_Chrome` when available for Chrome visual QA required by
`AGENTS.md` or UI docs: `navigate` → `get_page_text` or `computer`
(screenshot) after the relevant `npm run dev:*` command. Note the gap if
unavailable.

## Communication

Think privately. Report actions, blockers, and outputs only. Skip preambles
and reasoning unless asked.
