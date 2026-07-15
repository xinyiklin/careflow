import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { apiRequest } from "../../../shared/api/client";

export type MessageThreadStatus = "open" | "closed";
export type MessageSenderKind = "patient" | "clinician";

export type PortalMessage = {
  id: number;
  sender_kind: MessageSenderKind;
  sender_display_name: string;
  body: string;
  created_at: string;
};

export type PortalMessageThreadSummary = {
  id: number;
  subject: string;
  status: MessageThreadStatus;
  status_label: string;
  last_message_at: string;
  unread_for_patient: boolean;
  last_message_preview: string;
};

export type PortalMessageThreadDetail = {
  id: number;
  subject: string;
  status: MessageThreadStatus;
  status_label: string;
  last_message_at: string;
  unread_for_patient: boolean;
  messages: PortalMessage[];
};

export type StartThreadPayload = {
  subject: string;
  body: string;
};

export type ReplyToThreadPayload = {
  body: string;
};

const THREADS_QUERY_KEY = ["portal", "messaging", "threads"] as const;

function threadQueryKey(threadId: number) {
  return ["portal", "messaging", "thread", threadId] as const;
}

export function useMessageThreads({
  refetchInterval = false,
}: { refetchInterval?: number | false } = {}) {
  return useQuery<PortalMessageThreadSummary[]>({
    queryKey: THREADS_QUERY_KEY,
    queryFn: async () =>
      (await apiRequest<PortalMessageThreadSummary[]>(
        "/portal/messaging/threads/"
      )) ?? [],
    refetchInterval,
  });
}

export function useMessageThread(threadId: number | null | undefined) {
  const queryClient = useQueryClient();
  return useQuery<PortalMessageThreadDetail | null>({
    queryKey: threadId
      ? threadQueryKey(threadId)
      : ["portal", "messaging", "thread", "none"],
    enabled: threadId !== null && threadId !== undefined,
    queryFn: async () => {
      if (threadId === null || threadId === undefined) return null;
      const result = await apiRequest<PortalMessageThreadDetail>(
        `/portal/messaging/threads/${threadId}/`
      );
      // The detail GET marks the thread read on the server. Patch the
      // list cache so the unread dot, nav badge, and dashboard count
      // update immediately instead of waiting for a manual refresh.
      if (result && result.unread_for_patient === false) {
        queryClient.setQueryData<PortalMessageThreadSummary[] | undefined>(
          THREADS_QUERY_KEY,
          (prev) =>
            prev?.map((thread) =>
              thread.id === result.id
                ? { ...thread, unread_for_patient: false }
                : thread
            )
        );
      }
      return result ?? null;
    },
  });
}

export function useStartThread() {
  const queryClient = useQueryClient();
  return useMutation<
    PortalMessageThreadDetail | null,
    Error,
    StartThreadPayload
  >({
    mutationFn: (payload) =>
      apiRequest<PortalMessageThreadDetail>("/portal/messaging/threads/", {
        method: "POST",
        body: JSON.stringify(payload),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: THREADS_QUERY_KEY });
    },
  });
}

export function useReplyToThread(threadId: number) {
  const queryClient = useQueryClient();
  return useMutation<PortalMessage | null, Error, ReplyToThreadPayload>({
    mutationFn: (payload) =>
      apiRequest<PortalMessage>(
        `/portal/messaging/threads/${threadId}/reply/`,
        {
          method: "POST",
          body: JSON.stringify(payload),
        }
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: threadQueryKey(threadId) });
      queryClient.invalidateQueries({ queryKey: THREADS_QUERY_KEY });
    },
  });
}
