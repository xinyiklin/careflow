import { ShieldAlert } from "lucide-react";

export default function AdminAccessDenied() {
  return (
    <div className="flex h-full items-center justify-center px-6 py-6">
      <div className="w-full max-w-lg rounded-2xl border border-cf-danger-text bg-cf-danger-bg px-6 py-6 shadow-sm">
        <div className="flex items-start gap-3">
          <div className="rounded-2xl border border-cf-danger-text bg-cf-surface px-3 py-3 text-cf-danger-text">
            <ShieldAlert className="h-5 w-5" />
          </div>
          <div>
            <div className="text-sm font-semibold text-cf-danger-text">
              Access unavailable
            </div>
            <div className="mt-1 text-sm text-cf-danger-text">
              You do not have permission to access this workspace.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
