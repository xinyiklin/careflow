import { useMemo, useState } from "react";
import { Activity, RotateCcw } from "lucide-react";

import {
  Badge,
  Button,
  EmptyState,
  SegmentedControl,
  TimelineFeed,
} from "../../../../shared/components/ui";
import useMinimumLoading from "../../../../shared/hooks/useMinimumLoading";
import usePatientAllergies from "../../hooks/usePatientAllergies";
import usePatientMedications from "../../hooks/usePatientMedications";
import {
  normalizeAllergy,
  normalizeAppointment,
  normalizeEncounter,
  normalizeMedication,
  sortTimelineEvents,
} from "./timelineNormalizers";

import type { EntityId } from "../../../../shared/api/types";
import type { ClinicalEncounter } from "../../../billing/types";
import type { AppointmentGroup } from "../../types";
import type {
  CategorizedTimelineEvent,
  TimelineCategory,
} from "./timelineNormalizers";

type CategoryFilter = TimelineCategory | "all";

type PatientTimelineTabProps = {
  facilityId?: EntityId | null;
  patientId?: EntityId | null;
  appointmentGroups: AppointmentGroup;
  clinicalEncounters: ClinicalEncounter[];
  canViewClinical: boolean;
  canViewMedications: boolean;
  canViewAllergies: boolean;
  timeZone?: string | null;
};

const filterOptions: readonly { value: CategoryFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "visit", label: "Visits" },
  { value: "charting", label: "Charting" },
  { value: "medication", label: "Medications" },
  { value: "allergy", label: "Allergies" },
] as const;

export default function PatientTimelineTab({
  facilityId,
  patientId,
  appointmentGroups,
  clinicalEncounters,
  canViewClinical,
  canViewMedications,
  canViewAllergies,
  timeZone,
}: PatientTimelineTabProps) {
  const [filter, setFilter] = useState<CategoryFilter>("all");

  const medicationsHook = usePatientMedications({
    facilityId,
    patientId,
    enabled: canViewMedications,
  });
  const allergiesHook = usePatientAllergies({
    facilityId,
    patientId,
    enabled: canViewAllergies,
  });

  const events = useMemo<CategorizedTimelineEvent[]>(() => {
    const collected: CategorizedTimelineEvent[] = [];

    [...appointmentGroups.upcoming, ...appointmentGroups.recent].forEach(
      (appointment) => {
        const event = normalizeAppointment(appointment);
        if (event) collected.push(event);
      }
    );

    if (canViewClinical) {
      clinicalEncounters.forEach((encounter) => {
        collected.push(...normalizeEncounter(encounter));
      });
    }

    if (canViewMedications) {
      medicationsHook.medications.forEach((medication) => {
        collected.push(...normalizeMedication(medication));
      });
    }

    if (canViewAllergies) {
      allergiesHook.allergies.forEach((allergy) => {
        const event = normalizeAllergy(allergy);
        if (event) collected.push(event);
      });
    }

    return sortTimelineEvents(collected);
  }, [
    appointmentGroups,
    canViewAllergies,
    canViewClinical,
    canViewMedications,
    clinicalEncounters,
    medicationsHook.medications,
    allergiesHook.allergies,
  ]);

  const filteredEvents = useMemo(() => {
    if (filter === "all") return events;
    return events.filter((event) => event.category === filter);
  }, [events, filter]);

  const rawIsLoading =
    (canViewMedications && medicationsHook.medicationsQuery.isLoading) ||
    (canViewAllergies && allergiesHook.allergiesQuery.isLoading);
  const isLoading = useMinimumLoading(rawIsLoading);

  const loadError =
    (canViewMedications && medicationsHook.medicationsQuery.error) ||
    (canViewAllergies && allergiesHook.allergiesQuery.error);

  const handleRetry = () => {
    if (canViewMedications) medicationsHook.medicationsQuery.refetch();
    if (canViewAllergies) allergiesHook.allergiesQuery.refetch();
  };

  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-sm font-semibold text-cf-text">
          <Activity className="h-4 w-4 text-cf-text-subtle" />
          Patient Timeline
        </div>
        <Badge variant="outline">
          {isLoading
            ? "Loading..."
            : rawIsLoading
              ? ""
              : `${filteredEvents.length} event${filteredEvents.length === 1 ? "" : "s"}`}
        </Badge>
      </div>

      <SegmentedControl
        options={filterOptions}
        value={filter}
        onChange={setFilter}
        variant="loose"
        size="xs"
      />

      {loadError ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-cf-border bg-cf-surface px-4 py-3">
          <div>
            <div className="text-sm font-semibold text-cf-text">
              Couldn&apos;t load the full timeline
            </div>
            <div className="text-sm text-cf-text-muted">
              Some sources failed. Try again or refresh the page.
            </div>
          </div>
          <Button type="button" size="sm" onClick={handleRetry}>
            <RotateCcw className="h-3.5 w-3.5" />
            Retry
          </Button>
        </div>
      ) : null}

      {filteredEvents.length ? (
        <div className="rounded-xl border border-cf-border bg-cf-surface px-4 py-4">
          <TimelineFeed events={filteredEvents} timeZone={timeZone} />
        </div>
      ) : isLoading || rawIsLoading ? null : (
        <EmptyState
          title={
            filter === "all"
              ? "No timeline activity yet"
              : "No activity in this category"
          }
          body={
            filter === "all"
              ? "Visits, charting, medications, and allergies will appear here as they're recorded."
              : "Switch filters to see activity from other categories."
          }
        />
      )}
    </section>
  );
}
