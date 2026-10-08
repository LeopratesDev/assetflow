import axios from "axios";

// Em produção (Docker/Vercel) a variável não é definida e usamos caminho relativo,
// o que deixa o proxy do nginx ou o rewrites do Vercel tratarem o roteamento.
// Em dev o Vite proxy redireciona /api → localhost:8000, portanto URL relativa
// também funciona; VITE_API_URL fica disponível apenas para apontar para staging.
export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? "",
  headers: { "Content-Type": "application/json" },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("access_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem("access_token");
      // Trade-off: window.location.href causa reload completo (perde estado do QueryClient).
      // Alternativa: usar navigate() do React Router, mas requer contexto de Provider.
      // Para o escopo atual, o reload é aceitável e mantém o código simples.
      window.location.href = "/login";
    }
    return Promise.reject(error);
  }
);
