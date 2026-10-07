// Portal destinations. Default to the AWS subdomains this landing page fronts;
// override per environment with VITE_CLINICIAN_URL / VITE_PATIENT_URL.
const CLINICIAN_URL =
  import.meta.env.VITE_CLINICIAN_URL ?? "https://clinician.xinyiklin.com";
const PATIENT_URL =
  import.meta.env.VITE_PATIENT_URL ?? "https://patient.xinyiklin.com";

export const GITHUB_URL =
  import.meta.env.VITE_GITHUB_URL ?? "https://github.com/xinyiklin/careflow";

export const CREATOR = { name: "Xinyi Lin", href: "https://xinyiklin.com/" };

function hostOf(url: string): string {
  try {
    return new URL(url).host;
  } catch {
    return url.replace(/^https?:\/\//, "").replace(/\/.*$/, "");
  }
}

/** Light/dark variants of a product screenshot; the frame shows the one that
 * matches the landing page's active theme. */
export type ThemedShot = { light: string; dark: string };

export type DoorKey = "clinician" | "patient";

export type Door = {
  key: DoorKey;
  name: string;
  audience: string;
  href: string;
  host: string;
  shot: ThemedShot;
  shotAlt: string;
};

export const DOORS: Door[] = [
  {
    key: "clinician",
    name: "Clinician workspace",
    audience: "Front desk, nurses, physicians, and admins",
    href: CLINICIAN_URL,
    host: hostOf(CLINICIAN_URL),
    shot: {
      light: "/shots/clinician-schedule-light.jpg",
      dark: "/shots/clinician-schedule-dark.jpg",
    },
    shotAlt:
      "CareFlow clinician schedule: provider and room columns, a month calendar with an availability heatmap, and appointment blocks with status labels",
  },
  {
    key: "patient",
    name: "Patient portal",
    audience: "Patients, in four languages",
    href: PATIENT_URL,
    host: hostOf(PATIENT_URL),
    shot: {
      light: "/shots/patient-portal-light.jpg",
      dark: "/shots/patient-portal-dark.jpg",
    },
    shotAlt:
      "CareFlow patient portal home with a booking prompt, messages, and active medications",
  },
];

export const SPECS: { label: string; value: string }[] = [
  { label: "Portals", value: "Clinician + patient" },
  { label: "API", value: "240+ OpenAPI operations" },
  { label: "Scope", value: "Facility-bound" },
  { label: "Locales", value: "EN · ES · 简体 · 繁體" },
  { label: "Data", value: "Synthetic only" },
];

export type Lane = "desk" | "clinical" | "patient" | "admin";

export const LANES: { key: Lane; label: string; door: DoorKey }[] = [
  { key: "desk", label: "Front desk", door: "clinician" },
  { key: "clinical", label: "Clinical", door: "clinician" },
  { key: "patient", label: "Patient", door: "patient" },
  { key: "admin", label: "Admin", door: "clinician" },
];

export type DayBlock = {
  time: string;
  lane: Lane;
  /** Where this lives in the product: the real nav or module name. */
  module: string;
  title: string;
  body: string;
};

// An illustrative clinic day, ordered by time. The times are a narrative
// device; every block is a workflow that ships in the demo (PRODUCT.md and the
// portal READMEs). Blocks that share an hour share a row on the board.
export const DAY: DayBlock[] = [
  {
    time: "08:05",
    lane: "desk",
    module: "Schedule",
    title: "Open the day grid",
    body: "Provider and room columns, an availability heatmap, and drag to reschedule.",
  },
  {
    time: "08:20",
    lane: "patient",
    module: "Appointments",
    title: "Book from home",
    body: "Open times with the care team, under the portal's own eligibility and cancellation rules.",
  },
  {
    time: "09:10",
    lane: "desk",
    module: "Schedule",
    title: "Book without collisions",
    body: "Live slot holds show when someone else is booking a time. The final save decides.",
  },
  {
    time: "09:30",
    lane: "clinical",
    module: "Patient hub",
    title: "Chart the visit",
    body: "History, SOAP encounters, and progress notes that are signed, not just saved.",
  },
  {
    time: "11:00",
    lane: "clinical",
    module: "Refills",
    title: "Work the refill queue",
    body: "Medication lists, refill requests from the portal, and e-prescribing scaffolding.",
  },
  {
    time: "11:40",
    lane: "patient",
    module: "Messages",
    title: "Ask the care team",
    body: "Secure messages and refill requests in English, Spanish, or Chinese, Simplified or Traditional.",
  },
  {
    time: "14:15",
    lane: "clinical",
    module: "Inbox",
    title: "Reply as one clinic",
    body: "A clinic-wide inbox answers patient threads in one voice. Staff reads are audited.",
  },
  {
    time: "14:30",
    lane: "admin",
    module: "Facility Admin",
    title: "Run the facility",
    body: "Staff, resources, appointment types, fee schedules, and payer and pharmacy preferences.",
  },
  {
    time: "17:05",
    lane: "admin",
    module: "Org Admin",
    title: "Hold the line",
    body: "Roles, permission matrices, and the audit log. Crossing facilities takes an org-level gate.",
  },
];

export const BOUNDARY: { title: string; items: string[] }[] = [
  {
    title: "Scoped",
    items: [
      "Patient, appointment, document, clinical, and billing lists and edits carry a facility",
      "Permission gates per source: patients, documents, insurance, billing",
      "Organization-wide views only behind an organization-level permission",
    ],
  },
  {
    title: "Guarded",
    items: [
      "SSN encrypted at rest and masked by default",
      "Revealing it is deliberate, and every reveal is audited",
      "Portal accounts reject any user who holds a staff role",
    ],
  },
  {
    title: "Synthetic",
    items: [
      "Every patient, appointment, and record is invented",
      "Not a certified EHR or a medical service",
      "No HIPAA or SOC 2 compliance claim",
    ],
  },
];

export const SIBLINGS = [
  {
    name: "RoleFit AI",
    note: "Local-first job application workbench",
    href: "https://rolefit.xinyiklin.com/",
  },
  {
    name: "Typeset",
    note: "Local-first resume editor",
    href: "https://typeset.xinyiklin.com/",
  },
  { name: "Portfolio", note: "xinyiklin.com", href: CREATOR.href },
];

export const NAV_LINKS = [
  { href: "#day", label: "A clinic day" },
  { href: "#boundary", label: "Boundary" },
  { href: "#doors", label: "Open the demo" },
];
