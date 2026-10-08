import { useState } from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useIsAuthenticated } from "../../hooks/useAuth";
import { Sidebar } from "./Sidebar";
import { getCurrentRole } from "../../lib/auth";
import { User, Menu } from "lucide-react";

const pageTitles: Record<string, { title: string; subtitle: string }> = {
  "/": { title: "Dashboard", subtitle: "Visão geral do inventário" },
  "/assets": { title: "Ativos", subtitle: "Equipamentos cadastrados" },
  "/categories": { title: "Categorias", subtitle: "Tipos de equipamento" },
  "/allocations": { title: "Alocações", subtitle: "Atribuições de ativos" },
};

export function AppLayout() {
  const isAuth = useIsAuthenticated();
  const location = useLocation();
  const role = getCurrentRole();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  if (!isAuth) return <Navigate to="/login" replace />;

  const page = pageTitles[location.pathname] ?? {
    title: "AssetFlow",
    subtitle: "",
  };

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="flex-1 flex flex-col min-h-screen overflow-hidden">
        <header className="bg-white border-b border-gray-200 px-4 lg:px-6 py-3 flex items-center justify-between sticky top-0 z-30">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors"
              aria-label="Abrir menu"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-sm font-semibold text-gray-900">{page.title}</h1>
              <p className="text-xs text-gray-400">{page.subtitle}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-lg px-3 py-1.5">
            <div className="w-6 h-6 bg-indigo-600 rounded-full flex items-center justify-center">
              <User className="w-3 h-3 text-white" />
            </div>
            <span className="text-xs text-gray-700 font-medium">
              {role === "admin" ? "Administrador" : "Colaborador"}
            </span>
          </div>
        </header>
        <main className="flex-1 p-4 lg:p-6 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
