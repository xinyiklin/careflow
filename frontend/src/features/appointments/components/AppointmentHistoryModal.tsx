import { useEffect, useMemo, useState } from "react";
import { Clock3, History } from "lucide-react";

import { fetchAppointmentHistory } from "../api/appointments";
import { Badge, Button, ModalShell } from "../../../shared/components/ui";
import { useModalPresence } from "../../../shared/hooks/useModalPresence";
import {
  formatDateOnlyInTimeZone,
  formatTimeInTimeZone,
} from "../../../shared/utils/dateTime";
import { getErrorMessage } from "../../../shared/utils/errors";
import type { EntityId } from "../../../shared/api/types";
import type { AppointmentHistoryEntry } from "../types";

type HistoryBadgeVariant = "success" | "warning" | "danger" | "outline";

type HistoryActionStyle = {
  label: string;
  badge: HistoryBadgeVariant;
  dot: string;
};

type HistoryRowProps = {
  entry: AppointmentHistoryEntry;
  timeZone?: string | null;
};

type HistoryStateProps = {
  tone?: "default" | "danger";
  title: string;
  body?: string;
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

const actionStyles: Record<string, HistoryActionStyle> = {
  create: {
    label: "Created",
    badge: "success",
    dot: "bg-cf-success-text",
  },
  update: {
    label: "Updated",
    badge: "warning",
    dot: "bg-cf-warning-text",
  },
  delete: {
    label: "Deleted",
    badge: "danger",
    dot: "bg-cf-danger-text",
  },
};

function getActionStyle(action: unknown): HistoryActionStyle {
  const key = String(action || "").toLowerCase();
  return (
    actionStyles[key] || {
      label: String(action || "Activity"),
      badge: "outline",
      dot: "bg-cf-text-subtle",
    }
  );
}

function formatTimestamp(
  value: string | Date | null | undefined,
  timeZone?: string | null
) {
  const timestamp = new Date(value || "");
  if (Number.isNaN(timestamp.getTime())) {
    return { date: "Unknown date", time: "" };
  }

  return {
    date: formatDateOnlyInTimeZone(timestamp, timeZone, "MMM d, yyyy"),
    time: formatTimeInTimeZone(timestamp, timeZone, "h:mm a"),
  };
}

function HistoryRow({ entry, timeZone }: HistoryRowProps) {
  const actionStyle = getActionStyle(entry.action);
  const { date, time } = formatTimestamp(entry.created_at, timeZone);

  return (
    <div className="relative pl-8 pb-1">
      {/* Dot marker */}
      <div
        className={[
          "absolute left-0 top-1 h-3.5 w-3.5 rounded-full border-2 border-cf-surface bg-cf-surface shadow-sm flex items-center justify-center ring-4 ring-cf-surface",
        ].join(" ")}
      >
        <span
          className={["h-1.5 w-1.5 rounded-full", actionStyle.dot].join(" ")}
        />
      </div>

      <div className="flex flex-col gap-1">
        <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-cf-text">
              {entry.actor_name || "Unknown user"}
            </span>
            <Badge
              variant={actionStyle.badge}
              className="text-[10px] px-2 py-0"
            >
              {actionStyle.label}
            </Badge>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-cf-text-subtle">
            <Clock3 className="h-3.5 w-3.5 text-cf-text-subtle" />
            <span>{[date, time].filter(Boolean).join(" at ")}</span>
          </div>
        </div>

        <p className="text-sm text-cf-text-muted leading-relaxed">
          {entry.summary || "Appointment activity recorded."}
        </p>

        {entry.changed_fields?.length ? (
          <div className="mt-1.5 flex flex-wrap gap-1">
            {entry.changed_fields.map((field) => (
              <Badge
                key={field}
                variant="muted"
                className="text-[10px] px-2 py-0"
              >
                {field}
              </Badge>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}

function HistoryState({ tone = "default", title, body }: HistoryStateProps) {
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
            {loading
              ? "Loading..."
              : `${entries.length} event${entries.length === 1 ? "" : "s"}`}
          </Badge>
        </div>

        {loading ? (
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
        ) : entries.length === 0 ? (
          <HistoryState
            title="No activity yet"
            body="Changes will appear here after this appointment is updated."
          />
        ) : (
          <div className="relative pl-1 py-1">
            <div className="absolute left-[7px] top-2 bottom-3 w-px bg-cf-border" />
            <div className="space-y-6">
              {entries.map((entry) => (
                <HistoryRow key={entry.id} entry={entry} timeZone={timeZone} />
              ))}
            </div>
          </div>
        )}
      </div>
    </ModalShell>
  );
}
