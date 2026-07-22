# DESIGN.md

Token reference and component vocabulary for CareFlow. Loaded by design-aware
AI tooling alongside [PRODUCT.md](PRODUCT.md). Authoritative source for
**values**: tokens, fonts, scales, primitives. Authoritative source for
**rules**: [docs/engineering/ui-principles.md](docs/engineering/ui-principles.md).
When this file and `ui-principles.md` conflict, `ui-principles.md` wins.

Shared `cf-*` semantic token values and the shared dark palette live in
[packages/ui-tokens/src/careflow.css](packages/ui-tokens/src/careflow.css).
Consumer stylesheets own their selectors and local extensions: clinician adds
sidebar tokens in `apps/clinician/src/index.css`, while landing adds its
marketing shell values in `apps/landing/src/index.css`. This doc summarizes;
the CSS is canonical.

## Color

Tailwind v4 `@theme` tokens. Product chrome should reference these tokens.
Hard-coded hex values for ordinary surfaces outside token-owning CSS are a bug.
Named data/config colors are the exception, not a shortcut around the system.

### Surfaces (light)

| Token | Value | Use |
| --- | --- | --- |
| `cf-page-bg` | `#f6f7f9` | Outer page background |
| `cf-surface` | `#ffffff` | Cards, modals, primary panels |
| `cf-surface-muted` | `#f8fafc` | Subtle inner zones, table headers |
| `cf-surface-soft` | `#f1f5f9` | Hover wash, secondary surface |

### Borders (light)

| Token | Value | Use |
| --- | --- | --- |
| `cf-border` | `#e6e9ee` | Default panel/divider |
| `cf-border-strong` | `#cbd5e1` | Emphasis, active state outlines |

### Text (light)

| Token | Value | Use |
| --- | --- | --- |
| `cf-text` | `#0f172a` | Primary body and headings |
| `cf-text-muted` | `#475569` | Secondary labels, metadata |
| `cf-text-subtle` | `#64748b` | Captions, hints, placeholder |

### Accent

Primary action and selection color. Deliberately neutral-dark (slate-900),
not a chromatic brand color — CareFlow is a workspace, accent reads as
emphasis, not personality.

| Token | Value | Use |
| --- | --- | --- |
| `cf-accent` | `#0f172a` | Primary button fill, selected state |
| `cf-accent-hover` | `#1e293b` | Hover on accent fill |
| `cf-accent-soft` | `#e2e8f0` | Soft accent surface, badge bg |

### Semantic status

| Token pair | Use |
| --- | --- |
| `cf-success-bg` / `cf-success-text` | Confirmed states, signed notes |
| `cf-warning-bg` / `cf-warning-text` | Overrides, pending review |
| `cf-danger-bg` / `cf-danger-text` | Errors, destructive actions |

Status colors do not carry decoration. A success badge is a tinted pill, not
a gradient.

### Sidebar (always dark, both themes)

The sidebar is a navy slab in both light and dark mode. Its own token set
(`cf-sidebar-*`) handles surfaces, borders, text, and active-state mixing.
Do not substitute regular surface tokens inside the sidebar.

### Dark mode

Same token names; values override under `.dark`. Component code never
branches on theme — it references the token. Token values for dark mode
shift surface to `#0f172a → #182233`, text to slate-300, accent to slate-200
(inversion of light). The common dark values live in
`packages/ui-tokens/src/careflow.css`; clinician applies them under `.dark`.

### Heatmap scale

The schedule heatmap (`cf-schedule-heatmap-*`) uses a four-step cyan ramp
(`#e9f8ff → #73d1ef`) that lives outside the token system because it's a
single-purpose data scale, not a UI surface. Don't generalize.

### Data and configuration colors

Some colors are data, not chrome:

- appointment status and visit-type colors chosen through admin color controls
- the schedule heatmap scale
- insurance-card carrier branding

Keep these treatments isolated, contrast-aware, and clearly tied to the data
they represent. Do not extend their hex values, gradients, or accent fills to
surrounding product chrome.

## Typography

### Family

```
body: Inter, ui-sans-serif, system-ui, sans-serif
mono: "JetBrains Mono", ui-monospace, SFMono-Regular, Menlo, monospace
```

One sans family carries headings, body, labels, controls, and data. No
display/body pairing; no serif accents. Mono is reserved for code, keyboard
hints, and raw identifiers (MRN, IDs).

### Scale

Tailwind defaults, used deliberately compact:

- **Dense workflow surfaces** — `text-xs` (12px) for tabular data, list
  rows, and toolbar controls. `text-sm` (14px) for body in panels.
- **Section headings** — `text-base` to `text-lg`; rarely larger inside
  authenticated surfaces.
- **Modal/page titles** — `text-lg` to `text-xl`. Reserve `text-2xl`+ for
  the loading screen and login.

Avoid `clamp()` and fluid type. Product UIs render at consistent DPI;
predictable size beats responsive shrinkage.

### Weight

- 400 — body, table cells, descriptions.
- 500 — labels, button text, active nav.
- 600 — section headings, modal titles, emphasis only.

Never weight a whole paragraph at 600. Hierarchy comes from size and color,
not heavy body.

## Spacing

Tailwind scale, no custom additions. Working vocabulary:

- `p-2` / `gap-2` (8px) — tight controls, segmented options, badge insets.
- `p-3` / `gap-3` (12px) — list rows, toolbar items, form rows.
- `p-4` / `gap-4` (16px) — card and panel interiors.
- `p-6` / `gap-6` (24px) — modal sections, major layout gaps.
- `p-8` (32px) and above — rare, reserved for shell padding.

Density is the default. Generous spacing is a deliberate choice for one
surface, not a global setting.

## Radius

Three-step token scale (see `packages/ui-tokens/src/careflow.css`). Controls smaller than
cards smaller than shells.

| Token | Value | Use |
| --- | --- | --- |
| `--radius-cf-control` | `0.75rem` | Buttons, inputs, segmented options |
| `--radius-cf-card` | `1rem` | Repeated cards, list items |
| `--radius-cf-shell` | `1.5rem` | Modals, route frames, primary panels |

`rounded-full` (`9999px`) is reserved for badges, chips, toggles, dots,
avatars, and the admin pill nav. Do not pill-shape arbitrary buttons or
panels.

## Elevation

Two shadow tokens, intentionally restrained.

| Token | Value | Use |
| --- | --- | --- |
| `shadow-panel` | `0 1px 2px rgba(15, 23, 42, 0.05)` | Cards, stat tiles, inline panels |
| `shadow-panel-lg` | `0 22px 60px -32px rgba(15, 23, 42, 0.28)` | Modals, route frames, lifted primary panels |

A surface either sits flat or uses one of these. No custom shadow stacks.
Dark mode overrides both to lower-opacity rgba(0,0,0) values.

## Shape rules

From `ui-principles.md § No Nested Container Rule`. Critical for
critique/audit work — most "fix this UI" requests are nested-container
violations.

- One framed shell per page (`cf-route-frame`, modal, or workspace surface).
- Inside the shell: dividers, flat rows, subtle background bands, rails.
  No card-inside-card.
- Borders and shadows only when the container represents a repeated item,
  a modal, or a genuinely framed tool.
- `overflow-hidden` is allowed only when the component intentionally owns
  scrolling or clips animation. It is not a layout-mistake bandage.

## Component vocabulary

Shared primitives live in `apps/clinician/src/shared/components/ui/`. Audit
and critique passes should prefer these over hand-rolled variants.

- **SegmentedControl** — 2–N equal-width options on one track (no floating
  pill). Variants: `default` (control-radius track — structural toggles and
  form enums), `pill` (rounded-full — toolbar/list filters), `loose` (detached
  accent pills — soft filters). For _navigation_ between content panels use
  **Tabs** instead. Decision rule: `ui-principles.md § Selector Controls`.
- **Tabs** — underline tab strip for navigating between sibling content panels
  that each replace the main body (Patient Hub sections, Refill inbox source).
  Accent underline on the active tab, anchored to a content-edge rail; roving
  tabindex + arrow-key keyboard model. Not a filter — that is SegmentedControl.
- **CategoryRail / CategoryRailItem** — vertical sidebar navigation between
  workspace sections.
- **TimelineFeed / TimelineEvent** — dot + line + timestamp + badge pattern.
  Reused across Patient Timeline tab, Appointment History modal, Org/Facility
  Activity Log timeline view, Progress Note review rail.
- **AdminWorkspaceShell / AdminTableCard / AdminListToolbar / AdminTableFooter** —
  admin-panel layout primitives. Section title and subheader belong to the
  shell, refresh/add actions belong to the table card, filter/sort belong to
  the toolbar.
- **CompactModalGrid + preview panel** — premium two-column modal layout
  (fixed left preview, scrolling right form) used by Org User, Staff,
  Facility, and Pharmacy modals.

## Motion

- 150–220ms duration band. Modal panel-in is the upper bound at 220ms
  (`cubic-bezier(0.22, 1, 0.36, 1)`); most transitions sit at 150ms ease.
- Motion conveys state change only. No decorative motion, no orchestrated
  page-load sequences, no entrance choreography on data.
- `@media (prefers-reduced-motion: reduce)` disables modal animations.
  Respect this everywhere.
- No skeleton shimmer, no spinner-as-default, no loading badges. Layout
  preservation is silent. (See `ui-principles.md § Loading And Empty States`.)

## Sanctioned exceptions

Currently exactly one expressive brand-style exception: **insurance-card
carrier branding** on
`PatientHubTabPanels`, `PatientHubSidebar`, `InsurancePolicyModal`. Carrier
accent colors are data-driven from `insuranceCardBranding.ts`. Gradient
treatments stop at the card boundary; do not extend to surrounding chrome,
related tabs, or other patient surfaces.

## Visual QA

Chrome, not Preview. For meaningful UI changes: run locally, open the
affected authenticated route in Chrome, check both themes if the surface
uses theme tokens, confirm no console errors / layout shift / broken
keyboard path, capture a screenshot. Full procedure in `ui-principles.md
§ Visual QA`.
