import { useMutation } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { api } from "../lib/api";
import { getToken, isTokenValid, removeToken, saveToken } from "../lib/auth";
import { queryClient } from "../lib/queryClient";

interface LoginVars {
  email: string;
  password: string;
}

export function useLogin() {
  const navigate = useNavigate();

  return useMutation({
    mutationFn: async ({ email, password }: LoginVars) => {
      const form = new URLSearchParams();
      form.set("username", email);
      form.set("password", password);
      const { data } = await api.post<{ access_token: string }>(
        "/api/v1/auth/token",
        form,
        { headers: { "Content-Type": "application/x-www-form-urlencoded" } }
      );
      return data;
    },
    onSuccess: ({ access_token }) => {
      saveToken(access_token);
      navigate("/");
    },
  });
}

export function useLogout() {
  const navigate = useNavigate();
  return () => {
    removeToken();
    queryClient.clear();
    navigate("/login");
  };
}

export function useIsAuthenticated(): boolean {
  return isTokenValid(getToken());
}
