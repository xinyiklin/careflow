# UI Principles

CareFlow should feel like a compact clinical workspace: calm, dense enough for
repeated front-desk and clinical use, and consistent across schedule, patients,
documents, admin, and modal workflows.

## Source Of Truth

- Reuse shared primitives from `frontend/src/shared/components/ui/`.
- Prefer CareFlow tokens and classes from `frontend/src/index.css`.
- Keep page container, shell, modal, and header treatments consistent across
  dashboard, schedule, admin, documents, and patient surfaces.
- Use Google Chrome for visual inspection/QA unless the user explicitly asks for
  another browser surface.
- Dev-only visual experiments belong in `frontend/dev-previews/` and must be
  guarded by `import.meta.env.DEV`.

## Visual Direction

- Use restrained contrast, clear hierarchy, and compact spacing.
- Avoid gradient-heavy surfaces, decorative backgrounds, and hard-coded
  light/dark treatments.
- Use existing tokens such as `cf-page-bg`, `cf-surface`, `cf-border`,
  `cf-text`, and `cf-accent` instead of one-off colors.
- Match existing radius tokens: controls are tighter, cards/internal panels are
  moderate, and shells/modals are largest.
- Prefer icons for compact controls when the action is familiar and the icon is
  already available in the app's icon set.

## No Nested Container Rule

Let the outer page shell, modal shell, or workspace surface own the framed feel.
Do not stack card-like containers inside card-like containers just to group
content.

Use these patterns instead:

- inner sections separated by dividers
- flat rows with clear labels and values
- subtle background bands without new borders/shadows
- rail layouts where one side owns navigation or summary and the other owns
  detail
- one true card only when it represents a repeated item, modal, or genuinely
  framed tool

Avoid:

- cards inside cards
- panels inside panels
- bordered/shadowed wrappers around every subsection
- page-colored modal bodies nested inside already-framed modals
- `overflow-hidden` as a way to hide layout mistakes

`overflow-hidden` is acceptable only when the component intentionally owns
scrolling or clips an animation/surface.

## Copy And Chrome

- Avoid unnecessary subtitles, helper descriptions, filler copy, and extra
  header height.
- Do not add helper text when the surrounding workflow already explains the
  state.
- Fix stale or misleading visible copy during the same UI polish pass.
- Keep modal headers readable and consistent; use the established eyebrow +
  title pattern when it helps match the rest of the app.
- Avoid redundant patient identifiers in the same visual region.

## Loading And Empty States

- Do not add loading effects, spinners, loading badges, shimmer states, or
  transient animation unless the user explicitly asks.
- Preserve layout stability silently while data loads.
- Empty states should be calm, short, and actionable.
- Do not build fake loading states or mock systems.

## Error UX

CareFlow should not use global banners, toast spam, or permanent page-level
error boxes by default. Errors should support workflow recovery without adding
visual noise.

Prefer:

- inline validation near the affected field
- localized recoverable errors near the affected workflow
- compact retry affordances
- safe, user-facing language

Never show:

- raw exception messages
- stack traces
- SQL/database errors
- endpoint or internal path details
- secrets, tokens, PHI, or sensitive identifiers

## Interaction

- Keep keyboard access for changed controls.
- Preserve focus behavior in shared modal shells.
- Prefer segmented controls, menus, toggles, checkboxes, sliders, steppers, and
  inputs that match the kind of choice being made.
- Use tooltips for unfamiliar icon-only controls.
- Do not introduce global UX systems such as banners, toasts, or loading
  frameworks unless the user asks and the need is cross-cutting.

## Responsive Behavior

- Define stable dimensions for boards, grids, toolbars, icon buttons, counters,
  and repeated tiles so hover states or dynamic text do not shift layout.
- Text must fit inside its parent on mobile and desktop. Wrap or adjust the
  layout rather than clipping important content.
- For tablet-oriented surfaces, check the relevant breakpoints when the touched
  UI uses them.

## Visual QA

For meaningful UI changes:

1. Run the app locally.
2. Open the affected authenticated route in Chrome.
3. Check light and dark mode if the surface uses theme tokens.
4. Confirm no console errors, overlap, unexpected layout shift, or broken
   keyboard path.
5. Capture a screenshot or describe the visual QA in the final response.

For tiny copy/class changes, use judgment. If Chrome QA is skipped, say why.
