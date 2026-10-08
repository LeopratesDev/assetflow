import type { AssetStatus } from "../../types";

const variants: Record<AssetStatus, { bg: string; dot: string; label: string }> = {
  available: {
    bg: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200",
    dot: "bg-emerald-500",
    label: "Disponível",
  },
  allocated: {
    bg: "bg-indigo-50 text-indigo-700 ring-1 ring-indigo-200",
    dot: "bg-indigo-500",
    label: "Alocado",
  },
  maintenance: {
    bg: "bg-amber-50 text-amber-700 ring-1 ring-amber-200",
    dot: "bg-amber-500",
    label: "Manutenção",
  },
  disposed: {
    bg: "bg-gray-50 text-gray-500 ring-1 ring-gray-200",
    dot: "bg-gray-400",
    label: "Descartado",
  },
};

export function StatusBadge({ status }: { status: AssetStatus }) {
  const v = variants[status];
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${v.bg}`}>
      <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${v.dot}`} />
      {v.label}
    </span>
  );
}

export function AllocationBadge({ active }: { active: boolean }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${
        active
          ? "bg-indigo-50 text-indigo-700 ring-1 ring-indigo-200"
          : "bg-gray-50 text-gray-500 ring-1 ring-gray-200"
      }`}
    >
      <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${active ? "bg-indigo-500" : "bg-gray-400"}`} />
      {active ? "Ativa" : "Encerrada"}
    </span>
  );
}
