# CareFlow — Claude Overrides

`AGENTS.md` is the canonical guide. It is imported below, so its rules load
into context every session — no separate read step. `CONTINUITY.md` is **not**
imported (it changes constantly); read it fresh before acting. This file adds
Claude-specific behavior; when it conflicts with `AGENTS.md`, this file wins.

@AGENTS.md

## Tool Use

- `Read` before `Edit`/`Write`. Never `Write` without reading first.
- Prefer `Grep` over shell grep for codebase searches; otherwise use `rg`.
- Frontend lives in an npm workspaces monorepo. Run workspace commands from
  the repo root (`npm -w @careflow/clinician run ...`) or from
  `apps/clinician/` directly. Backend commands run from `backend/` with
  `./venv/bin/python`.

## Visual QA

Verify major UI changes in a browser when feasible (`AGENTS.md` default).
Pick the tool by what you're verifying:

- **Layout / responsive / visual fidelity** → **Claude in Chrome**
  (`mcp__Claude_in_Chrome`): real window, accurate at any width
  (`resize_window`, e.g. 1440 / 768 / 375), faithful screenshots.
- **Content / computed styles / tokens / console** → **Claude Preview**
  (`mcp__Claude_Preview`): `preview_snapshot` / `preview_inspect` are
  deterministic (no pixel-guessing); `preview_screenshot` for a glance, fall
  back to snapshot/inspect if blank.
- If the chosen tool's bridge isn't connected, use the other and note the gap.

Default here: **Chrome** — dense clinician UI, width fidelity matters.
`navigate` to `http://localhost:5173` after `npm run dev:clinician`, then
`get_page_text` / `read_page` / `computer`.
