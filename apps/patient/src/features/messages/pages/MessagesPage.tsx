import { useCallback, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";

import { PageHeader } from "../../../shared/components/ui/PageHeader";
import { ComposerForm } from "../components/ComposerForm";
import { Conversation } from "../components/Conversation";
import { ThreadList } from "../components/ThreadList";

const THREAD_QUERY_PARAM = "thread";

function parseThreadId(raw: string | null): number | null {
  if (!raw) return null;
  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed <= 0) return null;
  return parsed;
}

export function MessagesPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [isComposerOpen, setComposerOpen] = useState(false);

  const activeThreadId = useMemo(
    () => parseThreadId(searchParams.get(THREAD_QUERY_PARAM)),
    [searchParams]
  );

  const setActiveThreadId = useCallback(
    (threadId: number | null) => {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          if (threadId === null) {
            next.delete(THREAD_QUERY_PARAM);
          } else {
            next.set(THREAD_QUERY_PARAM, String(threadId));
          }
          return next;
        },
        { replace: true }
      );
    },
    [setSearchParams]
  );

  const handleSelectThread = useCallback(
    (threadId: number) => setActiveThreadId(threadId),
    [setActiveThreadId]
  );

  const handleBackToList = useCallback(
    () => setActiveThreadId(null),
    [setActiveThreadId]
  );

  return (
    <div className="px-4 py-6 sm:px-6 sm:py-8">
      <PageHeader title="Messages" />

      <div className="overflow-hidden rounded-cf-shell border border-cf-border bg-cf-surface shadow-panel">
        {/* Desktop: two-pane. Mobile: one-pane swap based on selection. */}
        <div className="grid h-[calc(100vh-14rem)] min-h-[420px] grid-cols-1 lg:grid-cols-[320px_1fr]">
          <aside
            className={`border-cf-border lg:border-r ${
              activeThreadId !== null ? "hidden lg:block" : "block"
            }`}
          >
            <ThreadList
              activeThreadId={activeThreadId}
              onSelectThread={handleSelectThread}
              onStartNew={() => setComposerOpen(true)}
            />
          </aside>
          <section
            className={`${
              activeThreadId !== null ? "block" : "hidden lg:block"
            }`}
          >
            <Conversation threadId={activeThreadId} onBack={handleBackToList} />
          </section>
        </div>
      </div>

      {isComposerOpen ? (
        <ComposerForm
          onClose={() => setComposerOpen(false)}
          onCreated={(thread) => {
            setComposerOpen(false);
            setActiveThreadId(thread.id);
          }}
        />
      ) : null}
    </div>
  );
}
