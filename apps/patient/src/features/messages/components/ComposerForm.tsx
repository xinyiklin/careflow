import { useEffect, useState } from "react";
import { X } from "lucide-react";

import { getErrorMessage } from "../../../shared/utils/errors";
import {
  useStartThread,
  type PortalMessageThreadDetail,
} from "../api/messaging";

const SUBJECT_MAX = 150;
const BODY_MAX = 4000;

type ComposerFormProps = {
  onClose: () => void;
  onCreated: (thread: PortalMessageThreadDetail) => void;
};

export function ComposerForm({ onClose, onCreated }: ComposerFormProps) {
  const startThread = useStartThread();
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [submitError, setSubmitError] = useState<string | null>(null);

  const trimmedSubject = subject.trim();
  const trimmedBody = body.trim();
  const canSubmit =
    trimmedSubject.length > 0 &&
    trimmedBody.length > 0 &&
    !startThread.isPending;

  const isPending = startThread.isPending;

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !isPending) onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, isPending]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!canSubmit) return;
    setSubmitError(null);
    try {
      const result = await startThread.mutateAsync({
        subject: trimmedSubject,
        body: trimmedBody,
      });
      if (!result) {
        setSubmitError("Could not start a new conversation.");
        return;
      }
      onCreated(result);
    } catch (err) {
      setSubmitError(getErrorMessage(err));
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="new-thread-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 py-6"
      onClick={(event) => {
        if (event.target === event.currentTarget && !isPending) {
          onClose();
        }
      }}
    >
      <div className="w-full max-w-md rounded-cf-shell border border-cf-border bg-cf-surface shadow-panel-lg">
        <header className="flex items-start justify-between gap-3 border-b border-cf-border px-5 py-4">
          <div className="min-w-0">
            <h2
              id="new-thread-title"
              className="text-base font-semibold text-cf-text"
            >
              New conversation
            </h2>
            <p className="mt-0.5 text-xs text-cf-text-muted">
              Send a secure message to your care team.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isPending}
            className="rounded-cf-control p-1 text-cf-text-muted transition hover:bg-cf-surface-soft hover:text-cf-text disabled:opacity-50"
            aria-label="Close"
          >
            <X size={16} />
          </button>
        </header>

        <form onSubmit={handleSubmit} className="space-y-4 px-5 py-5">
          <div>
            <label
              htmlFor="new-thread-subject"
              className="mb-1 block text-xs font-semibold text-cf-text-muted"
            >
              Subject
            </label>
            <input
              id="new-thread-subject"
              type="text"
              value={subject}
              onChange={(event) =>
                setSubject(event.target.value.slice(0, SUBJECT_MAX))
              }
              maxLength={SUBJECT_MAX}
              placeholder="What's this about?"
              className="w-full rounded-cf-control border border-cf-border bg-cf-surface px-3 py-2 text-sm text-cf-text focus:border-cf-accent focus:outline-none"
            />
            <p className="mt-1 text-right text-[10px] text-cf-text-subtle">
              {subject.length}/{SUBJECT_MAX}
            </p>
          </div>

          <div>
            <label
              htmlFor="new-thread-body"
              className="mb-1 block text-xs font-semibold text-cf-text-muted"
            >
              Message
            </label>
            <textarea
              id="new-thread-body"
              value={body}
              onChange={(event) =>
                setBody(event.target.value.slice(0, BODY_MAX))
              }
              rows={5}
              maxLength={BODY_MAX}
              placeholder="Share details with your care team…"
              className="w-full resize-none rounded-cf-control border border-cf-border bg-cf-surface px-3 py-2 text-sm text-cf-text focus:border-cf-accent focus:outline-none"
            />
            <p className="mt-1 text-right text-[10px] text-cf-text-subtle">
              {body.length}/{BODY_MAX}
            </p>
          </div>

          {submitError ? (
            <div
              role="alert"
              className="rounded-cf-control border border-cf-danger-text/30 bg-cf-danger-bg px-3 py-2 text-sm text-cf-danger-text"
            >
              {submitError}
            </div>
          ) : null}

          <div className="flex items-center justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              disabled={isPending}
              className="inline-flex items-center rounded-cf-control border border-cf-border bg-cf-surface px-3 py-1.5 text-xs font-semibold text-cf-text transition hover:bg-cf-surface-soft disabled:opacity-60"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!canSubmit}
              className="inline-flex items-center rounded-cf-control bg-cf-accent px-3 py-1.5 text-xs font-semibold text-cf-surface transition hover:bg-cf-accent-hover disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isPending ? "Sending…" : "Send message"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
