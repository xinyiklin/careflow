# UI Principles

CareFlow should feel like a compact clinical workspace: calm, dense enough for
repeated front-desk and clinical use, and consistent across schedule, patients,
documents, admin, and modal workflows.

## Source Of Truth

- Reuse shared primitives from `apps/clinician/src/shared/components/ui/`.
- Prefer CareFlow tokens and classes from `apps/clinician/src/index.css`.
- Keep page container, shell, modal, and header treatments consistent across
  dashboard, schedule, admin, documents, and patient surfaces.
- Use Google Chrome for visual inspection/QA unless the user explicitly asks for
  another browser surface.
- Dev-only visual experiments belong in `apps/clinician/dev-previews/` and must
  be guarded by `import.meta.env.DEV`.

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
- Do not teach the user how to use the app inline. Avoid writing manuals or
  explaining basic interactions inside the UI. A simple, obvious hint or
  placeholder is acceptable, but do not write multi-sentence explanations or
  essays.
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

## Sanctioned Visual Exceptions

### Insurance Card Treatment

Patient insurance policy cards (`PatientHubTabPanels`, `PatientHubSidebar`,
`InsurancePolicyModal`) use carrier-branded gradients and accent colors to give
insurance cards a real card feel. This is a deliberate visual departure from the
flat token-based design system. Rules within this exception:

- Carrier accent colors are data-driven (from `insuranceCardBranding.ts`).
- Do not add transient animation (`animate-ping`, `animate-pulse`) to insurance
  cards.
- Keep text contrast accessible on gradient backgrounds.
- This exception applies only to insurance card surfaces — do not extend
  gradient-heavy styling to other areas.

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

## Selector Controls

When the user picks one option from a fixed set (view mode, scope, category),
use a shared selector component so behavior and layout are consistent:

- **SegmentedControl** (`shared/components/ui/SegmentedControl`) for horizontal
  toggles between 2–N options. Each option fills an equal share of the track —
  the selected state takes up the whole section, not a floating pill.
- **CategoryRail / CategoryRailItem** (`shared/components/ui/CategoryRail`) for
  vertical sidebar navigation between workspace sections.

Do not hand-roll new inline segmented toggles or tab-strip selectors. Use the
shared components and extend them if a new variant is genuinely needed.

## Loading States & Layout Stability

Three patterns work together to keep CareFlow surfaces from feeling jumpy
when data fetches resolve. Apply all three together; in isolation each
fixes only part of the problem.

### 1. Suppress sub-150 ms loading UI

Anywhere a component renders a visible loading state (skeleton, spinner,
"Loading…" text), wrap the raw `isLoading` flag with
`useMinimumLoading` before driving the conditional render. Available in
both apps:

- `apps/clinician/src/shared/hooks/useMinimumLoading.ts`
- `apps/patient/src/shared/hooks/useMinimumLoading.ts`

Default behavior:

- If `isLoading` clears within 150 ms, the loading UI never renders.
- Once shown, the loading UI stays for at least 300 ms before swapping
  to content.

```tsx
const showLoading = useMinimumLoading(query.isLoading);
return showLoading ? <Skeleton ... /> : <Populated ... />;
```

Wrap at the page or component-shell level; the inner card just
receives a smoothed `loading` prop. Do not wrap:

- Button-disabled states for save / submit mutations (intentional
  feedback while the user is staring at the button).
- React Query's `isFetching` for background revalidations when cached
  data is already displayed.

### 2. Reserve stable dimensions for variable states

A card that shows different shapes for empty vs populated vs loading
states must occupy the **same outer dimensions** in all three. The
inner content can vary; the container does not shrink or grow.

- Pick a `min-h-*` value that fits the populated state's natural
  height, apply it to the outermost wrapper (e.g. the `Card`).
- While loading, render a `Skeleton` that fills the same space.
  Patient portal primitive: `apps/patient/src/shared/ui/Skeleton.tsx`
  (accepts a `lines={n}` prop for stacked text-line placeholders).
- Empty-state composition must fit within the same `min-h-*` without
  fighting it. Center vertically rather than letting the container
  shrink.
- Never use conditional dimensions per state (`h-32` for empty,
  `h-auto` for populated). That is the layout shift this pattern
  exists to prevent.

### 3. Lock modal dimensions

Modals must not resize after they open. A modal that grows when an
async fetch resolves reads as a glitch because the user is already
focused on the panel.

Apply on the consumer (not on the shared Modal primitive):

- Set a fixed (or `min` + `max`) height on the modal panel via
  `panelClassName="h-[min(85dvh,640px)]"` or similar. Choose values
  that fit the largest expected populated state.
- Internal flex column: header + footer stay `shrink-0`; the body
  gets `flex-1 min-h-0 overflow-y-auto` so it scrolls inside the
  panel instead of growing the panel.
- If a sub-section inside the modal has variable height (an activity
  log, an audit trail), clamp it independently with `max-h-*` +
  `overflow-y-auto` so it scrolls within the body.

Reference fix: `apps/clinician/src/features/appointments/components/AppointmentHistoryModal.tsx`.

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
