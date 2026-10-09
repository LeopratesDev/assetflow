import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Plus, ArrowLeftRight, RotateCcw } from "lucide-react";
import {
  useAllocations,
  useCreateAllocation,
  useReturnAllocation,
} from "../hooks/useAllocations";
import { useAssets } from "../hooks/useAssets";
import { useUsers } from "../hooks/useUsers";
import { getCurrentRole } from "../lib/auth";
import { AllocationBadge } from "../components/ui/Badge";
import { Modal } from "../components/ui/Modal";
import { Pagination } from "../components/ui/Pagination";
import { SkeletonRows } from "../components/ui/SkeletonRow";

const createSchema = z.object({
  asset_id: z.string().min(1, "Selecione um ativo"),
  user_id: z.string().min(1, "Informe o ID do usuário"),
  notes: z.string().optional(),
});
type CreateData = z.infer<typeof createSchema>;

const filterBtns = [
  { label: "Todas", value: null },
  { label: "Ativas", value: true },
  { label: "Encerradas", value: false },
] as const;

export function AllocationsPage() {
  const [page, setPage] = useState(1);
  const [activeFilter, setActiveFilter] = useState<boolean | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [returningId, setReturningId] = useState<string | null>(null);
  const role = getCurrentRole();
  const isAdmin = role === "admin";

  const { data, isLoading } = useAllocations({ page, active: activeFilter });
  const { data: availableAssets } = useAssets({ status: "available", pageSize: 100 });
  const { data: users } = useUsers();
  const create = useCreateAllocation();
  const returnAlloc = useReturnAllocation();

  const { register, handleSubmit, reset, formState: { errors } } =
    useForm<CreateData>({ resolver: zodResolver(createSchema) });

  function onCreateSubmit(d: CreateData) {
    create.mutate(d, {
      onSuccess: () => {
        setShowCreate(false);
        reset();
      },
    });
  }

  function handleReturn(id: string) {
    const today = new Date().toISOString().split("T")[0];
    returnAlloc.mutate(
      { id, returned_at: today },
      { onSuccess: () => setReturningId(null) }
    );
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1.5 bg-white border border-gray-200 rounded-lg p-1 shadow-sm">
          {filterBtns.map((b) => (
            <button
              key={String(b.value)}
              onClick={() => { setActiveFilter(b.value); setPage(1); }}
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition-all ${
                activeFilter === b.value
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "text-gray-500 hover:text-gray-900"
              }`}
            >
              {b.label}
            </button>
          ))}
        </div>
        {isAdmin && (
          <button
            onClick={() => setShowCreate(true)}
            className="ml-auto flex items-center gap-1.5 rounded-lg bg-indigo-600 text-white px-4 py-2.5 text-sm font-medium hover:bg-indigo-700 shadow-sm transition-colors"
          >
            <Plus className="w-4 h-4" />
            Nova alocação
          </button>
        )}
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr className="text-left text-gray-400 text-xs uppercase tracking-wide">
              <th className="px-4 py-3 font-medium">Ativo</th>
              <th className="px-4 py-3 font-medium">Responsável</th>
              <th className="px-4 py-3 font-medium">Alocado em</th>
              <th className="px-4 py-3 font-medium">Devolvido em</th>
              <th className="px-4 py-3 font-medium">Status</th>
              {isAdmin && <th className="px-4 py-3 font-medium w-10" />}
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <SkeletonRows cols={isAdmin ? 6 : 5} rows={5} />
            ) : (
              <>
              {data?.items.map((a) => (
                <tr key={a.id} className="border-t border-gray-50 hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">
                    <span className="font-mono text-xs bg-gray-100 text-gray-700 px-2 py-0.5 rounded-md">
                      {a.asset.serial_number}
                    </span>
                    <p className="text-xs text-gray-400 mt-0.5">{a.asset.name}</p>
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-900">{a.user.name}</p>
                    <p className="text-xs text-gray-400">{a.user.email}</p>
                  </td>
                  <td className="px-4 py-3 text-gray-500 tabular-nums text-xs">{a.allocated_at}</td>
                  <td className="px-4 py-3 text-gray-400 tabular-nums text-xs">
                    {a.returned_at ?? "—"}
                  </td>
                  <td className="px-4 py-3">
                    <AllocationBadge active={a.is_active} />
                  </td>
                  {isAdmin && (
                    <td className="px-4 py-3">
                      {a.is_active && (
                        <button
                          onClick={() => setReturningId(a.id)}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                          title="Registrar devolução"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </td>
                  )}
                </tr>
              ))}
              {!data?.items.length && (
                <tr>
                  <td colSpan={isAdmin ? 6 : 5}>
                    <div className="flex flex-col items-center justify-center py-14 text-center">
                      <ArrowLeftRight className="w-10 h-10 text-gray-200 mb-3" />
                      <p className="text-sm text-gray-400">Nenhuma alocação encontrada.</p>
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

      {/* Modal: nova alocação */}
      {showCreate && (
        <Modal
          title="Nova alocação"
          subtitle="Vincule um ativo disponível a um colaborador"
          onClose={() => { setShowCreate(false); reset(); }}
        >
          <form onSubmit={handleSubmit(onCreateSubmit)} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Ativo disponível *</label>
              <select
                {...register("asset_id")}
                className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">Selecione o ativo…</option>
                {availableAssets?.items.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.serial_number} — {a.name}
                  </option>
                ))}
              </select>
              {errors.asset_id && (
                <p className="text-xs text-red-500 mt-1">{errors.asset_id.message}</p>
              )}
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Colaborador *</label>
              <select
                {...register("user_id")}
                className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">Selecione o colaborador…</option>
                {users?.items.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name} — {u.email}
                  </option>
                ))}
              </select>
              {errors.user_id && (
                <p className="text-xs text-red-500 mt-1">{errors.user_id.message}</p>
              )}
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Observações</label>
              <textarea
                {...register("notes")}
                rows={2}
                placeholder="Motivo, projeto, setor…"
                className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
              />
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => { setShowCreate(false); reset(); }}
                className="rounded-lg border border-gray-200 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={create.isPending}
                className="rounded-lg bg-indigo-600 text-white px-4 py-2 text-sm font-medium disabled:opacity-50 hover:bg-indigo-700 transition-colors"
              >
                {create.isPending ? "Alocando…" : "Alocar"}
              </button>
            </div>
            {create.error && (
              <p className="text-xs text-red-500">
                Erro ao alocar. Verifique se o ativo ainda está disponível.
              </p>
            )}
          </form>
        </Modal>
      )}

      {/* Modal: confirmar devolução */}
      {returningId && (
        <Modal
          title="Confirmar devolução"
          subtitle="Esta ação encerrará a alocação e liberará o ativo"
          size="sm"
          onClose={() => setReturningId(null)}
        >
          <p className="text-sm text-gray-600 mb-5">
            Confirma a devolução do ativo em{" "}
            <span className="font-semibold text-gray-900">
              {new Date().toLocaleDateString("pt-BR")}
            </span>
            ?
          </p>
          <div className="flex justify-end gap-2">
            <button
              onClick={() => setReturningId(null)}
              className="rounded-lg border border-gray-200 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50 transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={() => handleReturn(returningId)}
              disabled={returnAlloc.isPending}
              className="rounded-lg bg-indigo-600 text-white px-4 py-2 text-sm font-medium disabled:opacity-50 hover:bg-indigo-700 transition-colors"
            >
              {returnAlloc.isPending ? "Registrando…" : "Confirmar devolução"}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
