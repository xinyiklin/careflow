import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { apiRequest } from "../../../shared/api/client";

import type { ApiParamValue, EntityId } from "../../../shared/api/types";

export type MessageThreadStatus = "open" | "closed";
export type MessageSenderKind = "patient" | "clinician";

export type MessageItem = {
  id: number;
  sender_kind: MessageSenderKind;
  sender_display_name: string;
  body: string;
  created_at: string;
};

export type MessageThreadSummary = {
  id: number;
  patient_id: number;
  patient_display_name: string;
  subject: string;
  status: MessageThreadStatus;
  status_label: string;
  last_message_at: string;
  unread_for_clinician: boolean;
};

export type MessageThreadDetail = MessageThreadSummary & {
  messages: MessageItem[];
};

export type ReplyToThreadPayload = {
  body: string;
};

type UseMessageThreadsParams = {
  facilityId?: EntityId | null;
  status?: MessageThreadStatus | "";
  patientId?: ApiParamValue;
  search?: string;
  enabled?: boolean;
};

export function getMessageThreadsQueryKey({
  facilityId,
  status,
  patientId,
  search,
}: {
  facilityId?: EntityId | null;
  status?: MessageThreadStatus | "";
  patientId?: ApiParamValue;
  search?: string;
}) {
  return [
    "messaging",
    "threads",
    {
      facilityId: facilityId || null,
      status: status || null,
      patientId: patientId ?? null,
      search: search || null,
    },
  ] as const;
}

export function getMessageThreadQueryKey(threadId: EntityId) {
  return ["messaging", "thread", threadId] as const;
}

export function useMessageThreads({
  facilityId,
  status,
  patientId,
  search,
  enabled = true,
}: UseMessageThreadsParams) {
  return useQuery<MessageThreadSummary[]>({
    queryKey: getMessageThreadsQueryKey({
      facilityId,
      status,
      patientId,
      search,
    }),
    queryFn: async () =>
      (await apiRequest<MessageThreadSummary[]>("/messaging/threads/", {
        params: {
          facility_id: facilityId,
          status: status || null,
          patient_id: patientId ?? null,
          search: search?.trim() || null,
        },
      })) ?? [],
    enabled: enabled && !!facilityId,
  });
}

type UseMessageThreadParams = {
  threadId: EntityId | null | undefined;
  facilityId?: EntityId | null;
};

export function useMessageThread({
  threadId,
  facilityId,
}: UseMessageThreadParams) {
  return useQuery<MessageThreadDetail | null>({
    queryKey: threadId
      ? getMessageThreadQueryKey(threadId)
      : ["messaging", "thread", "none"],
    enabled: threadId !== null && threadId !== undefined && !!facilityId,
    queryFn: async () => {
      if (threadId === null || threadId === undefined) return null;
      return (
        (await apiRequest<MessageThreadDetail>(
          `/messaging/threads/${threadId}/`,
          { params: { facility_id: facilityId } }
        )) ?? null
      );
    },
  });
}

type ThreadMutationVariables = {
  threadId: EntityId;
};

type ReplyMutationVariables = ThreadMutationVariables & {
  values: ReplyToThreadPayload;
};

function buildThreadInvalidator(
  queryClient: ReturnType<typeof useQueryClient>
) {
  return (threadId: EntityId) => {
    queryClient.invalidateQueries({
      queryKey: getMessageThreadQueryKey(threadId),
    });
    queryClient.invalidateQueries({
      queryKey: ["messaging", "threads"],
    });
  };
}

export function useReplyToThread({
  facilityId,
}: { facilityId?: EntityId | null } = {}) {
  const queryClient = useQueryClient();
  const invalidate = buildThreadInvalidator(queryClient);

  return useMutation<MessageItem | null, Error, ReplyMutationVariables>({
    mutationFn: ({ threadId, values }) =>
      apiRequest<MessageItem>(`/messaging/threads/${threadId}/reply/`, {
        method: "POST",
        params: { facility_id: facilityId },
        body: JSON.stringify({ body: values.body }),
      }),
    onSuccess: (_data, variables) => invalidate(variables.threadId),
  });
}

export function useCloseThread({
  facilityId,
}: { facilityId?: EntityId | null } = {}) {
  const queryClient = useQueryClient();
  const invalidate = buildThreadInvalidator(queryClient);

  return useMutation<
    MessageThreadSummary | null,
    Error,
    ThreadMutationVariables
  >({
    mutationFn: ({ threadId }) =>
      apiRequest<MessageThreadSummary>(
        `/messaging/threads/${threadId}/close/`,
        {
          method: "POST",
          params: { facility_id: facilityId },
          body: JSON.stringify({}),
        }
      ),
    onSuccess: (_data, variables) => invalidate(variables.threadId),
  });
}

export function useReopenThread({
  facilityId,
}: { facilityId?: EntityId | null } = {}) {
  const queryClient = useQueryClient();
  const invalidate = buildThreadInvalidator(queryClient);

  return useMutation<
    MessageThreadSummary | null,
    Error,
    ThreadMutationVariables
  >({
    mutationFn: ({ threadId }) =>
      apiRequest<MessageThreadSummary>(
        `/messaging/threads/${threadId}/reopen/`,
        {
          method: "POST",
          params: { facility_id: facilityId },
          body: JSON.stringify({}),
        }
      ),
    onSuccess: (_data, variables) => invalidate(variables.threadId),
  });
}
