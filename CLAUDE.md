<!-- AGENTS.md is the canonical shared policy and loads through the import
below; this file adds only Claude-specific mechanics and must not contradict
it. Keep the import even though Claude can read AGENTS.md natively: any
CLAUDE.md or CLAUDE.local.md on the path turns native reading off.
CONTINUITY.md is deliberately not imported because it changes constantly.
Claude strips this comment before loading the file. -->

# CareFlow — Claude Adapter

@AGENTS.md

Read `CONTINUITY.md` fresh before acting; it is not imported.

## Visual QA

Flag-first per `docs/engineering/testing.md` § Visual QA. When you run it:

- **Default: the in-app browser pane** (`mcp__Claude_Browser__*`).
  `preview_start` by launch-config name — `clinician`, `patient`, `landing`, or
  `backend` from `.claude/launch.json` — instead of hand-typing a port.
- Prefer `read_page` / `get_page_text` / `read_console_messages` over
  screenshots for structure, copy, and errors; `resize_window` for widths
  (1440 / 768 / 375). Width fidelity matters — the clinician UI is dense.
- **Claude in Chrome** (`mcp__claude-in-chrome__*`) when the check needs the
  real profile's logged-in session or a non-Chromium comparison. If the bridge
  isn't connected, use the pane and note the gap.
- The pane is paint-gated: `IntersectionObserver`, `ResizeObserver`, rAF, and
  transitions do not fire while it is occluded. Force frames with a real
  scroll or screenshot gesture, or verify the end state and inspect the wiring.
