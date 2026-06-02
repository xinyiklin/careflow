import type { ReactNode } from "react";

function getInitials(name: string) {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (!words.length) return "?";
  return words
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
}

export default function SecurityColumnHeader({
  name,
  subtitle,
  allowedCount,
  totalCount,
  avatarClassName,
  className,
  badge,
}: {
  name: string;
  subtitle?: string;
  allowedCount: number;
  totalCount: number;
  avatarClassName?: string;
  className?: string;
  badge?: ReactNode;
}) {
  const allowedPercent = Math.round(
    (allowedCount / Math.max(totalCount, 1)) * 100
  );

  return (
    <th
      className={[
        "min-w-[180px] border-b border-cf-border bg-transparent px-3 py-3 text-left align-top",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <div className="rounded-2xl p-2">
        <div className="flex min-w-0 items-center gap-2">
          <span
            className={[
              "grid h-8 w-8 shrink-0 place-items-center rounded-xl text-[10px] font-bold",
              avatarClassName ||
                "border border-cf-border bg-cf-surface-soft text-cf-text-muted",
            ].join(" ")}
          >
            {getInitials(name)}
          </span>
          <span className="min-w-0 flex-1">
            <span className="flex min-w-0 items-center gap-1.5">
              <span className="truncate text-sm font-semibold text-cf-text">
                {name || "—"}
              </span>
              {badge}
            </span>
            {subtitle && (
              <span className="mt-0.5 block truncate text-[10px] font-medium text-cf-text-subtle">
                {subtitle}
              </span>
            )}
          </span>
        </div>

        <div className="mt-3 flex items-center gap-2">
          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-cf-border">
            <div
              className="h-full rounded-full bg-cf-success-text"
              style={{ width: `${allowedPercent}%` }}
            />
          </div>
          <span className="font-mono text-[10px] font-semibold text-cf-text-muted">
            {allowedCount}/{totalCount}
          </span>
        </div>
      </div>
    </th>
  );
}
