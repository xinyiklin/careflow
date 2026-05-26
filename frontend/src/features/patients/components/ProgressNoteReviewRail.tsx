import { RotateCcw } from "lucide-react";

import { Badge, Button } from "../../../shared/components/ui";
import { formatDateTime } from "./PatientHubSections";
import { getProviderLabel } from "./progressNoteModalUtils";

import type {
  ClinicalEncounter,
  ProgressNoteFormValues,
} from "../../billing/types";
import type { PatientCareProvider } from "../types";

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
  const signedAt = encounter?.progress_note?.signed_at || "";
  const updatedAt =
    encounter?.progress_note?.updated_at || encounter?.updated_at || "";

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

        {!isSigned && canEditDraft && isDirty ? (
          <Button type="button" size="sm" variant="default" onClick={onReset}>
            <RotateCcw className="h-3.5 w-3.5" />
            Reset Changes
          </Button>
        ) : null}
      </div>
    </aside>
  );
}
