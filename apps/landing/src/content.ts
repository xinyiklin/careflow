import type { LucideIcon } from "lucide-react";
import {
  CalendarClock,
  ClipboardList,
  Languages,
  MessagesSquare,
  Building2,
  ShieldCheck,
} from "lucide-react";

// Portal destinations. Default to the AWS subdomains this landing page fronts;
// override per environment (e.g. during the Render->Amplify cutover) with
// VITE_CLINICIAN_URL / VITE_PATIENT_URL.
const CLINICIAN_URL =
  import.meta.env.VITE_CLINICIAN_URL ?? "https://clinician.careflow.xinyiklin.com";
const PATIENT_URL =
  import.meta.env.VITE_PATIENT_URL ?? "https://patient.careflow.xinyiklin.com";

export const GITHUB_URL = import.meta.env.VITE_GITHUB_URL ?? "";

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

export type Portal = {
  key: "clinician" | "patient";
  name: string;
  tagline: string;
  description: string;
  points: string[];
  href: string;
  host: string;
  cta: string;
  shot: ThemedShot;
  shotAlt: string;
};

export const PORTALS: Portal[] = [
  {
    key: "clinician",
    name: "Clinician workspace",
    tagline: "For front desk, nurses, physicians, and admins",
    description:
      "The authenticated staff surface: schedule the day, register and chart patients, prescribe, message, and manage a facility.",
    points: [
      "Day grid with an availability heatmap and drag to reschedule",
      "Patient hub: history, encounters, signed progress notes",
      "Facility scoping and role permissions on every action",
    ],
    href: CLINICIAN_URL,
    host: hostOf(CLINICIAN_URL),
    cta: "Clinician workspace",
    shot: {
      light: "/shots/clinician-schedule-light.jpg",
      dark: "/shots/clinician-schedule-dark.jpg",
    },
    shotAlt: "CareFlow clinician schedule board with an availability heatmap",
  },
  {
    key: "patient",
    name: "Patient portal",
    tagline: "For patients, in four languages",
    description:
      "A calm, read-first portal where patients see their profile, appointments, and medications, and message the care team.",
    points: [
      "Profile, appointments, and medication list at a glance",
      "Refill requests and secure messaging with the clinic",
      "English, Spanish, and Chinese, in light or dark mode",
    ],
    href: PATIENT_URL,
    host: hostOf(PATIENT_URL),
    cta: "Patient portal",
    shot: {
      light: "/shots/patient-portal-light.jpg",
      dark: "/shots/patient-portal-dark.jpg",
    },
    shotAlt: "CareFlow patient portal showing appointments and medications",
  },
];

export type Highlight = {
  icon: LucideIcon;
  title: string;
  body: string;
};

export const HIGHLIGHTS: Highlight[] = [
  {
    icon: Building2,
    title: "Facility-scoped by default",
    body: "Every patient, appointment, document, and bill is bound to a facility. Cross-facility access needs an explicit organization-level permission gate.",
  },
  {
    icon: CalendarClock,
    title: "Scheduling that holds up",
    body: "A day grid with an availability heatmap, drag to reschedule, and live slot-hold presence so two staff never book the same slot.",
  },
  {
    icon: ClipboardList,
    title: "Charting and orders",
    body: "Patient hub, SOAP encounters, signed progress notes, and medications with refill requests and e-prescribing scaffolding.",
  },
  {
    icon: MessagesSquare,
    title: "Secure messaging",
    body: "A clinic-wide inbox. Patients reach the care team; clinicians reply as one voice, with thread reads audited on the staff side.",
  },
  {
    icon: Languages,
    title: "A portal in four languages",
    body: "The patient side ships English, Spanish, and Chinese (Simplified and Traditional), with a light, dark, and system theme.",
  },
  {
    icon: ShieldCheck,
    title: "Built for privacy",
    body: "SSN is encrypted at rest and masked by default, and revealing it is audited. No real PHI: every record is synthetic.",
  },
];

export type TechGroup = {
  label: string;
  items: { name: string; slug: string }[];
};

// Real stack, rendered as monochrome marks (Simple Icons) so the neutral
// palette stays intact. Names carry the meaning if a logo fails to load.
export const STACK: TechGroup[] = [
  {
    label: "Frontend",
    items: [
      { name: "React", slug: "react" },
      { name: "TypeScript", slug: "typescript" },
      { name: "Vite", slug: "vite" },
      { name: "Tailwind CSS", slug: "tailwindcss" },
    ],
  },
  {
    label: "Backend",
    items: [
      { name: "Python", slug: "python" },
      { name: "Django", slug: "django" },
      { name: "PostgreSQL", slug: "postgresql" },
    ],
  },
  {
    label: "Infrastructure",
    items: [
      { name: "AWS Amplify", slug: "awsamplify" },
      { name: "Render", slug: "render" },
    ],
  },
];

export const NAV_LINKS = [
  { href: "#portals", label: "Portals" },
  { href: "#highlights", label: "What's inside" },
  { href: "#stack", label: "Built with" },
];
