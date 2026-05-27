# PRODUCT.md

Product context for CareFlow. Loaded by design-aware AI tooling (`impeccable`,
`frontend-design`, register-aware critique). Operating rules and visual
anti-patterns live in [docs/engineering/ui-principles.md](docs/engineering/ui-principles.md);
tokens and component vocabulary live in [DESIGN.md](DESIGN.md).

## Register

**Product.** Authenticated, task-oriented surfaces. Users are in a workflow,
not browsing. The tool should disappear into the task; familiarity is a
feature, not a failure. Brand-register expectations (ambitious motion, hero
typography, drenched palettes) do not apply here.

## Users

Multi-tenant, facility-scoped. Five concrete roles, in rough order of session
volume:

- **Front-desk staff** — schedule visits, register patients, manage check-in.
  High-frequency, keyboard-and-click hybrid. Tolerates density; needs speed.
- **Clinical staff (physicians, nurses)** — open patient hub, review history,
  chart encounters, sign progress notes. Reads more than writes; values
  scannable hierarchy and signed/unsigned state clarity.
- **Facility administrators** — manage staff, resources, room blocks, fee
  schedules, payer/pharmacy preferences for one facility. Edits configuration
  occasionally; expects calm, predictable forms.
- **Organization administrators** — cross-facility roles, permissions matrices,
  audit log, organization-level overrides. Lowest session volume; highest
  blast radius. Needs guardrails, not assistance.
- **Demo viewer (portfolio context)** — reviewer or prospective employer
  clicking through with the seeded `demo` account. They have full
  permissions and zero training. First-impression quality matters.

Patient-adjacent and operational data is facility-scoped by default.
Organization administrators may see cross-facility admin surfaces only through
explicit organization-level permission gates. Permission gates apply per source
(patients, documents, insurance, billing) and per facility.

## Tone

- **Calm and clinical.** Workspace, not marketing.
- **Dense, not crowded.** Compact spacing, smaller type, low chrome — but
  layout should never feel cluttered. Density earns the right to skip
  decoration.
- **Workflow-oriented copy.** Tell the user what state they're in, not how
  the app works. No inline manuals, no "how to use this" boxes, no helper
  paragraphs.
- **Quiet errors.** Inline near the affected field, recoverable, no toast
  spam, no global banners.
- **Sensitive data is handled deliberately.** SSN is masked by default and
  full reveal is intentional and audited. DOB is patient-identifying data:
  show it only where it supports patient matching or clinical context, and
  avoid duplicating it in shared chrome.

## Anti-references

What CareFlow is **not**:

- **Epic / Cerner maximalism.** Dense in the wrong way — every field visible
  always, dropdown forests, modal-on-modal, gray-on-gray. CareFlow wants
  density with hierarchy, not density as info-dump.
- **Consumer-EHR / telehealth softness** (Cedar, Sesame, One Medical
  marketing surfaces). Friendly fonts, illustrated empty states, pastel
  cards, hero photos of smiling clinicians. CareFlow is a workspace, not
  a landing page.
- **Generic SaaS-dashboard slop.** Linear-shaped layouts and Notion-shaped
  sidebars mapped onto medical data; breadcrumbs everywhere; command
  palette for everything; rounded gradient buttons; "AI-built dashboard"
  bento grids. Familiar product patterns are good; performative ones
  aren't.
- **Loading theatre.** Skeleton shimmer, spinners centered in panels,
  progress bars for sub-second loads, animated dots. Layout preservation
  is silent. (See `ui-principles.md § Loading And Empty States`.)
- **Gradient / decorative healthcare design.** Animated hero gradients,
  illustration-led empty states, glassmorphism, neumorphic buttons. The
  one sanctioned exception is the insurance-card carrier branding (see
  `ui-principles.md § Sanctioned Visual Exceptions`).

## Strategic principles

1. **Workflow over schema.** Surfaces reflect what the user is trying to do,
   not the shape of the database. The Patient Hub Timeline tab cross-cuts
   appointments + encounters + medications + allergies; it doesn't mirror
   `patients_patient.*` columns.
2. **Facility scope is invariant.** Patient, appointment, document, clinical,
   and billing lists/mutations are bound to a facility. UI never invents a
   cross-facility shortcut without an organization-admin permission gate.
3. **Reuse over invention.** Shared primitives in
   `frontend/src/shared/components/ui/` (SegmentedControl, CategoryRail,
   TimelineFeed) win over hand-rolled variants. New variants extend the
   primitive; they don't replace it.
4. **Compact density, calm hierarchy.** Smaller type, tighter spacing,
   restrained color — but the eye should always know what's primary,
   secondary, and chrome. Density without hierarchy becomes Epic.
5. **Secure-by-default surfaces.** Masked SSN, cautious DOB placement, audited
   SSN reveal, no raw exception text, no stack traces, no endpoint paths in
   errors. Visual choices respect this; don't add a "show more" affordance
   that accidentally exposes PHI by default.
6. **Stable layout.** Defined dimensions for boards, grids, toolbars,
   counters, repeated tiles. Hover and dynamic content don't reflow the
   page. (See `ui-principles.md § Responsive Behavior`.)
7. **One sanctioned exception at a time.** Insurance cards are the current
   carve-out. Do not extend exception treatments (carrier gradients,
   accent fills) to other surfaces without an explicit decision.

## Out of scope

- Real PHI, real claims/payment processing, real eRx integration. All data is
  synthetic.
- HIPAA/SOC2 compliance claims. Portfolio piece, not a regulated product.
- Mobile-native flows. Tablet-aware where it matters; phone is not a
  primary target.
- Marketing surfaces, landing pages, public-facing brand site. The public
  surface is the README; everything inside `/` (authenticated) is product
  register.
