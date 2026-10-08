import { NavLink } from "react-router-dom";
import { getCurrentRole } from "../../lib/auth";
import { useLogout } from "../../hooks/useAuth";

const navItems = [
  { to: "/", label: "Dashboard", icon: "⊞" },
  { to: "/assets", label: "Ativos", icon: "💻" },
  { to: "/categories", label: "Categorias", icon: "🗂" },
  { to: "/allocations", label: "Alocações", icon: "🔗" },
];

export function Sidebar() {
  const role = getCurrentRole();
  const logout = useLogout();

  return (
    <aside className="w-56 min-h-screen bg-slate-900 text-white flex flex-col">
      <div className="px-5 py-5 border-b border-slate-700">
        <span className="font-bold text-lg tracking-tight">IT Asset Mgr</span>
        {role && (
          <span className="ml-2 text-xs text-slate-400 uppercase">{role}</span>
        )}
      </div>
      <nav className="flex-1 px-3 py-4 space-y-1">
        {navItems.map(({ to, label, icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === "/"}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors ${
                isActive
                  ? "bg-slate-700 text-white"
                  : "text-slate-300 hover:bg-slate-800 hover:text-white"
              }`
            }
          >
            <span>{icon}</span>
            {label}
          </NavLink>
        ))}
      </nav>
      <div className="px-3 py-4 border-t border-slate-700">
        <button
          onClick={logout}
          className="w-full flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-slate-300 hover:bg-slate-800 hover:text-white transition-colors"
        >
          <span>↩</span> Sair
        </button>
      </div>
    </aside>
  );
}
