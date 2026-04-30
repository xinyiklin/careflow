import { useEffect } from "react";
import { isRouteErrorResponse, useRouteError } from "react-router-dom";

function getErrorCopy(error) {
  if (isRouteErrorResponse(error)) {
    if (error.status === 404) {
      return {
        title: "Page not found",
        message: "This CareFlow view is not available from the current route.",
      };
    }

    return {
      title: "We could not open this view",
      message:
        error.statusText || "The route failed before it finished loading.",
    };
  }

  return {
    title: "Something needs attention",
    message:
      "CareFlow hit an unexpected UI error. Your session is still protected; try reopening the workspace.",
  };
}

export default function RouteErrorBoundary() {
  const error = useRouteError();
  const { title, message } = getErrorCopy(error);

  useEffect(() => {
    console.error("CareFlow route error", error);
  }, [error]);

  const returnToSchedule = () => {
    if (window.location.pathname === "/schedule") {
      window.location.reload();
      return;
    }

    window.location.assign("/schedule");
  };

  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-cf-page-bg px-4 py-8 text-cf-text">
      <section className="cf-ui-panel w-full max-w-lg rounded-[1.75rem] px-6 py-6 shadow-[var(--shadow-panel-lg)]">
        <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-cf-text-subtle">
          CareFlow
        </div>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">{title}</h1>
        <p className="mt-2 text-sm leading-6 text-cf-text-muted">{message}</p>
        <div className="mt-5 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={returnToSchedule}
            className="inline-flex h-10 items-center rounded-xl border border-cf-accent bg-cf-accent px-4 text-sm font-semibold text-cf-page-bg shadow-[var(--shadow-panel)] transition hover:border-cf-accent-hover hover:bg-cf-accent-hover"
          >
            Return to schedule
          </button>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="inline-flex h-10 items-center rounded-xl border border-cf-border bg-cf-surface px-4 text-sm font-semibold text-cf-text-muted transition hover:bg-cf-surface-soft hover:text-cf-text"
          >
            Reload
          </button>
        </div>
      </section>
    </div>
  );
}
