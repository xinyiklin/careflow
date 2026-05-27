import {
  AlertTriangle,
  CalendarClock,
  ClipboardCheck,
  ClipboardList,
  Pill,
  PillBottle,
} from "lucide-react";

import type {
  TimelineBadgeVariant,
  TimelineEvent,
  TimelineTone,
} from "../../../../shared/components/ui";
import type { AppointmentLike } from "../../../../shared/types/domain";
import type {
  ClinicalEncounter,
  ClinicalEncounterStatus,
} from "../../../billing/types";
import type {
  PatientAllergy,
  PatientAllergySeverity,
} from "../../api/allergies";
import type {
  MedicationStatus,
  PatientMedication,
} from "../../api/medications";

export type TimelineCategory = "visit" | "charting" | "medication" | "allergy";

export type CategorizedTimelineEvent = TimelineEvent & {
  category: TimelineCategory;
};

function dateOnlyToIso(value?: string | null): string | null {
  if (!value) return null;
  if (value.includes("T")) return value;
  return `${value}T00:00:00`;
}

function pickEarliest(
  ...candidates: Array<string | null | undefined>
): string | null {
  for (const candidate of candidates) {
    if (candidate) return candidate;
  }
  return null;
}

const appointmentToneByStatus: Record<string, TimelineTone> = {
  cancelled: "danger",
  canceled: "danger",
  no_show: "warning",
  noshow: "warning",
  completed: "success",
  checked_out: "success",
  arrived: "accent",
  scheduled: "accent",
};

const appointmentBadgeByStatus: Record<string, TimelineBadgeVariant> = {
  cancelled: "danger",
  canceled: "danger",
  no_show: "warning",
  noshow: "warning",
  completed: "success",
  checked_out: "success",
};

export function normalizeAppointment(
  appointment: AppointmentLike
): CategorizedTimelineEvent | null {
  if (!appointment.id || !appointment.appointment_time) return null;

  const statusKey = String(
    appointment.status_code || appointment.status_name || ""
  )
    .toLowerCase()
    .replace(/\s+/g, "_");
  const tone = appointmentToneByStatus[statusKey] || "accent";
  const badgeVariant = appointmentBadgeByStatus[statusKey] || "outline";

  const providerLine = [
    appointment.rendering_provider_name,
    appointment.room ? `Room ${appointment.room}` : null,
  ]
    .filter(Boolean)
    .join(" • ");

  const reasonLine = appointment.reason ? appointment.reason : null;
  const subtitle =
    [providerLine, reasonLine].filter(Boolean).join(" — ") || null;

  return {
    id: `appointment-${appointment.id}`,
    category: "visit",
    occurredAt: appointment.appointment_time,
    icon: CalendarClock,
    tone,
    title: appointment.appointment_type_name || "Appointment",
    subtitle,
    badge: appointment.status_name
      ? { label: appointment.status_name, variant: badgeVariant }
      : null,
  };
}

const encounterStatusToTone: Record<ClinicalEncounterStatus, TimelineTone> = {
  in_progress: "accent",
  signed: "success",
  cancelled: "danger",
};

export function normalizeEncounter(
  encounter: ClinicalEncounter
): CategorizedTimelineEvent[] {
  if (!encounter.id) return [];

  const events: CategorizedTimelineEvent[] = [];
  const createdAt = pickEarliest(
    encounter.started_at,
    encounter.created_at,
    encounter.appointment_time
  );

  if (createdAt) {
    const tone = encounter.status
      ? encounterStatusToTone[encounter.status] || "muted"
      : "accent";
    events.push({
      id: `encounter-${encounter.id}`,
      category: "charting",
      occurredAt: createdAt,
      icon: ClipboardList,
      tone,
      title: "Encounter opened",
      subtitle:
        [encounter.rendering_provider_name, encounter.reason]
          .filter(Boolean)
          .join(" — ") || null,
      badge: encounter.appointment_type_name
        ? { label: encounter.appointment_type_name, variant: "outline" }
        : null,
    });
  }

  const signedAt = encounter.progress_note?.signed_at;
  if (signedAt) {
    events.push({
      id: `encounter-${encounter.id}-signed`,
      category: "charting",
      occurredAt: signedAt,
      icon: ClipboardCheck,
      tone: "success",
      title: "Progress note signed",
      subtitle: encounter.progress_note?.signed_by_name
        ? `Signed by ${encounter.progress_note.signed_by_name}`
        : null,
      badge: { label: "Signed", variant: "success" },
    });
  }

  return events;
}

const medicationStatusToTone: Record<MedicationStatus, TimelineTone> = {
  active: "success",
  inactive: "warning",
  discontinued: "muted",
};

const medicationStatusToBadge: Record<MedicationStatus, TimelineBadgeVariant> =
  {
    active: "success",
    inactive: "warning",
    discontinued: "muted",
  };

export function normalizeMedication(
  medication: PatientMedication
): CategorizedTimelineEvent[] {
  if (!medication.id) return [];

  const events: CategorizedTimelineEvent[] = [];
  const startedAt =
    dateOnlyToIso(medication.start_date) || medication.created_at;

  if (startedAt) {
    events.push({
      id: `medication-${medication.id}-start`,
      category: "medication",
      occurredAt: startedAt,
      icon: Pill,
      tone: medicationStatusToTone[medication.status] || "muted",
      title: `Started ${medication.medication_name}`,
      subtitle:
        [medication.dose, medication.route, medication.frequency]
          .filter(Boolean)
          .join(" — ") || null,
      badge: {
        label: medication.status_label || medication.status,
        variant: medicationStatusToBadge[medication.status] || "muted",
      },
    });
  }

  if (medication.status === "discontinued" && medication.end_date) {
    const endedAt = dateOnlyToIso(medication.end_date);
    if (endedAt) {
      events.push({
        id: `medication-${medication.id}-end`,
        category: "medication",
        occurredAt: endedAt,
        icon: PillBottle,
        tone: "muted",
        title: `Discontinued ${medication.medication_name}`,
        subtitle: medication.prescriber_name
          ? `Prescriber: ${medication.prescriber_name}`
          : null,
        badge: { label: "Discontinued", variant: "muted" },
      });
    }
  }

  return events;
}

const allergySeverityToTone: Record<PatientAllergySeverity, TimelineTone> = {
  unknown: "muted",
  mild: "success",
  moderate: "warning",
  severe: "danger",
  life_threatening: "danger",
};

const allergySeverityToBadge: Record<
  PatientAllergySeverity,
  TimelineBadgeVariant
> = {
  unknown: "muted",
  mild: "success",
  moderate: "warning",
  severe: "danger",
  life_threatening: "danger",
};

export function normalizeAllergy(
  allergy: PatientAllergy
): CategorizedTimelineEvent | null {
  if (!allergy.id) return null;

  const recordedAt = pickEarliest(
    dateOnlyToIso(allergy.onset_date),
    allergy.created_at
  );
  if (!recordedAt) return null;

  const severity = allergy.severity || "unknown";
  const subtitle =
    [allergy.category_label, allergy.reaction].filter(Boolean).join(" — ") ||
    null;

  return {
    id: `allergy-${allergy.id}`,
    category: "allergy",
    occurredAt: recordedAt,
    icon: AlertTriangle,
    tone: allergySeverityToTone[severity] || "muted",
    title: `Allergy: ${allergy.allergen || "Unknown allergen"}`,
    subtitle,
    badge: allergy.severity_label
      ? {
          label: allergy.severity_label,
          variant: allergySeverityToBadge[severity] || "muted",
        }
      : null,
  };
}

export function sortTimelineEvents<T extends TimelineEvent>(events: T[]): T[] {
  return [...events].sort((a, b) => {
    const aTime = new Date(a.occurredAt).getTime();
    const bTime = new Date(b.occurredAt).getTime();
    if (Number.isNaN(aTime) || Number.isNaN(bTime)) return 0;
    return bTime - aTime;
  });
}
