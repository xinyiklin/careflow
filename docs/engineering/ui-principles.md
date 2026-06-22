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

### Clip rounded containers with filled edges

A rounded, framed container (modal, card, panel) that has a **filled** edge
region — a footer or header with its own background, a banner strip — must round
to the container's radius. Put `overflow-hidden` on the rounded container (this
is the sanctioned "clips a surface" case above, not hiding a layout mistake), or
round the matching corners on the child. Without it the child's square corners
poke past the container's `border-radius` — most visibly the two bottom corners
of a filled modal footer. The shared modal shells already do this and are the
reference: `apps/clinician/src/shared/components/ui/ModalShell.tsx` and
`apps/patient/src/shared/ui/Modal.tsx`. Any new framed container with a filled
edge region must follow the same rule.

## Copy And Chrome

- Avoid unnecessary subtitles, helper descriptions, filler copy, and extra
  header height.
- Do not add helper text when the surrounding workflow already explains the
  state.
- Do not teach the user how to use the app inline. CareFlow is a tool for
  trained staff, not a how-to/tutorial app: no manuals, no explaining basic
  interactions, and no instructional, example, or "how-to" placeholder or
  helper copy (e.g. "Annual checkup, follow-up, or similar"; "Enter full SSN").
  Field labels and obvious affordances carry the meaning — prefer inputs with
  no placeholder. A bare format mask for a genuinely non-obvious format (e.g.
  phone) is the only narrow exception.
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

When the user picks one option from a fixed set, the _kind_ of choice picks the
control. Two questions decide it:

1. Does choosing an option **swap the whole content body**? That is
   **navigation** → use **tabs**.
2. Does choosing an option **reshape or filter what stays on screen, or set a
   field's value**? That is a **control** → use **SegmentedControl**.

Vertical navigation between workspace sections is a third case → use
**CategoryRail / CategoryRailItem** (`shared/components/ui/CategoryRail`).

### Tabs — navigation between content panels

Use the shared **Tabs** primitive (`shared/components/ui/Tabs`). It renders an
underline tab strip (`-mb-px border-b-2`, accent underline on the active tab,
sitting on a content-edge rail) and owns the roving-tabindex keyboard model
(←/→, Home/End). Tabs switch between sibling panels that each replace the main
body — the surface you are looking at changes wholesale. Canonical: Patient Hub
sections; the Refill inbox source switch (Pharmacy queue vs Patient queue). Tabs
read as page structure, not a floating control, so they anchor to the top or
edge of the surface they govern.

For full APG semantics, pass `idBase` (a per-instance `useId()`) and tag the
panel container with `role="tabpanel"`, `id={getTabPanelId(idBase)}`, and
`aria-labelledby={getTabId(idBase, activeValue)}` — Tabs then emits matching
`aria-controls` on each tab.

### SegmentedControl — a control on one surface

`shared/components/ui/SegmentedControl` renders 2–N equal-width options on one
track; the selected state fills its whole section (no floating pill). Use it for
view modes, scopes, density, status/override filters, and enum fields in forms
and modals — the body stays put while the control changes how it is shown or
which subset appears. Pick the variant by where the control lives:

- **`default`** (contiguous track, control radius, light sliding thumb) — the
  structural toggle for a surface or an enum field inside a form/modal: schedule
  Resource/Multi-day, security Roles/Users, preference toggles, compact section
  switchers. Reach for this unless a reason points elsewhere.
- **`pill`** (rounded-full track, dark sliding thumb) — a _filter_ in a toolbar
  or list header that narrows a list in place: refill/message status, permission
  overrides, activity-log scope. Pills read lighter, so they sit comfortably in
  a filter row next to selects.
- **`loose`** (detached accent pills, no track) — a soft, low-density filter
  where a boxed track would feel heavy and the options are few (Patient Timeline
  filter). Use sparingly.

Do not hand-roll new inline segmented toggles or tab strips. Use these controls
and add a variant only if a genuinely new shape is needed.

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

### 4. Skip the page fade on transient redirect routes

A route whose only job is to `<Navigate replace />` elsewhere (e.g.
`/admin` resolves to `/admin/organization` or `/admin/facility` based
on permissions) must NOT trigger the global page fade animation. Without
this, the user sees two fades fire in rapid succession — one for the
transient mount, one for the destination.

Pattern: maintain a small `TRANSIENT_REDIRECT_PATHS` set in the shell
that owns the fade (e.g. `AppShell.tsx` for the clinician, `Layout.tsx`
for the patient portal). Skip the `cf-page-fade-in` class when the
current pathname is in that set. Reference:
`apps/clinician/src/app/AppShell.tsx`.

## Domain rules

### Statuses that mean "won't attend"

`AppointmentStatus` carries a `code` field (e.g. `scheduled`,
`confirmed`, `arrived`, `completed`, `cancelled`, `no_show`,
`rescheduled`). Views that need to filter for "appointments the
patient is actually going to attend" should skip these terminal /
non-attendance codes:

- `cancelled`
- `rescheduled`
- `no_show`
- `completed`

Anchored at: `apps/patient/src/features/dashboard/pages/DashboardPage.tsx`
(`NON_NEXT_APPOINTMENT_STATUSES`). When you need the same filter
elsewhere (next-visit reminders, upcoming-appointment widgets in the
clinician dashboard, etc.) reuse the same set or import it.

We don't add a per-status toggle (`is_terminal`, `is_attendable`,
etc.) for this — the protected-default codes are stable and a
hardcoded set is clearer than yet another admin checkbox sitting next
to `is_active` and `is_billable`.

## Modal header copy

Modal headers should answer **"what specific record am I looking at?"**
not **"what kind of modal is this?"** The user already knows it's an
appointment modal because they opened it from the schedule.

Banned defaults in modal headers:

- "Scheduler · Edit appointment" / "Scheduler · New appointment" type
  eyebrows above the actual heading.
- "Edit XYZ" / "New XYZ" prefixes restating the modal's category.
- Section-name breadcrumbs ("Patient safety", "Document Center",
  "Billing", "Clinical Charting") that just label the surface the
  user came from.

What to keep in headers:

- The record's specific identity (patient name + appointment time,
  document title, visit date, etc.).
- Status badges carrying real semantic state ("Locked", "Signed off",
  "Closed").
- Sticky CTAs for the modal's primary action ("Sign off", "Submit").

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

Visual QA expectations (run locally, Chrome, both themes, no console errors /
layout shift, screenshot) live in `docs/engineering/testing.md` → Chrome Visual
QA.
