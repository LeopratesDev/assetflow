import { Navigate, Outlet } from "react-router-dom";
import { useIsAuthenticated } from "../../hooks/useAuth";
import { Sidebar } from "./Sidebar";

export function AppLayout() {
  const isAuth = useIsAuthenticated();
  if (!isAuth) return <Navigate to="/login" replace />;

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      <main className="flex-1 p-6 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
}
