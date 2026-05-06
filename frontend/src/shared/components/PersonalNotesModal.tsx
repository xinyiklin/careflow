import { useRef } from "react";
import {
  Check,
  ClipboardList,
  ListChecks,
  MessageSquareText,
  Trash2,
  UserRoundCheck,
} from "lucide-react";

import { Button, Input, ModalShell } from "./ui";

import type { LucideIcon } from "lucide-react";
import type { ChangeEvent } from "react";

type TemplateButtonProps = {
  icon: LucideIcon;
  label: string;
  onClick: () => void;
};

type PersonalNotesModalProps = {
  isOpen: boolean;
  note: string;
  onChangeNote: (note: string) => void;
  onClearNote: () => void;
  onClose: () => void;
};

const NOTE_TEMPLATES = [
  {
    label: "Today",
    icon: ListChecks,
    body: "Today\n- ",
  },
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

function TemplateButton({ icon: Icon, label, onClick }: TemplateButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex min-h-10 w-full items-center gap-2 rounded-lg border border-cf-border bg-cf-surface px-3 text-left text-sm font-semibold text-cf-text-muted transition hover:border-cf-border-strong hover:text-cf-text"
    >
      <Icon className="h-4 w-4 shrink-0 text-cf-text-subtle" />
      <span>{label}</span>
    </button>
  );
}

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
  const lineCount = note ? note.split(/\r\n|\r|\n/).length : 0;

  const handleInsertTemplate = (templateBody: string) => {
    const separator = note && !note.endsWith("\n") ? "\n\n" : "";
    onChangeNote(`${note}${separator}${templateBody}`);
    requestAnimationFrame(() => editorRef.current?.focus());
  };

  return (
    <ModalShell
      isOpen={isOpen}
      onClose={onClose}
      title="Personal Notes"
      maxWidth="4xl"
      bodyClassName="px-0 py-0"
      footerClassName="justify-between bg-cf-surface"
      footer={
        <>
          <Button
            type="button"
            variant="default"
            onClick={onClearNote}
            disabled={!trimmedNote}
          >
            <Trash2 className="h-4 w-4" />
            Clear
          </Button>
          <Button type="button" onClick={onClose}>
            <Check className="h-4 w-4" />
            Done
          </Button>
        </>
      }
    >
      <div className="grid min-h-[34rem] bg-cf-surface lg:grid-cols-[15rem_minmax(0,1fr)]">
        <aside className="border-b border-cf-border bg-cf-surface-muted/45 px-5 py-4 lg:border-b-0 lg:border-r">
          <div className="flex flex-wrap items-start justify-between gap-3 lg:block">
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-cf-text-subtle">
                Scratchpad
              </div>
              <div className="mt-1 text-sm font-semibold text-cf-text">
                Autosaves
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 text-xs font-semibold text-cf-text-muted lg:mt-4 lg:grid-cols-1">
              <div className="rounded-lg border border-cf-border bg-cf-surface px-2.5 py-2">
                <div className="text-cf-text">{wordCount.toLocaleString()}</div>
                <div className="text-[10px] uppercase tracking-[0.14em] text-cf-text-subtle">
                  Words
                </div>
              </div>
              <div className="rounded-lg border border-cf-border bg-cf-surface px-2.5 py-2">
                <div className="text-cf-text">
                  {characterCount.toLocaleString()}
                </div>
                <div className="text-[10px] uppercase tracking-[0.14em] text-cf-text-subtle">
                  Chars
                </div>
              </div>
              <div className="rounded-lg border border-cf-border bg-cf-surface px-2.5 py-2">
                <div className="text-cf-text">{lineCount.toLocaleString()}</div>
                <div className="text-[10px] uppercase tracking-[0.14em] text-cf-text-subtle">
                  Lines
                </div>
              </div>
            </div>
          </div>

          <div className="mt-4 border-t border-cf-border pt-4">
            <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-cf-text-subtle">
              Quick Starts
            </div>
            <div className="mt-2 grid gap-2">
              {NOTE_TEMPLATES.map((template) => (
                <TemplateButton
                  key={template.label}
                  icon={template.icon}
                  label={template.label}
                  onClick={() => handleInsertTemplate(template.body)}
                />
              ))}
            </div>
          </div>
        </aside>

        <section className="flex min-h-0 flex-col px-5 py-5">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3 border-b border-cf-border pb-3">
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-cf-text-subtle">
                Active Note
              </div>
              <div className="mt-1 text-sm font-semibold text-cf-text">
                Saved to profile preferences
              </div>
            </div>
            <div className="rounded-full border border-cf-border bg-cf-surface-muted px-3 py-1 text-xs font-semibold text-cf-text-muted">
              Single workspace note
            </div>
          </div>

          <Input
            ref={editorRef}
            as="textarea"
            value={note}
            onChange={(event: ChangeEvent<HTMLTextAreaElement>) =>
              onChangeNote(event.target.value)
            }
            placeholder="Type anything you want to remember..."
            className="min-h-[27rem] flex-1 resize-none rounded-xl border-cf-border bg-cf-surface-muted px-4 py-4 text-[15px] leading-7 shadow-none focus:bg-cf-surface"
            autoFocus
          />
        </section>
      </div>
    </ModalShell>
  );
}
