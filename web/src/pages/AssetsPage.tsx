import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { useAssets, useCreateAsset, useDeleteAsset } from "../hooks/useAssets";
import { useCategories } from "../hooks/useCategories";
import { getCurrentRole } from "../lib/auth";
import { StatusBadge } from "../components/ui/Badge";
import { Modal } from "../components/ui/Modal";
import { Pagination } from "../components/ui/Pagination";
import type { AssetStatus } from "../types";

const STATUS_OPTIONS: { value: AssetStatus | ""; label: string }[] = [
  { value: "", label: "Todos os status" },
  { value: "available", label: "Disponível" },
  { value: "allocated", label: "Alocado" },
  { value: "maintenance", label: "Manutenção" },
  { value: "disposed", label: "Descartado" },
];

const schema = z.object({
  serial_number: z.string().min(1, "Obrigatório"),
  name: z.string().min(2, "Mínimo 2 caracteres"),
  brand: z.string().min(1, "Obrigatório"),
  model: z.string().min(1, "Obrigatório"),
  category_id: z.string().min(1, "Selecione uma categoria"),
  notes: z.string().optional(),
});
type FormData = z.infer<typeof schema>;

export function AssetsPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<AssetStatus | "">("");
  const [showModal, setShowModal] = useState(false);
  const role = getCurrentRole();
  const isAdmin = role === "admin";

  const { data, isLoading } = useAssets({ page, search: search || undefined, status: status || undefined });
  const { data: cats } = useCategories(1, 100);
  const create = useCreateAsset();
  const del = useDeleteAsset();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  function onSubmit(d: FormData) {
    create.mutate(d, {
      onSuccess: () => {
        setShowModal(false);
        reset();
      },
    });
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold text-gray-900">Ativos</h1>
        {isAdmin && (
          <button
            onClick={() => setShowModal(true)}
            className="rounded-lg bg-slate-800 text-white px-4 py-2 text-sm hover:bg-slate-700"
          >
            + Novo ativo
          </button>
        )}
      </div>

      <div className="flex gap-3 mb-4">
        <input
          placeholder="Buscar por nome ou serial…"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
        />
        <select
          value={status}
          onChange={(e) => { setStatus(e.target.value as AssetStatus | ""); setPage(1); }}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
        >
          {STATUS_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </div>

      {isLoading ? (
        <p className="text-gray-400">Carregando…</p>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr className="text-left text-gray-500 text-xs uppercase">
                <th className="px-4 py-3 font-medium">Serial</th>
                <th className="px-4 py-3 font-medium">Nome</th>
                <th className="px-4 py-3 font-medium">Marca / Modelo</th>
                <th className="px-4 py-3 font-medium">Categoria</th>
                <th className="px-4 py-3 font-medium">Status</th>
                {isAdmin && <th className="px-4 py-3 font-medium">Ações</th>}
              </tr>
            </thead>
            <tbody>
              {data?.items.map((a) => (
                <tr key={a.id} className="border-t border-gray-100 hover:bg-gray-50">
                  <td className="px-4 py-3 font-mono text-xs text-gray-700">{a.serial_number}</td>
                  <td className="px-4 py-3 font-medium text-gray-900">{a.name}</td>
                  <td className="px-4 py-3 text-gray-500">{a.brand} {a.model}</td>
                  <td className="px-4 py-3 text-gray-500">{a.category.name}</td>
                  <td className="px-4 py-3"><StatusBadge status={a.status} /></td>
                  {isAdmin && (
                    <td className="px-4 py-3">
                      <button
                        onClick={() => {
                          if (confirm(`Excluir "${a.name}"?`)) del.mutate(a.id);
                        }}
                        className="text-red-500 hover:text-red-700 text-xs"
                        disabled={a.status === "allocated"}
                        title={a.status === "allocated" ? "Devolva o ativo antes de excluir" : ""}
                      >
                        Excluir
                      </button>
                    </td>
                  )}
                </tr>
              ))}
              {!data?.items.length && (
                <tr>
                  <td colSpan={isAdmin ? 6 : 5} className="px-4 py-8 text-center text-gray-400">
                    Nenhum ativo encontrado.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      <Pagination page={page} totalPages={data?.total_pages ?? 1} onPage={setPage} />

      {showModal && (
        <Modal title="Novo ativo" onClose={() => setShowModal(false)}>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
            {(["serial_number", "name", "brand", "model"] as const).map((field) => (
              <div key={field}>
                <label className="block text-sm font-medium text-gray-700 mb-1 capitalize">
                  {field.replace("_", " ")} *
                </label>
                <input
                  {...register(field)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-500"
                />
                {errors[field] && (
                  <p className="text-xs text-red-500 mt-1">{errors[field]?.message}</p>
                )}
              </div>
            ))}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Categoria *
              </label>
              <select
                {...register("category_id")}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-500"
              >
                <option value="">Selecione…</option>
                {cats?.items.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
              {errors.category_id && (
                <p className="text-xs text-red-500 mt-1">{errors.category_id.message}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Observações</label>
              <textarea
                {...register("notes")}
                rows={2}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-500 resize-none"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => setShowModal(false)}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50">
                Cancelar
              </button>
              <button type="submit" disabled={create.isPending}
                className="rounded-lg bg-slate-800 text-white px-4 py-2 text-sm disabled:opacity-50 hover:bg-slate-700">
                {create.isPending ? "Salvando…" : "Salvar"}
              </button>
            </div>
            {create.error && (
              <p className="text-xs text-red-500">Erro ao salvar. Verifique se o serial já existe.</p>
            )}
          </form>
        </Modal>
      )}
    </div>
  );
}
