import { useQuery } from "@tanstack/react-query";
import { api } from "../lib/api";
import type { PaginatedResponse } from "../types";

export interface UserSummary {
  id: string;
  name: string;
  email: string;
}

export function useUsers() {
  return useQuery({
    queryKey: ["users"],
    queryFn: async () => {
      const { data } = await api.get<PaginatedResponse<UserSummary>>(
        "/api/v1/users?page_size=50"
      );
      return data;
    },
  });
}
