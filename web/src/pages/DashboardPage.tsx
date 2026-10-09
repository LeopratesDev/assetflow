import {
  Monitor,
  Tag,
  ArrowLeftRight,
  Package,
  CheckCircle2,
  AlertTriangle,
  DollarSign,
} from "lucide-react";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { useAssets } from "../hooks/useAssets";
import { useAllocations } from "../hooks/useAllocations";
import { useCategories } from "../hooks/useCategories";
import type { ElementType } from "react";

const fmt = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

interface StatCardProps {
  label: string;
  value: number | string;
  icon: ElementType;
  textColor: string;
  iconBg: string;
}

function StatCard({ label, value, icon: Icon, textColor, iconBg }: StatCardProps) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[11px] text-gray-500 font-medium uppercase tracking-wide leading-tight break-words">{label}</p>
          <p className={`text-2xl font-bold mt-1.5 ${textColor}`}>{value}</p>
        </div>
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${iconBg}`}>
          <Icon className="w-4.5 h-4.5" />
        </div>
      </div>
    </div>
  );
}

export function DashboardPage() {
  const assets = useAssets({ pageSize: 1 });
  const available = useAssets({ pageSize: 1, status: "available" });
  const allocated = useAssets({ pageSize: 1, status: "allocated" });
  const maintenance = useAssets({ pageSize: 1, status: "maintenance" });
  const categories = useCategories(1, 1);
  const activeAllocs = useAllocations({ pageSize: 1, active: true });

  const stats: StatCardProps[] = [
    {
      label: "Total de Ativos",
      value: assets.data?.total_items ?? "—",
      icon: Package,
      textColor: "text-gray-900",
      iconBg: "bg-gray-100 text-gray-600",
    },
    {
      label: "Disponíveis",
      value: available.data?.total_items ?? "—",
      icon: CheckCircle2,
      textColor: "text-emerald-600",
      iconBg: "bg-emerald-50 text-emerald-600",
    },
    {
      label: "Alocados",
      value: allocated.data?.total_items ?? "—",
      icon: Monitor,
      textColor: "text-indigo-600",
      iconBg: "bg-indigo-50 text-indigo-600",
    },
    {
      label: "Manutenção",
      value: maintenance.data?.total_items ?? "—",
      icon: AlertTriangle,
      textColor: "text-amber-600",
      iconBg: "bg-amber-50 text-amber-600",
    },
    {
      label: "Categorias",
      value: categories.data?.total_items ?? "—",
      icon: Tag,
      textColor: "text-violet-600",
      iconBg: "bg-violet-50 text-violet-600",
    },
    {
      label: "Alocações Ativas",
      value: activeAllocs.data?.total_items ?? "—",
      icon: ArrowLeftRight,
      textColor: "text-rose-600",
      iconBg: "bg-rose-50 text-rose-600",
    },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
        {stats.map((s) => (
          <StatCard key={s.label} {...s} />
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100">
            <h2 className="font-semibold text-gray-900 text-sm">Alocações Ativas</h2>
            <p className="text-xs text-gray-400 mt-0.5">Equipamentos alocados atualmente</p>
          </div>
          <RecentAllocations />
        </div>

        <PatrimonioCard />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <CategoryChart />
        <StatusChart />
      </div>
    </div>
  );
}

function RecentAllocations() {
  const { data, isLoading } = useAllocations({ pageSize: 10, active: true });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!data?.items.length) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center px-6">
        <ArrowLeftRight className="w-10 h-10 text-gray-200 mb-3" />
        <p className="text-sm text-gray-400">Nenhuma alocação ativa no momento.</p>
      </div>
    );
  }

  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="text-left text-gray-400 text-xs bg-gray-50 border-b border-gray-100">
          <th className="px-5 py-3 font-medium">Ativo</th>
          <th className="px-5 py-3 font-medium">Responsável</th>
          <th className="px-5 py-3 font-medium">Desde</th>
        </tr>
      </thead>
      <tbody>
        {data.items.map((a) => (
          <tr key={a.id} className="border-t border-gray-50 hover:bg-gray-50 transition-colors">
            <td className="px-5 py-3">
              <span className="font-mono text-xs bg-gray-100 text-gray-700 px-2 py-0.5 rounded-md">
                {a.asset.serial_number}
              </span>
              <p className="text-xs text-gray-400 mt-0.5">{a.asset.name}</p>
            </td>
            <td className="px-5 py-3 text-gray-700 font-medium">{a.user.name}</td>
            <td className="px-5 py-3 text-gray-400 text-xs tabular-nums">{a.allocated_at}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

const CHART_COLORS = ["#4f46e5", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4"];

function CategoryChart() {
  const { data } = useAssets({ pageSize: 100 });

  const byCategory = Object.entries(
    (data?.items ?? []).reduce<Record<string, number>>((acc, a) => {
      const cat = a.category.name;
      acc[cat] = (acc[cat] ?? 0) + 1;
      return acc;
    }, {})
  ).map(([name, value]) => ({ name, value }));

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-100">
        <h2 className="font-semibold text-gray-900 text-sm">Ativos por categoria</h2>
        <p className="text-xs text-gray-400 mt-0.5">Distribuição do inventário</p>
      </div>
      {byCategory.length === 0 ? (
        <div className="flex items-center justify-center py-16">
          <div className="w-5 h-5 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="px-5 py-4">
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie
                data={byCategory}
                cx="50%"
                cy="50%"
                innerRadius={55}
                outerRadius={85}
                paddingAngle={3}
                dataKey="value"
              >
                {byCategory.map((_, i) => (
                  <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                formatter={(v) => [`${v} ativo${v !== 1 ? "s" : ""}`, ""]}
                contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #e5e7eb" }}
              />
              <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}

const STATUS_LABELS: Record<string, string> = {
  available: "Disponível",
  allocated: "Alocado",
  maintenance: "Manutenção",
  disposed: "Descartado",
};
const STATUS_COLORS: Record<string, string> = {
  available: "#10b981",
  allocated: "#4f46e5",
  maintenance: "#f59e0b",
  disposed: "#ef4444",
};

function StatusChart() {
  const { data } = useAssets({ pageSize: 100 });

  const byStatus = Object.entries(
    (data?.items ?? []).reduce<Record<string, number>>((acc, a) => {
      acc[a.status] = (acc[a.status] ?? 0) + 1;
      return acc;
    }, {})
  ).map(([status, value]) => ({
    name: STATUS_LABELS[status] ?? status,
    value,
    color: STATUS_COLORS[status] ?? "#6b7280",
  }));

  const total = byStatus.reduce((s, d) => s + d.value, 0);

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-100">
        <h2 className="font-semibold text-gray-900 text-sm">Ativos por status</h2>
        <p className="text-xs text-gray-400 mt-0.5">Situação atual do inventário</p>
      </div>
      {byStatus.length === 0 ? (
        <div className="flex items-center justify-center py-16">
          <div className="w-5 h-5 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="px-5 py-5 space-y-3">
          {byStatus.map((d) => (
            <div key={d.name}>
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="text-gray-600 font-medium">{d.name}</span>
                <span className="text-gray-400 tabular-nums">
                  {d.value} ({total > 0 ? Math.round((d.value / total) * 100) : 0}%)
                </span>
              </div>
              <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{
                    width: `${total > 0 ? (d.value / total) * 100 : 0}%`,
                    backgroundColor: d.color,
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function PatrimonioCard() {
  const { data } = useAssets({ pageSize: 100 });

  const { total, count } = (data?.items ?? []).reduce(
    (acc, a) => ({
      total: acc.total + (a.purchase_value ? parseFloat(a.purchase_value) : 0),
      count: acc.count + 1,
    }),
    { total: 0, count: 0 }
  );

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-100">
        <h2 className="font-semibold text-gray-900 text-sm">Patrimônio</h2>
        <p className="text-xs text-gray-400 mt-0.5">Valor total do inventário</p>
      </div>
      <div className="px-5 py-8 flex flex-col items-center justify-center text-center gap-3">
        <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center">
          <DollarSign className="w-6 h-6 text-indigo-600" />
        </div>
        <div>
          <p className="text-3xl font-bold text-gray-900">{fmt.format(total)}</p>
          <p className="text-sm text-gray-400 mt-1">{count} ativos inventariados</p>
        </div>
      </div>
    </div>
  );
}
