import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  createDocumentCategory,
  deleteDocumentCategory,
  fetchDocumentCategories,
  updateDocumentCategory,
} from "../api/documents";

import type { ApiPayload, EntityId } from "../../../shared/api/types";

type UseDocumentCategoriesOptions = {
  facilityId?: EntityId | null;
};

type SaveCategoryPayload = {
  categoryId?: EntityId | null;
  values: ApiPayload;
};

export function getDocumentCategoriesQueryKey(
  facilityId: EntityId | null | undefined
) {
  return ["documentCategories", facilityId || null];
}

export default function useDocumentCategories({
  facilityId,
}: UseDocumentCategoriesOptions = {}) {
  const queryClient = useQueryClient();
  const queryKey = getDocumentCategoriesQueryKey(facilityId);

  const categoriesQuery = useQuery({
    queryKey,
    queryFn: () => fetchDocumentCategories({ facilityId }),
    enabled: !!facilityId,
  });

  const saveMutation = useMutation({
    mutationFn: async ({ categoryId, values }: SaveCategoryPayload) => {
      if (!facilityId) return null;
      if (categoryId) {
        return updateDocumentCategory({ facilityId, categoryId, values });
      }
      return createDocumentCategory({ facilityId, values });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (categoryId: EntityId) => {
      if (!facilityId) return null;
      return deleteDocumentCategory({ facilityId, categoryId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
    },
  });

  return {
    categories: Array.isArray(categoriesQuery.data) ? categoriesQuery.data : [],
    loading: categoriesQuery.isLoading,
    error:
      categoriesQuery.error?.message ||
      saveMutation.error?.message ||
      deleteMutation.error?.message ||
      "",
    saving: saveMutation.isPending || deleteMutation.isPending,
    reload: categoriesQuery.refetch,
    saveCategory: ({ categoryId, values }: SaveCategoryPayload) =>
      saveMutation.mutateAsync({ categoryId, values }),
    deleteCategory: (categoryId: EntityId) =>
      deleteMutation.mutateAsync(categoryId),
  };
}
