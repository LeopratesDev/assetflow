import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";
import type { Allocation, PaginatedResponse } from "../types";

interface AllocationFilters {
  page?: number;
  pageSize?: number;
  active?: boolean | null;
}

export function useAllocations(filters: AllocationFilters = {}) {
  const { page = 1, pageSize = 10, active } = filters;
  const params = new URLSearchParams();
  params.set("page", String(page));
  params.set("page_size", String(pageSize));
  if (active !== null && active !== undefined)
    params.set("active", String(active));

  return useQuery({
    queryKey: ["allocations", page, pageSize, active],
    queryFn: async () => {
      const { data } = await api.get<PaginatedResponse<Allocation>>(
        `/api/v1/allocations?${params.toString()}`
      );
      return data;
    },
  });
}

export function useCreateAllocation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: {
      asset_id: string;
      user_id: string;
      notes?: string;
    }) =>
      api.post<Allocation>("/api/v1/allocations", payload).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["allocations"] });
      qc.invalidateQueries({ queryKey: ["assets"] });
    },
  });
}

export function useReturnAllocation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      returned_at,
    }: {
      id: string;
      returned_at: string;
    }) =>
      api
        .patch<Allocation>(`/api/v1/allocations/${id}/return`, { returned_at })
        .then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["allocations"] });
      qc.invalidateQueries({ queryKey: ["assets"] });
    },
  });
}

export function useAssetHistory(assetId: string, page = 1) {
  return useQuery({
    queryKey: ["asset-history", assetId, page],
    queryFn: async () => {
      const { data } = await api.get<PaginatedResponse<Allocation>>(
        `/api/v1/allocations/assets/${assetId}/history?page=${page}`
      );
      return data;
    },
    enabled: !!assetId,
  });
}
