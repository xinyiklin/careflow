import { useEffect, useMemo, useRef, useState } from "react";
import { ArchiveRestore, Lock, MessageSquare } from "lucide-react";

import { Badge, Button, EmptyState } from "../../../shared/components/ui";
import useMinimumLoading from "../../../shared/hooks/useMinimumLoading";
import {
  useCloseThread,
  useMessageThread,
  useReopenThread,
  useReplyToThread,
} from "../api/messaging";
import MessageBubble from "./MessageBubble";
import ReplyComposer from "./ReplyComposer";

import type { EntityId } from "../../../shared/api/types";

type ThreadDetailPanelProps = {
  facilityId: EntityId | null;
  threadId: number | null;
  canRespond: boolean;
};

function getErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message) return error.message;
  if (typeof error === "string" && error) return error;
  return fallback;
}

export default function ThreadDetailPanel({
  facilityId,
  threadId,
  canRespond,
}: ThreadDetailPanelProps) {
  const detailQuery = useMessageThread({ threadId, facilityId });
  const showDetailLoading = useMinimumLoading(detailQuery.isLoading);
  const replyMutation = useReplyToThread({ facilityId });
  const closeMutation = useCloseThread({ facilityId });
  const reopenMutation = useReopenThread({ facilityId });

  const [replyError, setReplyError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement | null>(null);

  const data = detailQuery.data;
  const messageCount = data?.messages?.length ?? 0;

  // Auto-scroll to newest message when the conversation updates or opens.
  useEffect(() => {
    if (!data) return;
    endRef.current?.scrollIntoView({ block: "end" });
  }, [data, messageCount]);

  useEffect(() => {
    setReplyError(null);
    setActionError(null);
  }, [threadId]);

  const isClosed = data?.status === "closed";

  const handleReply = async (body: string) => {
    if (!data) return;
    setReplyError(null);
    try {
      await replyMutation.mutateAsync({
        threadId: data.id,
        values: { body },
      });
    } catch (error) {
      setReplyError(
        getErrorMessage(error, "Could not send reply. Please try again.")
      );
      throw error;
    }
  };

  const handleClose = async () => {
    if (!data) return;
    setActionError(null);
    try {
      await closeMutation.mutateAsync({ threadId: data.id });
    } catch (error) {
      setActionError(
        getErrorMessage(error, "Could not close the conversation.")
      );
    }
  };

  const handleReopen = async () => {
    if (!data) return;
    setActionError(null);
    try {
      await reopenMutation.mutateAsync({ threadId: data.id });
    } catch (error) {
      setActionError(
        getErrorMessage(error, "Could not reopen the conversation.")
      );
    }
  };

  const sortedMessages = useMemo(() => data?.messages ?? [], [data?.messages]);

  if (threadId === null) {
    return (
      <div className="flex h-full min-h-0 flex-1 items-center justify-center bg-cf-surface-muted/30 p-6">
        <EmptyState
          title="Select a conversation"
          body="Choose a thread from the inbox to read messages and reply."
        />
      </div>
    );
  }

  if (showDetailLoading) {
    return (
      <div className="flex h-full min-h-0 flex-1 items-center justify-center bg-cf-surface-muted/30 px-6 text-sm text-cf-text-muted">
        Loading conversation…
      </div>
    );
  }

  if (detailQuery.isLoading) {
    return (
      <div className="flex h-full min-h-0 flex-1 items-center justify-center bg-cf-surface-muted/30 px-6" />
    );
  }

  if (detailQuery.isError || !data) {
    return (
      <div className="flex h-full min-h-0 flex-1 flex-col items-center justify-center gap-3 bg-cf-surface-muted/30 px-6 text-sm text-cf-text-muted">
        <p>
          {detailQuery.isError
            ? getErrorMessage(
                detailQuery.error,
                "Could not load this conversation."
              )
            : "Conversation not found."}
        </p>
        <Button type="button" size="sm" onClick={() => detailQuery.refetch()}>
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col bg-cf-surface">
      <header className="flex flex-wrap items-start justify-between gap-3 border-b border-cf-border bg-cf-surface px-5 py-3.5">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="truncate text-base font-semibold text-cf-text">
              {data.patient_display_name}
            </h2>
            <Badge variant={isClosed ? "muted" : "success"} size="sm">
              {data.status_label || (isClosed ? "Closed" : "Open")}
            </Badge>
          </div>
          <p className="mt-0.5 truncate text-sm text-cf-text-muted">
            {data.subject || "(no subject)"}
          </p>
        </div>

        {canRespond ? (
          <div className="flex items-center gap-2">
            {isClosed ? (
              <Button
                type="button"
                size="sm"
                variant="default"
                onClick={handleReopen}
                disabled={reopenMutation.isPending}
              >
                <ArchiveRestore className="h-3.5 w-3.5" />
                {reopenMutation.isPending ? "Reopening…" : "Reopen"}
              </Button>
            ) : (
              <Button
                type="button"
                size="sm"
                variant="default"
                onClick={handleClose}
                disabled={closeMutation.isPending}
              >
                <Lock className="h-3.5 w-3.5" />
                {closeMutation.isPending ? "Closing…" : "Close"}
              </Button>
            )}
          </div>
        ) : null}
      </header>

      {actionError ? (
        <div
          role="alert"
          className="border-b border-cf-danger-text/20 bg-cf-danger-bg px-5 py-2 text-xs text-cf-danger-text"
        >
          {actionError}
        </div>
      ) : null}

      <div className="min-h-0 flex-1 overflow-y-auto bg-cf-surface-muted/30">
        {sortedMessages.length === 0 ? (
          <div className="flex h-full items-center justify-center px-6 py-10 text-center text-sm text-cf-text-muted">
            No messages yet.
          </div>
        ) : (
          <ul className="flex flex-col gap-3 px-5 py-5">
            {sortedMessages.map((message) => (
              <MessageBubble key={message.id} message={message} />
            ))}
            <div ref={endRef} />
          </ul>
        )}
      </div>

      {canRespond && !isClosed ? (
        <ReplyComposer
          pending={replyMutation.isPending}
          onSubmit={handleReply}
          errorMessage={replyError}
        />
      ) : (
        <div className="flex items-center gap-2 border-t border-cf-border bg-cf-surface-soft px-5 py-3 text-xs text-cf-text-muted">
          {isClosed ? (
            <>
              <Lock className="h-3.5 w-3.5" />
              <span>
                This conversation is closed.
                {canRespond ? " Reopen to send a reply." : ""}
              </span>
            </>
          ) : (
            <>
              <MessageSquare className="h-3.5 w-3.5" />
              <span>
                You do not have permission to respond to this conversation.
              </span>
            </>
          )}
        </div>
      )}
    </div>
  );
}
