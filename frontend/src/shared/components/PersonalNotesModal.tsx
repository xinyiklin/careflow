import { useCallback, useRef } from "react";
import {
  Check,
  CheckSquare,
  Circle,
  ClipboardList,
  Clock,
  List,
  ListChecks,
  MessageSquareText,
  Minus,
  Trash2,
  UserRoundCheck,
} from "lucide-react";

import { Button, Input, ModalShell } from "./ui";

import type { LucideIcon } from "lucide-react";
import type { ChangeEvent } from "react";

type PersonalNotesModalProps = {
  isOpen: boolean;
  note: string;
  onChangeNote: (note: string) => void;
  onClearNote: () => void;
  onClose: () => void;
};

const NOTE_TEMPLATES: { label: string; icon: LucideIcon; body: string }[] = [
  { label: "Today", icon: ListChecks, body: "Today\n- " },
  {
    label: "Follow-up",
    icon: UserRoundCheck,
    body: "Follow-up\nPatient:\nNext step:\n",
  },
  {
    label: "Handoff",
    icon: ClipboardList,
    body: "Handoff\nContext:\nWatch for:\n",
  },
  {
    label: "Message",
    icon: MessageSquareText,
    body: "Message\nWho:\nWhat:\n",
  },
];

const INSERT_HELPERS: {
  label: string;
  icon: LucideIcon;
  getBody: () => string;
}[] = [
  {
    label: "Time",
    icon: Clock,
    getBody: () =>
      new Date().toLocaleString(undefined, {
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
      }),
  },
  { label: "Check", icon: CheckSquare, getBody: () => "☐ " },
  { label: "Bullet", icon: List, getBody: () => "• " },
  { label: "Divider", icon: Minus, getBody: () => "————————" },
];

export default function PersonalNotesModal({
  isOpen,
  note,
  onChangeNote,
  onClearNote,
  onClose,
}: PersonalNotesModalProps) {
  const editorRef = useRef<HTMLTextAreaElement | null>(null);
  const trimmedNote = note.trim();
  const wordCount = trimmedNote ? trimmedNote.split(/\s+/).length : 0;
  const characterCount = note.length;

  const insertAtCursor = useCallback(
    (text: string) => {
      const textarea = editorRef.current;

      if (!textarea) {
        const sep = note && !note.endsWith("\n") ? "\n" : "";
        onChangeNote(`${note}${sep}${text}`);
        return;
      }

      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const updated = note.slice(0, start) + text + note.slice(end);
      onChangeNote(updated);

      requestAnimationFrame(() => {
        textarea.focus();
        const pos = start + text.length;
        textarea.setSelectionRange(pos, pos);
      });
    },
    [note, onChangeNote]
  );

  const handleInsertTemplate = useCallback(
    (body: string) => {
      const separator = note && !note.endsWith("\n") ? "\n\n" : "";
      onChangeNote(`${note}${separator}${body}`);
      requestAnimationFrame(() => editorRef.current?.focus());
    },
    [note, onChangeNote]
  );

  return (
    <ModalShell
      isOpen={isOpen}
      onClose={onClose}
      eyebrow="Scratchpad"
      title="Personal Notes"
      maxWidth="4xl"
      bodyClassName="px-0 py-0"
      footerClassName="justify-between bg-cf-surface"
      footer={
        <>
          <div className="flex items-center gap-3">
            <Button
              type="button"
              variant="default"
              size="sm"
              onClick={onClearNote}
              disabled={!trimmedNote}
            >
              <Trash2 className="h-3.5 w-3.5" />
              Clear
            </Button>
            {trimmedNote && (
              <span className="text-xs tabular-nums text-cf-text-subtle">
                {wordCount} {wordCount === 1 ? "word" : "words"} ·{" "}
                {characterCount.toLocaleString()} chars
              </span>
            )}
          </div>
          <Button type="button" onClick={onClose}>
            <Check className="h-4 w-4" />
            Done
          </Button>
        </>
      }
    >
      <div className="grid min-h-[34rem] bg-cf-surface lg:grid-cols-[13.5rem_minmax(0,1fr)]">
        {/* ── Left rail ── */}
        <aside className="border-b border-cf-border bg-cf-surface-muted/45 px-4 py-4 lg:border-b-0 lg:border-r">
          <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-cf-text-subtle">
            Templates
          </div>
          <div className="mt-2 grid gap-0.5">
            {NOTE_TEMPLATES.map((t) => (
              <button
                key={t.label}
                type="button"
                onClick={() => handleInsertTemplate(t.body)}
                className="group flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm transition hover:bg-cf-surface"
              >
                <t.icon className="h-4 w-4 shrink-0 text-cf-text-subtle transition group-hover:text-cf-text" />
                <span className="font-medium text-cf-text-muted transition group-hover:text-cf-text">
                  {t.label}
                </span>
              </button>
            ))}
          </div>

          <div className="mt-4 border-t border-cf-border pt-4">
            <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-cf-text-subtle">
              Insert
            </div>
            <div className="mt-2.5 flex flex-wrap gap-1.5">
              {INSERT_HELPERS.map((h) => (
                <button
                  key={h.label}
                  type="button"
                  onClick={() => insertAtCursor(h.getBody())}
                  title={`Insert ${h.label.toLowerCase()}`}
                  className="flex items-center gap-1.5 rounded-lg border border-cf-border bg-cf-surface px-2 py-1.5 text-[11px] font-medium text-cf-text-muted transition hover:border-cf-border-strong hover:text-cf-text"
                >
                  <h.icon className="h-3 w-3" />
                  {h.label}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-4 hidden items-center gap-1.5 border-t border-cf-border pt-4 lg:flex">
            <Circle className="h-1.5 w-1.5 fill-cf-success-text text-cf-success-text" />
            <span className="text-[11px] font-medium text-cf-text-subtle">
              Autosaved to profile
            </span>
          </div>
        </aside>

        {/* ── Main editor ── */}
        <section className="flex min-h-0 flex-col p-5">
          <Input
            ref={editorRef}
            as="textarea"
            value={note}
            onChange={(event: ChangeEvent<HTMLTextAreaElement>) =>
              onChangeNote(event.target.value)
            }
            placeholder="Type anything you want to remember…"
            className="min-h-[30rem] flex-1 resize-none rounded-xl border-cf-border bg-cf-surface-muted px-4 py-4 text-[15px] leading-7 shadow-none focus:bg-cf-surface"
            autoFocus
          />
        </section>
      </div>
    </ModalShell>
  );
}
