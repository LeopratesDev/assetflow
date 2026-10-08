import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { api } from "../lib/api";
import type { Asset, AssetStatus, PaginatedResponse } from "../types";

interface AssetFilters {
  page?: number;
  pageSize?: number;
  search?: string;
  status?: AssetStatus | "";
  category_id?: string;
}

export function useAssets(filters: AssetFilters = {}) {
  const { page = 1, pageSize = 10, search, status, category_id } = filters;
  const params = new URLSearchParams();
  params.set("page", String(page));
  params.set("page_size", String(pageSize));
  if (search) params.set("search", search);
  if (status) params.set("status", status);
  if (category_id) params.set("category_id", category_id);

  return useQuery({
    queryKey: ["assets", page, pageSize, search, status, category_id],
    queryFn: async () => {
      const { data } = await api.get<PaginatedResponse<Asset>>(
        `/api/v1/assets?${params.toString()}`
      );
      return data;
    },
  });
}

export function useCreateAsset() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: {
      serial_number: string;
      name: string;
      brand: string;
      model: string;
      category_id: string;
      status?: AssetStatus;
      notes?: string;
    }) => api.post<Asset>("/api/v1/assets", payload).then((r) => r.data),
    onSuccess: (asset) => {
      qc.invalidateQueries({ queryKey: ["assets"] });
      toast.success(`Ativo "${asset.name}" cadastrado com sucesso`);
    },
    onError: () => toast.error("Erro ao cadastrar ativo. Verifique se o serial já existe."),
  });
}

export function useUpdateAsset() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      ...payload
    }: Partial<{
      serial_number: string;
      name: string;
      brand: string;
      model: string;
      status: AssetStatus;
      notes: string;
      category_id: string;
    }> & { id: string }) =>
      api.patch<Asset>(`/api/v1/assets/${id}`, payload).then((r) => r.data),
    onSuccess: (asset) => {
      qc.invalidateQueries({ queryKey: ["assets"] });
      toast.success(`Ativo "${asset.name}" atualizado`);
    },
    onError: () => toast.error("Erro ao salvar. Tente novamente."),
  });
}

export function useDeleteAsset() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/api/v1/assets/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["assets"] });
      toast.success("Ativo excluído");
    },
    onError: () => toast.error("Erro ao excluir ativo."),
  });
}
