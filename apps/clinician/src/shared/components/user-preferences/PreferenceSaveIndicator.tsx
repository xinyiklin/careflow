import { Clock3, Cloud, CloudCheck, CloudOff, CloudUpload } from "lucide-react";
import type { SaveStatus } from "../../../app/context/userPreferencePersistence";

const states = {
  pending: { Icon: Cloud, label: "Unsaved changes", color: "text-cf-text-muted" },
  saving: { Icon: CloudUpload, label: "Saving changes", color: "text-cf-text-muted" },
  saved: { Icon: CloudCheck, label: "All changes saved", color: "text-cf-text-muted" },
  error: { Icon: CloudOff, label: "Couldn't save changes", color: "text-cf-danger-text" },
} satisfies Record<SaveStatus, { Icon: typeof Cloud; label: string; color: string }>;

export default function PreferenceSaveIndicator({ status }: { status: SaveStatus }) {
  const { Icon, label, color } = states[status];

  return (
    <span
      tabIndex={0}
      className={`group relative inline-flex h-7 w-7 shrink-0 items-center justify-center rounded focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cf-accent ${color}`}
    >
      <span role="status" aria-atomic="true" className="sr-only">
        {label}
      </span>
      <Icon className="h-5 w-5" aria-hidden="true" />
      {status === "pending" ? (
        <Clock3
          className="absolute bottom-0.5 right-0 h-3 w-3 rounded-full bg-cf-surface"
          aria-hidden="true"
        />
      ) : null}
      <span
        aria-hidden="true"
        className="invisible absolute bottom-full left-1/2 -translate-x-1/2 pb-2 group-hover:visible group-focus-visible:visible"
      >
        <span className="block whitespace-nowrap rounded border border-cf-border bg-cf-surface px-2 py-1 text-xs text-cf-text">
          {label}
        </span>
      </span>
    </span>
  );
}
