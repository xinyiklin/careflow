import { useMemo, useState } from "react";
import {
  CheckCircle2,
  ClipboardList,
  FilePen,
  History,
  RotateCcw,
} from "lucide-react";

import { Badge, Button } from "../../../shared/components/ui";
import { formatDateTime } from "./PatientHubSections";
import NoteHistoryModal from "./NoteHistoryModal";
import { getProviderLabel } from "./progressNoteModalUtils";

import type {
  ClinicalEncounter,
  ProgressNoteFormValues,
} from "../../billing/types";
import type { PatientCareProvider } from "../types";
import type { TimelineEvent } from "../../../shared/components/ui";

export default function ProgressNoteReviewRail({
  values,
  encounter,
  isSigned,
  isDirty,
  canEditDraft,
  hasNoteContent,
  completedSoapCount,
  selectedProvider,
  onReset,
}: {
  values: ProgressNoteFormValues;
  encounter?: ClinicalEncounter | null;
  isSigned: boolean;
  isDirty: boolean;
  canEditDraft: boolean;
  hasNoteContent: boolean;
  completedSoapCount: number;
  selectedProvider?: PatientCareProvider;
  onReset: () => void;
}) {
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const signedAt = encounter?.progress_note?.signed_at || "";
  const updatedAt =
    encounter?.progress_note?.updated_at || encounter?.updated_at || "";
  const encounterOpenedAt =
    encounter?.started_at || encounter?.created_at || "";
  const noteCreatedAt = encounter?.progress_note?.created_at || "";
  const signedByName = encounter?.progress_note?.signed_by_name || "";

  const historyEvents = useMemo<TimelineEvent[]>(() => {
    const events: TimelineEvent[] = [];

    if (encounterOpenedAt) {
      events.push({
        id: "encounter-opened",
        occurredAt: encounterOpenedAt,
        title: "Encounter opened",
        icon: ClipboardList,
        tone: "accent",
      });
    }

    if (noteCreatedAt && noteCreatedAt !== encounterOpenedAt) {
      events.push({
        id: "note-drafted",
        occurredAt: noteCreatedAt,
        title: "Draft started",
        icon: FilePen,
        tone: "muted",
      });
    }

    if (updatedAt && updatedAt !== noteCreatedAt && updatedAt !== signedAt) {
      events.push({
        id: "note-updated",
        occurredAt: updatedAt,
        title: "Draft saved",
        icon: FilePen,
        tone: "warning",
      });
    }

    if (signedAt) {
      events.push({
        id: "note-signed",
        occurredAt: signedAt,
        title: "Progress note signed",
        subtitle: signedByName ? `Signed by ${signedByName}` : null,
        icon: CheckCircle2,
        tone: "success",
        badge: { label: "Signed", variant: "success" },
      });
    }

    return events.sort((a, b) => {
      const aTime = new Date(a.occurredAt).getTime();
      const bTime = new Date(b.occurredAt).getTime();
      if (Number.isNaN(aTime) || Number.isNaN(bTime)) return 0;
      return bTime - aTime;
    });
  }, [encounterOpenedAt, noteCreatedAt, signedAt, signedByName, updatedAt]);

  return (
    <aside className="border-t border-cf-border bg-cf-surface px-5 py-4 xl:border-l xl:border-t-0">
      <div className="space-y-5">
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-3">
            <div className="text-xs font-semibold uppercase tracking-[0.12em] text-cf-text-subtle">
              Review
            </div>
            <Badge
              variant={isSigned ? "success" : isDirty ? "outline" : "muted"}
            >
              {isSigned ? "Signed" : isDirty ? "Unsaved" : "Saved"}
            </Badge>
          </div>
          <div className="text-sm text-cf-text-muted">
            {completedSoapCount}/4 SOAP sections filled
          </div>
        </div>

        <div className="space-y-2 text-sm">
          <div className="flex items-center justify-between gap-3 border-b border-cf-border py-2">
            <span className="text-cf-text-muted">SOAP content</span>
            <span
              className={
                hasNoteContent
                  ? "font-semibold text-cf-success-text"
                  : "font-semibold text-cf-warning-text"
              }
            >
              {hasNoteContent ? "Ready" : "Needed"}
            </span>
          </div>
          <div className="flex items-center justify-between gap-3 border-b border-cf-border py-2">
            <span className="text-cf-text-muted">Provider</span>
            <span className="truncate font-semibold text-cf-text">
              {selectedProvider
                ? getProviderLabel(selectedProvider)
                : "Not set"}
            </span>
          </div>
          <div className="flex items-center justify-between gap-3 border-b border-cf-border py-2">
            <span className="text-cf-text-muted">Visit reason</span>
            <span className="font-semibold text-cf-text">
              {values.reason.trim() ? "Entered" : "Not set"}
            </span>
          </div>
          <div className="flex items-center justify-between gap-3 border-b border-cf-border py-2">
            <span className="text-cf-text-muted">Last updated</span>
            <span className="font-semibold text-cf-text">
              {updatedAt ? formatDateTime(updatedAt) : "Not saved"}
            </span>
          </div>
          {signedAt ? (
            <div className="flex items-center justify-between gap-3 border-b border-cf-border py-2">
              <span className="text-cf-text-muted">Signed</span>
              <span className="font-semibold text-cf-text">
                {formatDateTime(signedAt)}
              </span>
            </div>
          ) : null}
        </div>

        {historyEvents.length >= 2 ? (
          <Button
            type="button"
            size="sm"
            variant="default"
            onClick={() => setIsHistoryOpen(true)}
          >
            <History className="h-3.5 w-3.5" />
            Note History
          </Button>
        ) : null}

        {!isSigned && canEditDraft && isDirty ? (
          <Button type="button" size="sm" variant="default" onClick={onReset}>
            <RotateCcw className="h-3.5 w-3.5" />
            Reset Changes
          </Button>
        ) : null}
      </div>

      <NoteHistoryModal
        isOpen={isHistoryOpen}
        events={historyEvents}
        onClose={() => setIsHistoryOpen(false)}
      />
    </aside>
  );
}
