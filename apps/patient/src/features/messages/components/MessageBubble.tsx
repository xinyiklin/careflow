import { useTranslation } from "react-i18next";

import { cn } from "../../../shared/ui";
import { formatRelative } from "../../../shared/utils/dates";
import type { PortalMessage } from "../api/messaging";

type MessageBubbleProps = {
  message: PortalMessage;
};

export function MessageBubble({ message }: MessageBubbleProps) {
  const { t } = useTranslation();
  const isPatient = message.sender_kind === "patient";

  const senderLabel =
    message.sender_display_name ||
    (isPatient ? t("messages.senderYou") : t("messages.senderCareTeam"));
  const relative = formatRelative(message.created_at);

  return (
    <li
      className={cn(
        "flex flex-col gap-1",
        isPatient ? "items-end" : "items-start"
      )}
    >
      <div
        className={cn(
          "flex items-baseline gap-2 text-[11px] text-text-subtle",
          isPatient && "flex-row-reverse"
        )}
      >
        <span className="font-medium text-text-muted">{senderLabel}</span>
        {relative ? <span>{relative}</span> : null}
      </div>
      <div
        className={cn(
          "max-w-[85%] whitespace-pre-wrap break-words rounded-lg px-3 py-2 text-sm shadow-[var(--shadow-sm)]",
          isPatient
            ? "rounded-tr-sm bg-accent text-accent-contrast"
            : "rounded-tl-sm border border-border bg-surface-soft text-text"
        )}
      >
        {message.body}
      </div>
    </li>
  );
}
