import { Pencil, Shield, ShieldCheck, Users } from "lucide-react";

export default function RoleTypeCard({
  name,
  code,
  description,
  typeBadge,
  memberCount,
  memberLabel = "staff",
  allowedCount,
  totalPermissions,
  onEdit,
}: {
  name: string;
  code?: string;
  description?: string;
  typeBadge: "System" | "Custom";
  memberCount?: number;
  memberLabel?: string;
  allowedCount?: number;
  totalPermissions?: number;
  onEdit?: () => void;
}) {
  const isSystem = typeBadge === "System";
  const hasStats = allowedCount !== undefined && totalPermissions !== undefined;
  const allowedPercent = hasStats
    ? Math.round((allowedCount / Math.max(totalPermissions, 1)) * 100)
    : 0;

  return (
    <div className="flex flex-col rounded-2xl border border-cf-border bg-cf-surface transition hover:shadow-[var(--shadow-panel)]">
      <div className="flex items-start gap-3 px-5 pt-5 pb-3">
        <span
          className={[
            "grid h-10 w-10 shrink-0 place-items-center rounded-xl",
            isSystem
              ? "bg-cf-accent/10 text-cf-accent"
              : "bg-cf-surface-soft text-cf-text-muted",
          ].join(" ")}
        >
          {isSystem ? (
            <ShieldCheck className="h-5 w-5" />
          ) : (
            <Shield className="h-5 w-5" />
          )}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="truncate text-sm font-bold text-cf-text">
              {name}
            </span>
            <span
              className={[
                "shrink-0 rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider",
                isSystem
                  ? "bg-cf-accent/10 text-cf-accent"
                  : "bg-cf-surface-soft text-cf-text-muted border border-cf-border",
              ].join(" ")}
            >
              {typeBadge}
            </span>
          </div>
          {code && (
            <span className="mt-0.5 block font-mono text-[10px] text-cf-text-subtle">
              {code}
            </span>
          )}
          {description && (
            <p className="mt-1 text-xs leading-relaxed text-cf-text-muted line-clamp-2">
              {description}
            </p>
          )}
        </div>
      </div>

      <div className="mt-auto border-t border-cf-border px-5 py-3">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-4 text-xs text-cf-text-muted">
            {memberCount !== undefined && (
              <span className="inline-flex items-center gap-1.5">
                <Users className="h-3.5 w-3.5 text-cf-text-subtle" />
                <span className="font-semibold text-cf-text">
                  {memberCount}
                </span>{" "}
                {memberLabel}
              </span>
            )}
            {hasStats && (
              <span className="inline-flex items-center gap-2">
                <span className="h-1.5 w-16 overflow-hidden rounded-full bg-cf-border">
                  <span
                    className="block h-full rounded-full bg-cf-success-text"
                    style={{ width: `${allowedPercent}%` }}
                  />
                </span>
                <span className="font-mono text-[10px] font-semibold">
                  {allowedCount}/{totalPermissions}
                </span>
              </span>
            )}
          </div>
          {onEdit && (
            <button
              type="button"
              onClick={onEdit}
              className="shrink-0 rounded-lg border border-cf-border p-1.5 text-cf-text-muted transition hover:bg-cf-surface-soft hover:text-cf-text"
              aria-label={`Edit ${name}`}
            >
              <Pencil className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
