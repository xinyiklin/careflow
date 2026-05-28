import { useEffect, useRef, useState } from "react";
import { ArrowLeft, Send } from "lucide-react";

import { Badge } from "../../../shared/components/ui/Badge";
import { EmptyState } from "../../../shared/components/ui/EmptyState";
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

function MessagesList({ messages }: { messages: PortalMessage[] }) {
  const endRef = useRef<HTMLDivElement | null>(null);

  // Auto-scroll to newest message whenever the list updates.
  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [messages.length]);

  if (messages.length === 0) {
    return (
      <div className="px-4 py-8 text-center text-sm text-cf-text-muted">
        No messages yet.
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
      <div className="border-t border-cf-border bg-cf-surface-soft px-4 py-3 text-xs text-cf-text-muted">
        This conversation is closed. Start a new one to keep talking.
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="border-t border-cf-border bg-cf-surface px-4 py-3"
    >
      <label htmlFor="reply-body" className="sr-only">
        Reply
      </label>
      <textarea
        id="reply-body"
        value={body}
        onChange={(event) => setBody(event.target.value.slice(0, REPLY_MAX))}
        rows={3}
        maxLength={REPLY_MAX}
        placeholder="Write a reply…"
        className="w-full resize-none rounded-cf-control border border-cf-border bg-cf-surface px-3 py-2 text-sm text-cf-text focus:border-cf-accent focus:outline-none"
      />
      {submitError ? (
        <p role="alert" className="mt-1 text-[11px] text-cf-danger-text">
          {submitError}
        </p>
      ) : null}
      <div className="mt-2 flex items-center justify-between gap-2">
        <p className="text-[10px] text-cf-text-subtle">
          {body.length}/{REPLY_MAX}
        </p>
        <button
          type="submit"
          disabled={!canSend}
          className="inline-flex items-center gap-1.5 rounded-cf-control bg-cf-accent px-3 py-1.5 text-xs font-semibold text-cf-surface transition hover:bg-cf-accent-hover disabled:cursor-not-allowed disabled:opacity-60"
        >
          <Send size={12} aria-hidden="true" />
          {reply.isPending ? "Sending…" : "Send"}
        </button>
      </div>
    </form>
  );
}

export function Conversation({ threadId, onBack }: ConversationProps) {
  const { data, isLoading, isError, error } = useMessageThread(threadId);

  if (threadId === null) {
    return (
      <div className="flex h-full items-center justify-center">
        <EmptyState message="Select a conversation to read messages." />
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-cf-text-muted">
        Loading…
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="flex h-full items-center justify-center px-4 text-sm text-cf-text-muted">
        {isError ? getErrorMessage(error) : "Conversation not found."}
      </div>
    );
  }

  const isClosed = data.status === "closed";

  return (
    <div className="flex h-full flex-col">
      <header className="flex items-start gap-2 border-b border-cf-border bg-cf-surface px-4 py-3">
        {onBack ? (
          <button
            type="button"
            onClick={onBack}
            aria-label="Back to thread list"
            className="rounded-cf-control p-1 text-cf-text-muted transition hover:bg-cf-surface-soft hover:text-cf-text lg:hidden"
          >
            <ArrowLeft size={16} />
          </button>
        ) : null}
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-sm font-semibold text-cf-text">
            {data.subject || "(no subject)"}
          </h2>
        </div>
        {isClosed ? <Badge tone="neutral">{data.status_label}</Badge> : null}
      </header>

      <div className="flex-1 overflow-y-auto bg-cf-page-bg">
        <MessagesList messages={data.messages} />
      </div>

      <ReplyComposer threadId={data.id} disabled={isClosed} />
    </div>
  );
}
