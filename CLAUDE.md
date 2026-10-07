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

**Flag-first, skip by default.** Do not run browser QA unsolicited. When a
change carries real layout, density, or responsive risk in the clinician or
patient UI, say so and let the user decide. Run it when asked.

When you do run it:

- **Default: the in-app browser pane** (`mcp__Claude_Browser__*`).
  `preview_start` by launch-config name — `clinician`, `patient`, `landing`, or
  `backend` from `.claude/launch.json` — instead of hand-typing a port.
- Prefer `read_page` / `get_page_text` / `read_console_messages` over
  screenshots for structure, copy, and errors; `computer` for
  screenshots and interaction; `resize_window` for widths (1440 / 768 / 375).
  Width fidelity matters here — the clinician UI is dense.
- **Claude in Chrome** (`mcp__claude-in-chrome__*`) when the check needs the
  real profile's logged-in session or a non-Chromium comparison. If the bridge
  isn't connected, use the pane and note the gap.
- The QA pane is paint-gated: `IntersectionObserver`, `ResizeObserver`, rAF,
  and transitions do not fire while it is occluded. Force frames with a real
  scroll or screenshot gesture, or verify the end state and inspect the wiring.
