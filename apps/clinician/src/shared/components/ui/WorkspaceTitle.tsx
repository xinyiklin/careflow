import type { ReactNode } from "react";

type WorkspaceTitleProps = {
  eyebrow: string;
  title: ReactNode;
  meta?: ReactNode;
  className?: string;
};

// Page identity for a workspace header: one eyebrow + the page's single h1.
// Every route frame uses this so titles share size, weight, and semantics.
export default function WorkspaceTitle({
  eyebrow,
  title,
  meta = null,
  className = "",
}: WorkspaceTitleProps) {
  return (
    <div className={["min-w-0", className].filter(Boolean).join(" ")}>
      <div className="text-[10px] font-semibold uppercase leading-none tracking-[0.16em] text-cf-text-subtle">
        {eyebrow}
      </div>
      <div className="mt-1 flex min-w-0 items-center gap-2">
        <h1 className="truncate text-base font-semibold leading-tight tracking-tight text-cf-text">
          {title}
        </h1>
        {meta}
      </div>
    </div>
  );
}
