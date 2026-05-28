import { RotateCw } from "lucide-react";

type RefillRequestButtonProps = {
  hasPendingRequest: boolean;
  onClick: () => void;
};

export function RefillRequestButton({
  hasPendingRequest,
  onClick,
}: RefillRequestButtonProps) {
  if (hasPendingRequest) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-cf-control bg-cf-warning-bg px-2.5 py-1 text-[11px] font-semibold text-cf-warning-text">
        <RotateCw size={11} aria-hidden="true" />
        Refill requested
      </span>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-1.5 rounded-cf-control border border-cf-border bg-cf-surface px-2.5 py-1 text-[11px] font-semibold text-cf-text-muted transition hover:bg-cf-surface-soft hover:text-cf-text"
    >
      <RotateCw size={11} aria-hidden="true" />
      Request refill
    </button>
  );
}
