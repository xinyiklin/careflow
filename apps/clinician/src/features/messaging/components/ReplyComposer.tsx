import { useState } from "react";
import { Send } from "lucide-react";

import { Button } from "../../../shared/components/ui";

const REPLY_MAX = 4000;

type ReplyComposerProps = {
  pending: boolean;
  onSubmit: (body: string) => Promise<void> | void;
  errorMessage?: string | null;
};

export default function ReplyComposer({
  pending,
  onSubmit,
  errorMessage = null,
}: ReplyComposerProps) {
  const [body, setBody] = useState("");

  const trimmed = body.trim();
  const canSend = trimmed.length > 0 && !pending;

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!canSend) return;
    await onSubmit(trimmed);
    setBody("");
  };

  const handleCancel = () => {
    setBody("");
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="border-t border-cf-border bg-cf-surface px-5 py-4"
    >
      <label htmlFor="messaging-reply-body" className="sr-only">
        Reply
      </label>
      <textarea
        id="messaging-reply-body"
        value={body}
        onChange={(event) => setBody(event.target.value.slice(0, REPLY_MAX))}
        rows={3}
        maxLength={REPLY_MAX}
        disabled={pending}
        placeholder="Write a reply…"
        className="w-full resize-none rounded-xl border border-cf-border bg-cf-surface px-3 py-2 text-sm text-cf-text outline-none transition focus:border-cf-accent focus:ring-2 focus:ring-cf-accent/15 disabled:cursor-not-allowed disabled:opacity-60"
      />
      {errorMessage ? (
        <p role="alert" className="mt-1.5 text-xs text-cf-danger-text">
          {errorMessage}
        </p>
      ) : null}
      <div className="mt-2 flex items-center justify-between gap-2">
        <p className="text-[11px] text-cf-text-subtle">
          {body.length}/{REPLY_MAX}
        </p>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            size="sm"
            variant="default"
            onClick={handleCancel}
            disabled={pending || body.length === 0}
          >
            Cancel
          </Button>
          <Button type="submit" size="sm" variant="primary" disabled={!canSend}>
            <Send className="h-3.5 w-3.5" />
            {pending ? "Sending…" : "Send reply"}
          </Button>
        </div>
      </div>
    </form>
  );
}
