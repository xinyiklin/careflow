import { Clock3 } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

import {
  formatDateOnlyInTimeZone,
  formatTimeInTimeZone,
} from "../../utils/dateTime";
import Badge from "./Badge";

export type TimelineTone =
  | "accent"
  | "success"
  | "warning"
  | "danger"
  | "muted";

export type TimelineBadgeVariant =
  | "neutral"
  | "outline"
  | "success"
  | "warning"
  | "danger"
  | "muted";

export type TimelineEvent = {
  id: string;
  occurredAt: string;
  title: string;
  subtitle?: ReactNode;
  icon?: LucideIcon;
  badge?: { label: string; variant?: TimelineBadgeVariant } | null;
  tone?: TimelineTone;
  meta?: ReactNode;
};

type TimelineFeedProps = {
  events: TimelineEvent[];
  timeZone?: string | null;
};

const dotClasses: Record<TimelineTone, string> = {
  accent: "bg-cf-accent",
  success: "bg-cf-success-text",
  warning: "bg-cf-warning-text",
  danger: "bg-cf-danger-text",
  muted: "bg-cf-text-subtle",
};

function formatTimestamp(value: string, timeZone?: string | null) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return { date: "Unknown date", time: "" };
  }
  return {
    date: formatDateOnlyInTimeZone(parsed, timeZone, "MMM d, yyyy"),
    time: formatTimeInTimeZone(parsed, timeZone, "h:mm a"),
  };
}

function TimelineRow({
  event,
  timeZone,
}: {
  event: TimelineEvent;
  timeZone?: string | null;
}) {
  const { date, time } = formatTimestamp(event.occurredAt, timeZone);
  const Icon = event.icon;
  const tone: TimelineTone = event.tone || "muted";

  return (
    <div className="relative pl-8 pb-1">
      <div className="absolute left-0 top-1 flex h-3.5 w-3.5 items-center justify-center rounded-full border-2 border-cf-surface bg-cf-surface shadow-sm ring-4 ring-cf-surface">
        <span
          className={["h-1.5 w-1.5 rounded-full", dotClasses[tone]].join(" ")}
        />
      </div>

      <div className="flex flex-col gap-1">
        <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
          <div className="flex min-w-0 items-center gap-2">
            {Icon ? (
              <Icon className="h-3.5 w-3.5 shrink-0 text-cf-text-subtle" />
            ) : null}
            <span className="truncate text-sm font-semibold text-cf-text">
              {event.title}
            </span>
            {event.badge ? (
              <Badge
                variant={event.badge.variant || "neutral"}
                className="text-[10px] px-2 py-0"
              >
                {event.badge.label}
              </Badge>
            ) : null}
          </div>
          <div className="flex shrink-0 items-center gap-1.5 text-xs text-cf-text-subtle">
            <Clock3 className="h-3.5 w-3.5 text-cf-text-subtle" />
            <span>{[date, time].filter(Boolean).join(" at ")}</span>
          </div>
        </div>

        {event.subtitle ? (
          <div className="text-sm leading-relaxed text-cf-text-muted">
            {event.subtitle}
          </div>
        ) : null}

        {event.meta ? (
          <div className="mt-1 flex flex-wrap gap-1">{event.meta}</div>
        ) : null}
      </div>
    </div>
  );
}

export default function TimelineFeed({ events, timeZone }: TimelineFeedProps) {
  if (!events.length) return null;

  return (
    <div className="relative pl-1 py-1">
      <div className="absolute left-[7px] top-2 bottom-3 w-px bg-cf-border" />
      <div className="space-y-6">
        {events.map((event) => (
          <TimelineRow key={event.id} event={event} timeZone={timeZone} />
        ))}
      </div>
    </div>
  );
}
