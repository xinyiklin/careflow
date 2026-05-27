# CareFlow — Claude Overrides

`AGENTS.md` is the canonical guide. Read it and `CONTINUITY.md` before acting.
This file adds Claude-specific behavior; when it conflicts with `AGENTS.md`,
this file wins.

## Tool Use

- `Read` before `Edit`/`Write`. Never `Write` without reading first.
- Prefer `Grep` over shell grep for codebase searches.
- Run commands via `Bash` from the relevant subdirectory (`frontend/` or
  `backend/`). Use `./venv/bin/python` for backend commands.

## Visual QA

Use `mcp__Claude_in_Chrome` when available: `navigate` → `get_page_text` or
`computer` (screenshot) after `npm run dev`. Note the gap if unavailable.

## Git

Do not stage `CLAUDE.md` unless the user explicitly asks.

## Communication

Think privately. Report actions, blockers, and outputs only. Skip preambles
and reasoning unless asked.
