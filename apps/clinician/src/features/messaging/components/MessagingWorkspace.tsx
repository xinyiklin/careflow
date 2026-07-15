import { useCallback, useEffect, useMemo, useRef } from "react";
import { useSearchParams } from "react-router-dom";

import WorkspaceShell from "../../../app/components/WorkspaceShell";
import ThreadDetailPanel from "./ThreadDetailPanel";
import ThreadListPanel from "./ThreadListPanel";

import type { EntityId } from "../../../shared/api/types";

const THREAD_QUERY_PARAM = "thread";

function parseThreadId(raw: string | null): number | null {
  if (!raw) return null;
  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed <= 0) return null;
  return parsed;
}

type MessagingWorkspaceProps = {
  facilityId: EntityId | null;
  canRespond: boolean;
};

export default function MessagingWorkspace({
  facilityId,
  canRespond,
}: MessagingWorkspaceProps) {
  const [searchParams, setSearchParams] = useSearchParams();

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

  const previousFacilityIdRef = useRef(facilityId);
  useEffect(() => {
    const previousFacilityId = previousFacilityIdRef.current;
    previousFacilityIdRef.current = facilityId;
    if (
      previousFacilityId !== null &&
      String(previousFacilityId) !== String(facilityId)
    ) {
      setActiveThreadId(null);
    }
  }, [facilityId, setActiveThreadId]);

  return (
    <WorkspaceShell>
      <div className="grid min-h-0 flex-1 grid-cols-1 overflow-hidden bg-cf-surface md:grid-cols-[360px_minmax(0,1fr)]">
        <ThreadListPanel
          facilityId={facilityId}
          activeThreadId={activeThreadId}
          onSelectThread={handleSelectThread}
        />
        <ThreadDetailPanel
          facilityId={facilityId}
          threadId={activeThreadId}
          canRespond={canRespond}
        />
      </div>
    </WorkspaceShell>
  );
}
