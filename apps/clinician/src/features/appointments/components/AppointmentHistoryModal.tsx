import { useEffect, useMemo, useState } from "react";
import { History, Pencil, PlusCircle, Trash2 } from "lucide-react";

import { fetchAppointmentHistory } from "../api/appointments";
import {
  Badge,
  Button,
  ModalShell,
  TimelineFeed,
} from "../../../shared/components/ui";
import useMinimumLoading from "../../../shared/hooks/useMinimumLoading";
import { useModalPresence } from "../../../shared/hooks/useModalPresence";
import {
  formatDateOnlyInTimeZone,
  formatTimeInTimeZone,
} from "../../../shared/utils/dateTime";
import { getErrorMessage } from "../../../shared/utils/errors";
import type { EntityId } from "../../../shared/api/types";
import type {
  TimelineBadgeVariant,
  TimelineEvent,
  TimelineTone,
} from "../../../shared/components/ui";
import type { LucideIcon } from "lucide-react";
import type { AppointmentHistoryEntry } from "../types";

type ActionStyle = {
  label: string;
  badge: TimelineBadgeVariant;
  tone: TimelineTone;
  icon: LucideIcon;
};

type AppointmentHistoryModalProps = {
  isOpen: boolean;
  appointmentId?: EntityId | null;
  facilityId?: EntityId | null;
  patientName?: string | null;
  appointmentTime?: string | Date | null;
  timeZone?: string | null;
  onClose: () => void;
};

const actionStyles: Record<string, ActionStyle> = {
  create: {
    label: "Created",
    badge: "success",
    tone: "success",
    icon: PlusCircle,
  },
  update: {
    label: "Updated",
    badge: "warning",
    tone: "warning",
    icon: Pencil,
  },
  delete: {
    label: "Deleted",
    badge: "danger",
    tone: "danger",
    icon: Trash2,
  },
};

function getActionStyle(action: unknown): ActionStyle {
  const key = String(action || "").toLowerCase();
  return (
    actionStyles[key] || {
      label: String(action || "Activity"),
      badge: "outline",
      tone: "muted",
      icon: History,
    }
  );
}

function toTimelineEvent(entry: AppointmentHistoryEntry): TimelineEvent | null {
  if (!entry.created_at) return null;
  const style = getActionStyle(entry.action);

  return {
    id: String(entry.id),
    occurredAt:
      typeof entry.created_at === "string"
        ? entry.created_at
        : entry.created_at.toISOString(),
    title: entry.actor_name || "Unknown user",
    subtitle: entry.summary || "Appointment activity recorded.",
    icon: style.icon,
    tone: style.tone,
    badge: { label: style.label, variant: style.badge },
    meta: entry.changed_fields?.length ? (
      <>
        {entry.changed_fields.map((field) => (
          <Badge key={field} variant="muted" className="text-[10px] px-2 py-0">
            {field}
          </Badge>
        ))}
      </>
    ) : null,
  };
}

function HistoryState({
  tone = "default",
  title,
  body,
}: {
  tone?: "default" | "danger";
  title: string;
  body?: string;
}) {
  const toneClasses = {
    default: "border-cf-border bg-cf-surface-soft text-cf-text-muted",
    danger: "border-cf-danger-bg bg-cf-danger-bg text-cf-danger-text",
  };

  return (
    <div
      className={[
        "rounded-2xl border px-5 py-8 text-center",
        toneClasses[tone] || toneClasses.default,
      ].join(" ")}
    >
      <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-2xl border border-current/20 bg-cf-surface/70">
        <History className="h-5 w-5" />
      </div>
      <div className="mt-3 text-sm font-semibold">{title}</div>
      {body ? <p className="mt-1 text-sm opacity-80">{body}</p> : null}
    </div>
  );
}

export default function AppointmentHistoryModal({
  isOpen,
  appointmentId,
  facilityId,
  patientName,
  appointmentTime,
  timeZone,
  onClose,
}: AppointmentHistoryModalProps) {
  const { shouldRender } = useModalPresence(isOpen);
  const [entries, setEntries] = useState<AppointmentHistoryEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const showLoading = useMinimumLoading(loading);

  useEffect(() => {
    if (!isOpen || !appointmentId || !facilityId) return;

    let isCancelled = false;
    const currentAppointmentId = appointmentId;
    const currentFacilityId = facilityId;

    async function loadHistory() {
      try {
        setLoading(true);
        setError("");
        const data = await fetchAppointmentHistory(
          currentFacilityId,
          currentAppointmentId
        );
        if (!isCancelled) {
          setEntries(Array.isArray(data) ? data : []);
        }
      } catch (err) {
        if (!isCancelled) {
          setError(
            getErrorMessage(err, "Failed to load appointment activity log.")
          );
        }
      } finally {
        if (!isCancelled) {
          setLoading(false);
        }
      }
    }

    loadHistory();

    return () => {
      isCancelled = true;
    };
  }, [appointmentId, facilityId, isOpen]);

  useEffect(() => {
    if (shouldRender) return;
    setEntries([]);
    setLoading(false);
    setError("");
  }, [shouldRender]);

  const timelineEvents = useMemo(
    () =>
      entries
        .map(toTimelineEvent)
        .filter((event): event is TimelineEvent => event !== null),
    [entries]
  );

  const appointmentSummary = useMemo(() => {
    if (!appointmentTime) return null;
    const timestamp = new Date(appointmentTime);
    if (Number.isNaN(timestamp.getTime())) return null;
    return `${formatDateOnlyInTimeZone(timestamp, timeZone, "MMM d, yyyy")} at ${formatTimeInTimeZone(
      timestamp,
      timeZone,
      "h:mm a"
    )}`;
  }, [appointmentTime, timeZone]);

  return (
    <ModalShell
      isOpen={isOpen}
      onClose={onClose}
      eyebrow={patientName ? `Patient: ${patientName}` : "Patient Activity"}
      title="Appointment Activity Log"
      description={
        appointmentSummary ? `Schedule: ${appointmentSummary}` : undefined
      }
      maxWidth="lg"
      zIndex={90}
      panelClassName="h-[min(85dvh,640px)]"
      footer={
        <Button
          type="button"
          variant="default"
          onClick={onClose}
          className="w-full sm:w-auto"
        >
          Close
        </Button>
      }
      footerClassName="justify-end"
    >
      <div className="space-y-6">
        <div className="flex items-center justify-between border-b border-cf-border pb-3">
          <div className="flex items-center gap-2 text-sm font-semibold text-cf-text">
            <History className="h-4.5 w-4.5 text-cf-text-subtle" />
            Change History
          </div>
          <Badge variant="outline">
            {showLoading
              ? "Loading..."
              : loading
                ? ""
                : `${entries.length} event${entries.length === 1 ? "" : "s"}`}
          </Badge>
        </div>

        {showLoading ? (
          <HistoryState
            title="Loading activity log"
            body="Pulling the latest activity for this appointment."
          />
        ) : error ? (
          <HistoryState
            tone="danger"
            title="Unable to load activity log"
            body={error}
          />
        ) : loading ? null : timelineEvents.length === 0 ? (
          <HistoryState
            title="No activity yet"
            body="Changes will appear here after this appointment is updated."
          />
        ) : (
          <TimelineFeed events={timelineEvents} timeZone={timeZone} />
        )}
      </div>
    </ModalShell>
  );
}
