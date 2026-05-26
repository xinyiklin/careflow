import { useRef } from "react";

import { PatientHubContent } from "../PatientHubContent";
import {
  useLatestOpenValue,
  useModalPresence,
} from "../../../shared/hooks/useModalPresence";
import useModalFocusTrap from "../../../shared/hooks/useModalFocusTrap";
import type { MouseEvent } from "react";
import type { EntityId } from "../../../shared/api/types";
import type { PatientHubTabKey } from "../types";

export default function PatientHubModal({
  isOpen,
  patientId,
  initialTab,
  onClose,
}: {
  isOpen: boolean;
  patientId?: EntityId | null;
  initialTab?: PatientHubTabKey;
  onClose: () => void;
}) {
  const panelRef = useRef<HTMLDivElement>(null);
  const { isClosing, shouldRender } = useModalPresence(isOpen);
  const { handlePanelKeyDown } = useModalFocusTrap(panelRef, isOpen, onClose);
  const displayedState = useLatestOpenValue(
    {
      initialTab,
      patientId,
    },
    isOpen && Boolean(patientId)
  );

  if (!shouldRender || !displayedState.patientId) return null;

  return (
    <div
      className={[
        "cf-modal-backdrop fixed inset-0 z-[65] flex items-center justify-center bg-black/45 px-4 py-4",
        isClosing ? "is-closing" : "is-opening",
      ].join(" ")}
      onClick={onClose}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label="Patient Hub"
        tabIndex={-1}
        onKeyDown={handlePanelKeyDown}
        className={[
          "cf-modal-panel relative flex h-[95dvh] w-full max-w-[min(1720px,96vw)] flex-col overflow-hidden rounded-[var(--radius-cf-shell)] border border-cf-border bg-cf-page-bg shadow-[var(--shadow-panel-lg)]",
          isClosing ? "is-closing" : "is-opening",
        ].join(" ")}
        onClick={(event: MouseEvent<HTMLDivElement>) => event.stopPropagation()}
      >
        <div className="min-h-0 flex-1">
          <PatientHubContent
            patientId={displayedState.patientId}
            initialTab={displayedState.initialTab}
            onClose={onClose}
          />
        </div>
      </div>
    </div>
  );
}
