import { useEffect, useRef, useState } from "react";
import { ArrowLeft, MessageSquare, Send } from "lucide-react";
import { useTranslation } from "react-i18next";

import useMinimumLoading from "../../../shared/hooks/useMinimumLoading";
import {
  Badge,
  Button,
  Card,
  EmptyState,
  Skeleton,
  Textarea,
  cn,
} from "../../../shared/ui";
import { getErrorMessage } from "../../../shared/utils/errors";
import {
  useMessageThread,
  useReplyToThread,
  type PortalMessage,
} from "../api/messaging";
import { MessageBubble } from "./MessageBubble";

const REPLY_MAX = 4000;

type ConversationProps = {
  threadId: number | null;
  onBack?: () => void;
};

function MessagesList({
  messages,
  emptyLabel,
}: {
  messages: PortalMessage[];
  emptyLabel: string;
}) {
  const endRef = useRef<HTMLDivElement | null>(null);

  // Auto-scroll to newest message whenever the list updates.
  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [messages.length]);

  if (messages.length === 0) {
    return (
      <div className="px-4 py-8 text-center text-sm text-text-muted">
        {emptyLabel}
      </div>
    );
  }

  return (
    <ul className="flex flex-col gap-3 px-4 py-4">
      {messages.map((message) => (
        <MessageBubble key={message.id} message={message} />
      ))}
      <div ref={endRef} />
    </ul>
  );
}

function ReplyComposer({
  threadId,
  disabled,
}: {
  threadId: number;
  disabled: boolean;
}) {
  const { t } = useTranslation();
  const reply = useReplyToThread(threadId);
  const [body, setBody] = useState("");
  const [submitError, setSubmitError] = useState<string | null>(null);

  const trimmed = body.trim();
  const canSend = !disabled && trimmed.length > 0 && !reply.isPending;

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!canSend) return;
    setSubmitError(null);
    try {
      await reply.mutateAsync({ body: trimmed });
      setBody("");
    } catch (err) {
      setSubmitError(getErrorMessage(err));
    }
  };

  if (disabled) {
    return (
      <div className="border-t border-border bg-surface-soft px-4 py-3 text-xs text-text-muted">
        {t("messages.threadClosed")}
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="border-t border-border bg-surface px-4 py-3"
    >
      <label htmlFor={`reply-body-${threadId}`} className="sr-only">
        {t("messages.replyLabel")}
      </label>
      <Textarea
        id={`reply-body-${threadId}`}
        value={body}
        onChange={(event) => setBody(event.target.value.slice(0, REPLY_MAX))}
        rows={3}
        maxLength={REPLY_MAX}
        placeholder={t("messages.replyPlaceholder")}
      />
      {submitError ? (
        <p role="alert" className="mt-1 text-xs text-danger">
          {submitError}
        </p>
      ) : null}
      <div className="mt-2 flex items-center justify-between gap-2">
        <p className="text-[11px] text-text-subtle">
          {body.length}/{REPLY_MAX}
        </p>
        <Button
          type="submit"
          variant="primary"
          size="sm"
          disabled={!canSend}
          isLoading={reply.isPending}
          leadingIcon={<Send size={13} aria-hidden="true" />}
        >
          {t("messages.send")}
        </Button>
      </div>
    </form>
  );
}

export function Conversation({ threadId, onBack }: ConversationProps) {
  const { t } = useTranslation();
  const { data, isLoading, isError, error } = useMessageThread(threadId);
  const showLoading = useMinimumLoading(isLoading);

  if (threadId === null) {
    return (
      <Card padded={false} className="flex h-full items-center justify-center">
        <div className="p-6">
          <EmptyState
            icon={MessageSquare}
            title={t("messages.selectThreadTitle")}
            description={t("messages.selectThreadBody")}
          />
        </div>
      </Card>
    );
  }

  if (showLoading) {
    return (
      <Card
        padded={false}
        aria-busy="true"
        className="flex h-full flex-col overflow-hidden"
      >
        <div className="flex items-center border-b border-border bg-surface px-4 py-3">
          <Skeleton className="h-5 w-48 max-w-full" />
        </div>
        <div className="flex-1 space-y-3 bg-bg px-4 py-4">
          <Skeleton className="h-14 w-3/5 rounded-lg" />
          <Skeleton className="ml-auto h-11 w-1/2 rounded-lg" />
          <Skeleton className="h-11 w-2/5 rounded-lg" />
        </div>
      </Card>
    );
  }

  if (isLoading) {
    return <Card padded={false} className="h-full" />;
  }

  if (isError || !data) {
    return (
      <Card
        padded={false}
        className="flex h-full items-center justify-center px-4 text-sm text-text-muted"
      >
        {isError ? getErrorMessage(error) : t("messages.threadNotFound")}
      </Card>
    );
  }

  const isClosed = data.status === "closed";

  return (
    <Card padded={false} className="flex h-full flex-col overflow-hidden">
      <header className="flex items-center gap-2 border-b border-border bg-surface px-4 py-3">
        {onBack ? (
          <button
            type="button"
            onClick={onBack}
            aria-label={t("messages.backToList")}
            className={cn(
              "inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md",
              "text-text-muted hover:bg-surface-soft hover:text-text",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/35",
              "md:hidden"
            )}
          >
            <ArrowLeft size={16} />
          </button>
        ) : null}
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-sm font-semibold tracking-tight text-text">
            {data.subject?.trim() || t("messages.noSubject")}
          </h2>
        </div>
        {isClosed ? (
          <Badge tone="neutral">{data.status_label}</Badge>
        ) : (
          <Badge tone="accent">{data.status_label}</Badge>
        )}
      </header>

      <div className="flex-1 overflow-y-auto bg-bg">
        <MessagesList
          messages={data.messages}
          emptyLabel={t("messages.noMessagesYet")}
        />
      </div>

      <ReplyComposer threadId={data.id} disabled={isClosed} />
    </Card>
  );
}
