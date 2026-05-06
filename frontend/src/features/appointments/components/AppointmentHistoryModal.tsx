import { useEffect, useMemo, useState } from "react";
import { CalendarClock, Clock3, History, UserRound } from "lucide-react";

import { fetchAppointmentHistory } from "../api/appointments";
import { Badge, Button, ModalShell } from "../../../shared/components/ui";
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
    <div className="relative grid gap-3 pl-8">
      <div className="absolute top-0 bottom-[-0.75rem] left-[0.45rem] w-px bg-cf-border" />
      <div
        className={[
          "absolute top-4 left-0 h-4 w-4 rounded-full border-4 border-cf-page-bg",
          actionStyle.dot,
        ].join(" ")}
      />

      <article className="overflow-hidden rounded-2xl border border-cf-border bg-cf-surface shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-cf-border bg-cf-surface-muted/45 px-4 py-3">
          <div className="flex min-w-0 items-center gap-2">
            <Badge variant={actionStyle.badge}>{actionStyle.label}</Badge>
            <div className="truncate text-sm font-semibold text-cf-text">
              {entry.actor_name || "Unknown user"}
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-1.5 text-xs font-medium text-cf-text-subtle">
            <Clock3 className="h-3.5 w-3.5" />
            <span>{[date, time].filter(Boolean).join(" at ")}</span>
          </div>
        </div>

        <div className="px-4 py-4">
          <p className="text-sm leading-6 text-cf-text">
            {entry.summary || "Appointment activity recorded."}
          </p>

          {entry.changed_fields?.length ? (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {entry.changed_fields.map((field) => (
                <Badge key={field} variant="muted">
                  {field}
                </Badge>
              ))}
            </div>
          ) : (
            <p className="mt-2 text-xs text-cf-text-subtle">
              No individual fields were listed for this event.
            </p>
          )}
        </div>
      </article>
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
    if (!isOpen) {
      setEntries([]);
      setLoading(false);
      setError("");
    }
  }, [isOpen]);

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
      title="Appointment Activity Log"
      maxWidth="4xl"
      zIndex={90}
      bodyClassName="bg-cf-page-bg"
      footerClassName="justify-end"
      footer={
        <Button type="button" variant="default" onClick={onClose}>
          Close
        </Button>
      }
    >
      <div className="space-y-5">
        <div className="grid gap-3 rounded-2xl border border-cf-border bg-cf-surface px-4 py-4 shadow-sm sm:grid-cols-2">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-cf-border bg-cf-surface-soft text-cf-text-subtle">
              <UserRound className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-cf-text-subtle">
                Patient
              </div>
              <div className="mt-0.5 truncate text-sm font-semibold text-cf-text">
                {patientName || "Unknown patient"}
              </div>
            </div>
          </div>

          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-cf-border bg-cf-surface-soft text-cf-text-subtle">
              <CalendarClock className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-cf-text-subtle">
                Appointment
              </div>
              <div className="mt-0.5 truncate text-sm font-semibold text-cf-text">
                {appointmentSummary || "No appointment time"}
              </div>
            </div>
          </div>
        </div>

        <section className="rounded-2xl border border-cf-border bg-cf-surface-muted/45 p-4">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 text-sm font-semibold text-cf-text">
                <History className="h-4 w-4 text-cf-text-subtle" />
                Activity Log
              </div>
              <p className="mt-1 text-sm text-cf-text-muted">
                Review who changed this appointment and which fields were
                touched.
              </p>
            </div>
            <Badge variant="outline">
              {loading
                ? "Loading"
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
            <div className="space-y-3">
              {entries.map((entry) => (
                <HistoryRow key={entry.id} entry={entry} timeZone={timeZone} />
              ))}
            </div>
          )}
        </section>
      </div>
    </ModalShell>
  );
}
