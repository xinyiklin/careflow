import { Check, LockKeyhole, NotebookPen, Trash2 } from "lucide-react";

import { Button, Input, ModalShell } from "./ui";

export default function PersonalNotesModal({
  isOpen,
  note,
  onChangeNote,
  onClearNote,
  onClose,
}) {
  const trimmedNote = note.trim();
  const wordCount = trimmedNote ? trimmedNote.split(/\s+/).length : 0;

  return (
    <ModalShell
      isOpen={isOpen}
      onClose={onClose}
      title="Personal Notes"
      maxWidth="3xl"
      zIndex={84}
      panelClassName="cf-notes-modal rounded-[var(--radius-cf-shell)]"
      bodyClassName="bg-cf-page-bg px-0 py-0"
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
      <div className="cf-notes-surface px-6 py-5">
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="cf-notes-icon">
              <NotebookPen className="h-5 w-5" />
            </div>
            <div>
              <div className="text-sm font-semibold text-cf-text">
                Scratchpad
              </div>
              <div className="mt-1 max-w-xl text-sm leading-6 text-cf-text-muted">
                Keep quick reminders, handoff thoughts, and workspace notes
                here.
              </div>
            </div>
          </div>

          <div className="cf-notes-chip">
            <LockKeyhole className="h-3.5 w-3.5" />
            User preference
          </div>
        </div>

        <div className="cf-notes-editor-card">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2 px-2">
            <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-cf-text-subtle">
              Private Note
            </div>
            <div className="flex items-center gap-2 text-xs text-cf-text-subtle">
              <span>{wordCount.toLocaleString()} words</span>
              <span className="h-1 w-1 rounded-full bg-cf-border-strong" />
              <span>{note.length.toLocaleString()} characters</span>
            </div>
          </div>

          <Input
            as="textarea"
            value={note}
            onChange={(event) => onChangeNote(event.target.value)}
            placeholder="Type anything you want to remember..."
            className="cf-notes-editor min-h-[24rem] resize-none border-cf-border px-4 py-4 leading-7 shadow-none"
            autoFocus
          />
        </div>
      </div>
    </ModalShell>
  );
}
