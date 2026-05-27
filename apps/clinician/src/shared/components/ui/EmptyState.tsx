import type { ReactNode } from "react";

type EmptyStateProps = {
  title: string;
  body?: ReactNode;
  className?: string;
};

export default function EmptyState({
  title,
  body,
  className = "",
}: EmptyStateProps) {
  return (
    <div
      className={[
        "flex items-center justify-center rounded-2xl border border-dashed border-cf-border bg-cf-surface-muted px-6 py-6 text-center",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <div>
        <div className="text-sm font-medium text-cf-text">{title}</div>
        {body ? (
          <div className="mt-1 text-sm text-cf-text-muted">{body}</div>
        ) : null}
      </div>
    </div>
  );
}
