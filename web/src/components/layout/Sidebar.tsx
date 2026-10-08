import { NavLink } from "react-router-dom";
import { getCurrentRole } from "../../lib/auth";
import { useLogout } from "../../hooks/useAuth";
import {
  LayoutDashboard,
  Monitor,
  Tag,
  ArrowLeftRight,
  LogOut,
  Zap,
  X,
} from "lucide-react";

const navItems = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/assets", label: "Ativos", icon: Monitor },
  { to: "/categories", label: "Categorias", icon: Tag },
  { to: "/allocations", label: "Alocações", icon: ArrowLeftRight },
];

interface SidebarProps {
  open?: boolean;
  onClose?: () => void;
}

export function Sidebar({ open, onClose }: SidebarProps) {
  const role = getCurrentRole();
  const logout = useLogout();

  const content = (
    <aside className="w-60 h-full bg-slate-950 text-white flex flex-col">
      <div className="px-5 py-5 border-b border-slate-800">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center flex-shrink-0">
              <Zap className="w-4 h-4 text-white" />
            </div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-base tracking-tight">AssetFlow</span>
              {role && (
                <span className="text-[10px] bg-slate-800 text-slate-400 rounded-full px-2 py-0.5 uppercase font-medium tracking-wide border border-slate-700">
                  {role}
                </span>
              )}
            </div>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="lg:hidden p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-0.5">
        {navItems.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === "/"}
            onClick={onClose}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-all duration-150 ${
                isActive
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "text-slate-400 hover:bg-slate-800 hover:text-slate-100"
              }`
            }
          >
            <Icon className="w-4 h-4 flex-shrink-0" />
            {label}
          </NavLink>
        ))}
      </nav>

      <div className="px-3 py-4 border-t border-slate-800">
        <button
          onClick={logout}
          className="w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-slate-400 hover:bg-slate-800 hover:text-slate-100 transition-all duration-150"
        >
          <LogOut className="w-4 h-4 flex-shrink-0" />
          Sair
        </button>
      </div>
    </aside>
  );

  return (
    <>
      {/* Desktop: sempre visível */}
      <div className="hidden lg:flex flex-shrink-0 w-60 min-h-screen">
        {content}
      </div>

      {/* Mobile: drawer com overlay */}
      {open && (
        <div className="lg:hidden fixed inset-0 z-40 flex">
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm"
            onClick={onClose}
          />
          <div className="relative z-50 flex flex-col w-60 h-full shadow-xl">
            {content}
          </div>
        </div>
      )}
    </>
  );
}
