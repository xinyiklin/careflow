# Product

<!-- impeccable:product-schema 1 -->

Product context for CareFlow. Operating rules and visual
anti-patterns live in [docs/engineering/ui-principles.md](docs/engineering/ui-principles.md);
tokens and component vocabulary live in [DESIGN.md](DESIGN.md).

## Platform

web

## Product Purpose

CareFlow is an EHR-style clinic workflow demo. The authenticated portals support
staff scheduling, patient registration, clinical records, and patient
self-service. Success means users can complete connected clinic workflows
while facility boundaries and patient privacy remain explicit.

## Positioning

A portfolio demonstration of connected clinic workflows and facility-scoped
access, using synthetic data. It is not a certified EHR or a production medical
service. Product and engineering claims must be supported by the actual demo
and repository; no regulatory or customer claims are implied.

## Operating Context

Staff use the clinician workspace for frequent scheduling, patient lookup,
check-in, and charting. Patients use a separate authenticated self-service
portal. Reviewers can explore the seeded demo. The public landing page explains
the project; authenticated screens focus on completing work.

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

## Product Principles

1. **Workflow over schema.** Surfaces reflect what the user is trying to do,
   not the shape of the database. The Patient Hub Timeline tab cross-cuts
   appointments + encounters + medications + allergies; it doesn't mirror
   `patients_patient.*` columns.
2. **Facility scope is invariant.** Patient, appointment, document, clinical,
   and billing lists/mutations are bound to a facility. UI never invents a
   cross-facility shortcut without an organization-admin permission gate.
3. **Reuse over invention.** Shared primitives in
   `apps/clinician/src/shared/components/ui/` (SegmentedControl, CategoryRail,
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

## Capabilities and Constraints

- Patient-adjacent records and operations are facility-scoped and permission
  gated. Organization administration has its own explicit access boundaries.
- Clinician scheduling permits intentional overlap after confirmation. Time
  conflicts use appointment intervals, with adjacent endpoints allowed, and
  compare assigned resources or rendering providers within the facility.
  Only cancelled appointments release occupied time under this policy.
- Booking presence is advisory. The final appointment save determines whether
  an interval can be booked; the same-patient/same-day warning is a separate rule.
- Patient self-scheduling has its own eligibility and cancellation rules and
  does not offer a staff overlap override.
- Current implementation and verification status belong in `CONTINUITY.md`;
  this product record is not evidence of deployment or a passed runtime check.

## Evidence on Hand

- The clinician and patient apps in `apps/` demonstrate the supported workflows.
- `backend/appointments/tests*.py` contains scheduling and booking regression
  coverage; test existence alone is not a claim that a check passed.
- `apps/landing/public/careflow-thumbnail.jpg` is an existing demo image.
- `docs/engineering/architecture.md` records app boundaries and deployment
  shape. Do not invent customer evidence, benchmarks, certifications, or audits.

## Surface Boundaries

The authenticated portals are task-oriented workspaces. Familiarity and
workflow continuity matter. The public `apps/landing` site at
`careflow.xinyiklin.com` explains the project: hero
typography, generous spacing, and product-explaining copy are appropriate there
precisely because they are wrong inside the product. It reuses the brand tokens
and stays restrained (no gradient-healthcare slop, no stock clinicians), but it
is not held to the density and copy-restraint rules that govern the portals.
Keep these surface-specific expectations separate.
