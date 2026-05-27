import { AlertTriangle, FolderOpen } from "lucide-react";

import { Button } from "../../../shared/components/ui";

export default function BillingListFeedback({
  kind,
  searchTerm,
  onRetry,
}: {
  kind: "loading" | "error" | "empty";
  searchTerm?: string;
  onRetry?: () => void;
}) {
  if (kind === "loading") {
    return null;
  }

  if (kind === "error") {
    return (
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-cf-border bg-cf-surface px-4 py-3">
        <div className="flex min-w-0 items-start gap-3">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-cf-warning-text" />
          <div>
            <div className="text-sm font-semibold text-cf-text">
              Couldn&apos;t load data
            </div>
            <div className="text-sm text-cf-text-muted">
              Check your connection and try again.
            </div>
          </div>
        </div>
        {onRetry ? (
          <Button type="button" size="sm" onClick={onRetry}>
            Retry
          </Button>
        ) : null}
      </div>
    );
  }

  return (
    <div className="cf-ui-panel py-8 text-center text-sm text-cf-text-muted">
      {searchTerm ? (
        "No items match the current filters."
      ) : (
        <>
          <FolderOpen className="mx-auto mb-2 h-8 w-8 text-cf-text-subtle" />
          No items in this queue.
        </>
      )}
    </div>
  );
}
