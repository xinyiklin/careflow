import { useCallback, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";

import { PageHeader } from "../../../shared/ui";
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
  const { t } = useTranslation();
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
    <div>
      <PageHeader title={t("messages.pageTitle")} />

      <div className="grid h-[calc(100vh-12rem)] min-h-[480px] grid-cols-1 gap-4 md:grid-cols-[320px_1fr] md:gap-6">
        <div className={activeThreadId !== null ? "hidden md:block" : "block"}>
          <ThreadList
            activeThreadId={activeThreadId}
            onSelectThread={handleSelectThread}
            onStartNew={() => setComposerOpen(true)}
          />
        </div>
        <div className={activeThreadId !== null ? "block" : "hidden md:block"}>
          <Conversation threadId={activeThreadId} onBack={handleBackToList} />
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
