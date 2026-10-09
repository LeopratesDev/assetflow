import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, History, CheckCircle2, Clock } from "lucide-react";
import { useAssetHistory } from "../hooks/useAllocations";
import { useAsset } from "../hooks/useAssets";
import { Pagination } from "../components/ui/Pagination";
import { SkeletonRows } from "../components/ui/SkeletonRow";

function fmt(dateStr: string | null | undefined) {
  if (!dateStr) return "—";
  return new Date(dateStr + "T00:00:00").toLocaleDateString("pt-BR");
}

export function AssetHistoryPage() {
  const { id = "" } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [page, setPage] = useState(1);

  const { data: asset } = useAsset(id);
  const { data, isLoading } = useAssetHistory(id, page);

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate(-1)}
          className="p-2 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div>
          <h1 className="text-base font-semibold text-gray-900">
            Histórico de alocações
          </h1>
          {asset && (
            <p className="text-xs text-gray-400 mt-0.5">
              <span className="font-mono bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">
                {asset.serial_number}
              </span>{" "}
              {asset.name}
            </p>
          )}
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr className="text-left text-gray-400 text-xs uppercase tracking-wide">
              <th className="px-4 py-3 font-medium">Responsável</th>
              <th className="px-4 py-3 font-medium">Alocado em</th>
              <th className="px-4 py-3 font-medium">Devolvido em</th>
              <th className="px-4 py-3 font-medium">Observações</th>
              <th className="px-4 py-3 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <SkeletonRows cols={5} rows={5} />
            ) : (
              <>
                {data?.items.map((a) => (
                  <tr key={a.id} className="border-t border-gray-50 hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-900">{a.user.name}</p>
                      <p className="text-xs text-gray-400">{a.user.email}</p>
                    </td>
                    <td className="px-4 py-3 text-gray-500 tabular-nums text-xs">{fmt(a.allocated_at)}</td>
                    <td className="px-4 py-3 text-gray-400 tabular-nums text-xs">{fmt(a.returned_at)}</td>
                    <td className="px-4 py-3 text-gray-400 text-xs max-w-xs truncate">
                      {a.notes ?? "—"}
                    </td>
                    <td className="px-4 py-3">
                      {a.is_active ? (
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                          <Clock className="w-3 h-3" />
                          Ativa
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                          <CheckCircle2 className="w-3 h-3" />
                          Encerrada
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
                {!data?.items.length && (
                  <tr>
                    <td colSpan={5}>
                      <div className="flex flex-col items-center justify-center py-14 text-center">
                        <History className="w-10 h-10 text-gray-200 mb-3" />
                        <p className="text-sm text-gray-400">Nenhuma alocação registrada para este ativo.</p>
                      </div>
                    </td>
                  </tr>
                )}
              </>
            )}
          </tbody>
        </table>
      </div>

      <Pagination page={page} totalPages={data?.total_pages ?? 1} onPage={setPage} />
    </div>
  );
}
