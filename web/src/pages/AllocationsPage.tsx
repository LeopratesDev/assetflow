import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import {
  useAllocations,
  useCreateAllocation,
  useReturnAllocation,
} from "../hooks/useAllocations";
import { useAssets } from "../hooks/useAssets";
import { getCurrentRole } from "../lib/auth";
import { Modal } from "../components/ui/Modal";
import { Pagination } from "../components/ui/Pagination";

const createSchema = z.object({
  asset_id: z.string().min(1, "Selecione um ativo"),
  user_id: z.string().min(1, "Informe o ID do usuário"),
  notes: z.string().optional(),
});
type CreateData = z.infer<typeof createSchema>;

export function AllocationsPage() {
  const [page, setPage] = useState(1);
  const [activeFilter, setActiveFilter] = useState<boolean | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [returningId, setReturningId] = useState<string | null>(null);
  const role = getCurrentRole();
  const isAdmin = role === "admin";

  const { data, isLoading } = useAllocations({
    page,
    active: activeFilter,
  });
  const { data: availableAssets } = useAssets({
    status: "available",
    pageSize: 100,
  });
  const create = useCreateAllocation();
  const returnAlloc = useReturnAllocation();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CreateData>({ resolver: zodResolver(createSchema) });

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

  const filterBtns = [
    { label: "Todas", value: null },
    { label: "Ativas", value: true },
    { label: "Encerradas", value: false },
  ] as const;

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold text-gray-900">Alocações</h1>
        {isAdmin && (
          <button
            onClick={() => setShowCreate(true)}
            className="rounded-lg bg-slate-800 text-white px-4 py-2 text-sm hover:bg-slate-700"
          >
            + Nova alocação
          </button>
        )}
      </div>

      <div className="flex gap-2 mb-4">
        {filterBtns.map((b) => (
          <button
            key={String(b.value)}
            onClick={() => {
              setActiveFilter(b.value);
              setPage(1);
            }}
            className={`rounded-lg px-3 py-1.5 text-sm border transition-colors ${
              activeFilter === b.value
                ? "bg-slate-800 text-white border-slate-800"
                : "border-gray-300 text-gray-600 hover:bg-gray-50"
            }`}
          >
            {b.label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <p className="text-gray-400">Carregando…</p>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr className="text-left text-gray-500 text-xs uppercase">
                <th className="px-4 py-3 font-medium">Ativo</th>
                <th className="px-4 py-3 font-medium">Usuário</th>
                <th className="px-4 py-3 font-medium">Alocado em</th>
                <th className="px-4 py-3 font-medium">Devolvido em</th>
                <th className="px-4 py-3 font-medium">Status</th>
                {isAdmin && <th className="px-4 py-3 font-medium">Ações</th>}
              </tr>
            </thead>
            <tbody>
              {data?.items.map((a) => (
                <tr
                  key={a.id}
                  className="border-t border-gray-100 hover:bg-gray-50"
                >
                  <td className="px-4 py-3 font-mono text-xs text-gray-700">
                    {a.asset.serial_number}
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-medium text-gray-900">{a.user.name}</div>
                    <div className="text-gray-400 text-xs">{a.user.email}</div>
                  </td>
                  <td className="px-4 py-3 text-gray-500">{a.allocated_at}</td>
                  <td className="px-4 py-3 text-gray-500">
                    {a.returned_at ?? "—"}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        a.is_active
                          ? "bg-blue-100 text-blue-800"
                          : "bg-gray-100 text-gray-600"
                      }`}
                    >
                      {a.is_active ? "Ativa" : "Encerrada"}
                    </span>
                  </td>
                  {isAdmin && (
                    <td className="px-4 py-3">
                      {a.is_active && (
                        <button
                          onClick={() => setReturningId(a.id)}
                          className="text-blue-600 hover:text-blue-800 text-xs"
                        >
                          Devolver
                        </button>
                      )}
                    </td>
                  )}
                </tr>
              ))}
              {!data?.items.length && (
                <tr>
                  <td
                    colSpan={isAdmin ? 6 : 5}
                    className="px-4 py-8 text-center text-gray-400"
                  >
                    Nenhuma alocação encontrada.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      <Pagination
        page={page}
        totalPages={data?.total_pages ?? 1}
        onPage={setPage}
      />

      {/* Modal: nova alocação */}
      {showCreate && (
        <Modal title="Nova alocação" onClose={() => setShowCreate(false)}>
          <form onSubmit={handleSubmit(onCreateSubmit)} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Ativo disponível *
              </label>
              <select
                {...register("asset_id")}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-500"
              >
                <option value="">Selecione…</option>
                {availableAssets?.items.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.serial_number} — {a.name}
                  </option>
                ))}
              </select>
              {errors.asset_id && (
                <p className="text-xs text-red-500 mt-1">
                  {errors.asset_id.message}
                </p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                ID do usuário *
              </label>
              <input
                {...register("user_id")}
                placeholder="UUID do usuário"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-500"
              />
              {errors.user_id && (
                <p className="text-xs text-red-500 mt-1">
                  {errors.user_id.message}
                </p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Observações
              </label>
              <textarea
                {...register("notes")}
                rows={2}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-500 resize-none"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowCreate(false)}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={create.isPending}
                className="rounded-lg bg-slate-800 text-white px-4 py-2 text-sm disabled:opacity-50 hover:bg-slate-700"
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

      {/* Modal: confirmação de devolução */}
      {returningId && (
        <Modal title="Confirmar devolução" onClose={() => setReturningId(null)}>
          <p className="text-sm text-gray-600 mb-4">
            Confirma a devolução do ativo hoje (
            {new Date().toLocaleDateString("pt-BR")})?
          </p>
          <div className="flex justify-end gap-2">
            <button
              onClick={() => setReturningId(null)}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50"
            >
              Cancelar
            </button>
            <button
              onClick={() => handleReturn(returningId)}
              disabled={returnAlloc.isPending}
              className="rounded-lg bg-blue-600 text-white px-4 py-2 text-sm disabled:opacity-50 hover:bg-blue-700"
            >
              {returnAlloc.isPending ? "Devolvendo…" : "Confirmar"}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
