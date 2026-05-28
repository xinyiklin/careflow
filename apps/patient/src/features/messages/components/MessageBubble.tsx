import { formatRelative } from "../../../shared/utils/dates";
import type { PortalMessage } from "../api/messaging";

type MessageBubbleProps = {
  message: PortalMessage;
};

export function MessageBubble({ message }: MessageBubbleProps) {
  const isPatient = message.sender_kind === "patient";

  return (
    <li
      className={`flex flex-col ${
        isPatient ? "items-end" : "items-start"
      } gap-1`}
    >
      <div
        className={`flex items-baseline gap-2 text-[11px] ${
          isPatient ? "flex-row-reverse" : "flex-row"
        }`}
      >
        <span className="font-semibold text-cf-text">
          {message.sender_display_name || (isPatient ? "You" : "Care team")}
        </span>
        <span className="text-cf-text-subtle">
          {formatRelative(message.created_at)}
        </span>
      </div>
      <div
        className={`max-w-[85%] whitespace-pre-wrap break-words rounded-cf-card px-3 py-2 text-sm shadow-panel ${
          isPatient
            ? "rounded-tr-sm bg-cf-accent-soft text-cf-text"
            : "rounded-tl-sm border border-cf-border bg-cf-surface text-cf-text"
        }`}
      >
        {message.body}
      </div>
    </li>
  );
}
