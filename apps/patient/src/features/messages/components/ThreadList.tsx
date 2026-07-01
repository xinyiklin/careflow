import { Inbox, Plus } from "lucide-react";
import { useTranslation } from "react-i18next";

import useMinimumLoading from "../../../shared/hooks/useMinimumLoading";
import {
  Badge,
  Button,
  Card,
  EmptyState,
  Skeleton,
  cn,
} from "../../../shared/ui";
import { formatRelative } from "../../../shared/utils/dates";
import { getErrorMessage } from "../../../shared/utils/errors";
import {
  useMessageThreads,
  type PortalMessageThreadSummary,
} from "../api/messaging";

type ThreadListProps = {
  activeThreadId: number | null;
  onSelectThread: (threadId: number) => void;
  onStartNew: () => void;
};

function ThreadRow({
  thread,
  isActive,
  onSelect,
  noSubjectLabel,
  noPreviewLabel,
}: {
  thread: PortalMessageThreadSummary;
  isActive: boolean;
  onSelect: () => void;
  noSubjectLabel: string;
  noPreviewLabel: string;
}) {
  const preview = thread.last_message_preview?.trim() || noPreviewLabel;
  const relative = formatRelative(thread.last_message_at);
  const subject = thread.subject?.trim() || noSubjectLabel;

  return (
    <li>
      <button
        type="button"
        onClick={onSelect}
        aria-current={isActive ? "true" : undefined}
        className={cn(
          "flex w-full items-start gap-2 border-b border-border px-4 py-3 text-left transition-colors last:border-b-0",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/35",
          "min-h-[68px]",
          isActive ? "bg-accent-soft" : "bg-surface hover:bg-surface-soft"
        )}
      >
        <span
          aria-hidden="true"
          className={cn(
            "mt-1.5 h-2 w-2 shrink-0 rounded-full",
            thread.unread_for_patient ? "bg-accent" : "bg-transparent"
          )}
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline justify-between gap-2">
            <span
              className={cn(
                "truncate text-sm",
                thread.unread_for_patient
                  ? "font-semibold text-text"
                  : "font-medium text-text"
              )}
            >
              {subject}
            </span>
            {relative ? (
              <span className="shrink-0 text-[11px] text-text-subtle">
                {relative}
              </span>
            ) : null}
          </div>
          <p className="mt-0.5 truncate text-xs text-text-muted">{preview}</p>
          {thread.status === "closed" ? (
            <Badge tone="neutral" className="mt-1">
              {thread.status_label}
            </Badge>
          ) : null}
        </div>
      </button>
    </li>
  );
}

export function ThreadList({
  activeThreadId,
  onSelectThread,
  onStartNew,
}: ThreadListProps) {
  const { t } = useTranslation();
  const { data, isError, error, isLoading } = useMessageThreads();
  const showLoading = useMinimumLoading(isLoading);
  const threads = data ?? [];

  return (
    <Card padded={false} className="flex h-full flex-col overflow-hidden">
      <div className="flex items-center justify-between gap-2 border-b border-border px-4 py-3">
        <h2 className="text-sm font-semibold tracking-tight text-text">
          {t("messages.conversationsHeading")}
        </h2>
        <Button
          variant="primary"
          size="sm"
          onClick={onStartNew}
          leadingIcon={<Plus size={14} aria-hidden="true" />}
        >
          {t("messages.newConversation")}
        </Button>
      </div>

      {isError ? (
        <p role="alert" className="px-4 py-4 text-sm text-danger">
          {getErrorMessage(error)}
        </p>
      ) : showLoading ? (
        <div className="flex-1" aria-busy="true">
          {[0, 1, 2].map((row) => (
            <div
              key={row}
              className="min-h-[68px] space-y-2 border-b border-border px-4 py-3 last:border-b-0"
            >
              <div className="flex items-baseline justify-between gap-2">
                <Skeleton className="h-4 w-36 max-w-full" />
                <Skeleton className="h-3 w-10" />
              </div>
              <Skeleton className="h-3 w-3/4" />
            </div>
          ))}
        </div>
      ) : isLoading ? (
        <div className="flex-1" aria-hidden="true" />
      ) : threads.length === 0 ? (
        <div className="p-4">
          <EmptyState icon={Inbox} title={t("messages.noThreads")} />
        </div>
      ) : (
        <ul className="flex-1 overflow-y-auto">
          {threads.map((thread) => (
            <ThreadRow
              key={thread.id}
              thread={thread}
              isActive={thread.id === activeThreadId}
              onSelect={() => onSelectThread(thread.id)}
              noSubjectLabel={t("messages.noSubject")}
              noPreviewLabel={t("messages.noMessagesYet")}
            />
          ))}
        </ul>
      )}
    </Card>
  );
}
