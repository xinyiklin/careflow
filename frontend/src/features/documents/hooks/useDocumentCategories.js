import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  createDocumentCategory,
  deleteDocumentCategory,
  fetchDocumentCategories,
  updateDocumentCategory,
} from "../api/documents";

export function getDocumentCategoriesQueryKey(facilityId) {
  return ["documentCategories", facilityId || null];
}

export default function useDocumentCategories({ facilityId } = {}) {
  const queryClient = useQueryClient();
  const queryKey = getDocumentCategoriesQueryKey(facilityId);

  const categoriesQuery = useQuery({
    queryKey,
    queryFn: () => fetchDocumentCategories({ facilityId }),
    enabled: !!facilityId,
  });

  const saveMutation = useMutation({
    mutationFn: ({ categoryId, values }) => {
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
    mutationFn: (categoryId) => {
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
    saveCategory: ({ categoryId, values }) =>
      saveMutation.mutateAsync({ categoryId, values }),
    deleteCategory: (categoryId) => deleteMutation.mutateAsync(categoryId),
  };
}
