import { useAssets } from "../hooks/useAssets";
import { useAllocations } from "../hooks/useAllocations";
import { useCategories } from "../hooks/useCategories";

function StatCard({
  label,
  value,
  color,
}: {
  label: string;
  value: number | string;
  color: string;
}) {
  return (
    <div className={`rounded-xl p-5 text-white ${color}`}>
      <p className="text-sm opacity-80">{label}</p>
      <p className="text-3xl font-bold mt-1">{value}</p>
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

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Dashboard</h1>

      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4 mb-8">
        <StatCard
          label="Total de Ativos"
          value={assets.data?.total_items ?? "—"}
          color="bg-slate-700"
        />
        <StatCard
          label="Disponíveis"
          value={available.data?.total_items ?? "—"}
          color="bg-emerald-600"
        />
        <StatCard
          label="Alocados"
          value={allocated.data?.total_items ?? "—"}
          color="bg-blue-600"
        />
        <StatCard
          label="Manutenção"
          value={maintenance.data?.total_items ?? "—"}
          color="bg-amber-500"
        />
        <StatCard
          label="Categorias"
          value={categories.data?.total_items ?? "—"}
          color="bg-violet-600"
        />
        <StatCard
          label="Alocações Ativas"
          value={activeAllocs.data?.total_items ?? "—"}
          color="bg-rose-600"
        />
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h2 className="font-semibold text-gray-800 mb-3">Alocações recentes</h2>
        <RecentAllocations />
      </div>
    </div>
  );
}

function RecentAllocations() {
  const { data, isLoading } = useAllocations({ pageSize: 5, active: true });

  if (isLoading) return <p className="text-sm text-gray-400">Carregando…</p>;
  if (!data?.items.length)
    return <p className="text-sm text-gray-400">Nenhuma alocação ativa.</p>;

  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="text-left text-gray-500 border-b border-gray-100">
          <th className="pb-2 font-medium">Ativo</th>
          <th className="pb-2 font-medium">Usuário</th>
          <th className="pb-2 font-medium">Desde</th>
        </tr>
      </thead>
      <tbody>
        {data.items.map((a) => (
          <tr key={a.id} className="border-b border-gray-50 last:border-0">
            <td className="py-2 font-mono text-xs">{a.asset.serial_number}</td>
            <td className="py-2">{a.user.name}</td>
            <td className="py-2 text-gray-500">{a.allocated_at}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
