import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { api } from "../lib/api";
import type { Category, PaginatedResponse } from "../types";

const KEYS = {
  list: (page: number, size: number) => ["categories", page, size] as const,
  detail: (id: string) => ["categories", id] as const,
};

export function useCategories(page = 1, pageSize = 10) {
  return useQuery({
    queryKey: KEYS.list(page, pageSize),
    queryFn: async () => {
      const { data } = await api.get<PaginatedResponse<Category>>(
        `/api/v1/categories?page=${page}&page_size=${pageSize}`
      );
      return data;
    },
  });
}

export function useCreateCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: { name: string; description?: string }) =>
      api.post<Category>("/api/v1/categories", payload).then((r) => r.data),
    onSuccess: (cat) => {
      qc.invalidateQueries({ queryKey: ["categories"] });
      toast.success(`Categoria "${cat.name}" criada`);
    },
    onError: () => toast.error("Erro ao criar categoria. Nome pode já existir."),
  });
}

export function useUpdateCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...payload }: { id: string; name?: string; description?: string }) =>
      api.patch<Category>(`/api/v1/categories/${id}`, payload).then((r) => r.data),
    onSuccess: (cat) => {
      qc.invalidateQueries({ queryKey: ["categories"] });
      toast.success(`Categoria "${cat.name}" atualizada`);
    },
    onError: () => toast.error("Erro ao atualizar. Nome pode já existir."),
  });
}

export function useDeleteCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/api/v1/categories/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["categories"] });
      toast.success("Categoria excluída");
    },
    onError: () => toast.error("Erro ao excluir categoria. Pode ter ativos vinculados."),
  });
}
