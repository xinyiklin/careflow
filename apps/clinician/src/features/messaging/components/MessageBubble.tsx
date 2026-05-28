import type { MessageItem } from "../api/messaging";

type MessageBubbleProps = {
  message: MessageItem;
};

function formatTimestamp(value: string) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function MessageBubble({ message }: MessageBubbleProps) {
  const isClinician = message.sender_kind === "clinician";

  return (
    <li
      className={`flex flex-col gap-1 ${
        isClinician ? "items-end" : "items-start"
      }`}
    >
      <div
        className={`flex items-baseline gap-2 text-[11px] ${
          isClinician ? "flex-row-reverse" : "flex-row"
        }`}
      >
        <span className="font-semibold text-cf-text">
          {message.sender_display_name ||
            (isClinician ? "Care team" : "Patient")}
        </span>
        <span className="text-cf-text-subtle">
          {formatTimestamp(message.created_at)}
        </span>
      </div>
      <div
        className={`max-w-[80%] whitespace-pre-wrap break-words rounded-2xl px-3.5 py-2.5 text-sm shadow-[var(--shadow-panel)] ${
          isClinician
            ? "rounded-tr-sm bg-cf-accent text-cf-page-bg"
            : "rounded-tl-sm border border-cf-border bg-cf-surface text-cf-text"
        }`}
      >
        {message.body}
      </div>
    </li>
  );
}
