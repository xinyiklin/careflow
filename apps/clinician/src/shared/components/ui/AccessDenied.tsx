import { ShieldAlert } from "lucide-react";

type AccessDeniedProps = {
  message?: string;
};

// Flat, centered permission state rendered inside the route frame. The frame
// already owns the card feel, so this stays unframed.
export default function AccessDenied({
  message = "You do not have permission to view this workspace.",
}: AccessDeniedProps) {
  return (
    <div className="flex h-full items-center justify-center p-6">
      <div className="flex max-w-sm flex-col items-center text-center">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-cf-surface-soft text-cf-text-subtle">
          <ShieldAlert className="h-5 w-5" aria-hidden="true" />
        </span>
        <div className="mt-3 text-sm font-semibold text-cf-text">
          Access unavailable
        </div>
        <p className="mt-1 text-sm text-cf-text-muted">{message}</p>
      </div>
    </div>
  );
}
