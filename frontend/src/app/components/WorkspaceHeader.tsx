import type { ReactNode } from "react";

type WorkspaceHeaderProps = {
  eyebrow?: string;
  title: string;
  leftAccessory?: ReactNode;
  rightAccessory?: ReactNode;
  bottomAccessory?: ReactNode;
};

export default function WorkspaceHeader({
  eyebrow,
  title,
  leftAccessory = null,
  rightAccessory = null,
  bottomAccessory = null,
}: WorkspaceHeaderProps) {
  return (
    <div className="flex-none border-b border-cf-border bg-cf-surface-muted/55 px-4 py-2.5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <div className="min-w-0">
            {eyebrow ? (
              <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-cf-text-subtle">
                {eyebrow}
              </div>
            ) : null}
            <div
              className={[
                "text-base font-semibold tracking-tight text-cf-text",
                eyebrow ? "mt-0.5" : "",
              ].join(" ")}
            >
              {title}
            </div>
          </div>

          {leftAccessory ? (
            <div className="shrink-0">{leftAccessory}</div>
          ) : null}
        </div>

        {rightAccessory ? (
          <div className="flex shrink-0 items-center gap-3">
            {rightAccessory}
          </div>
        ) : null}
      </div>

      {bottomAccessory ? <div className="mt-2.5">{bottomAccessory}</div> : null}
    </div>
  );
}
