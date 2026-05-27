import { History } from "lucide-react";

import {
  Badge,
  Button,
  ModalShell,
  TimelineFeed,
} from "../../../shared/components/ui";

import type { TimelineEvent } from "../../../shared/components/ui";

type NoteHistoryModalProps = {
  isOpen: boolean;
  events: TimelineEvent[];
  timeZone?: string | null;
  onClose: () => void;
};

export default function NoteHistoryModal({
  isOpen,
  events,
  timeZone,
  onClose,
}: NoteHistoryModalProps) {
  return (
    <ModalShell
      isOpen={isOpen}
      onClose={onClose}
      eyebrow="Clinical Charting"
      title="Note History"
      description="Audit trail of changes to this progress note."
      maxWidth="lg"
      zIndex={100}
      footer={
        <Button
          type="button"
          variant="default"
          onClick={onClose}
          className="w-full sm:w-auto"
        >
          Close
        </Button>
      }
      footerClassName="justify-end"
    >
      <div className="space-y-5">
        <div className="flex items-center justify-between border-b border-cf-border pb-3">
          <div className="flex items-center gap-2 text-sm font-semibold text-cf-text">
            <History className="h-4.5 w-4.5 text-cf-text-subtle" />
            Change History
          </div>
          <Badge variant="outline">
            {`${events.length} event${events.length === 1 ? "" : "s"}`}
          </Badge>
        </div>

        {events.length ? (
          <TimelineFeed events={events} timeZone={timeZone} />
        ) : (
          <div className="rounded-2xl border border-cf-border bg-cf-surface-soft px-5 py-8 text-center text-sm text-cf-text-muted">
            No recorded transitions for this note yet.
          </div>
        )}
      </div>
    </ModalShell>
  );
}
