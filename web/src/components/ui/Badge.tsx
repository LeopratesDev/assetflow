import type { AssetStatus } from "../../types";

const variants: Record<AssetStatus, string> = {
  available: "bg-emerald-100 text-emerald-800",
  allocated: "bg-blue-100 text-blue-800",
  maintenance: "bg-amber-100 text-amber-800",
  disposed: "bg-gray-100 text-gray-600",
};

const labels: Record<AssetStatus, string> = {
  available: "Disponível",
  allocated: "Alocado",
  maintenance: "Manutenção",
  disposed: "Descartado",
};

export function StatusBadge({ status }: { status: AssetStatus }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${variants[status]}`}
    >
      {labels[status]}
    </span>
  );
}
