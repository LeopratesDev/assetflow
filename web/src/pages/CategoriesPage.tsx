import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { useCategories, useCreateCategory, useDeleteCategory } from "../hooks/useCategories";
import { getCurrentRole } from "../lib/auth";
import { Modal } from "../components/ui/Modal";
import { Pagination } from "../components/ui/Pagination";

const schema = z.object({
  name: z.string().min(2, "Mínimo 2 caracteres"),
  description: z.string().optional(),
});
type FormData = z.infer<typeof schema>;

export function CategoriesPage() {
  const [page, setPage] = useState(1);
  const [showModal, setShowModal] = useState(false);
  const role = getCurrentRole();
  const isAdmin = role === "admin";

  const { data, isLoading } = useCategories(page);
  const create = useCreateCategory();
  const del = useDeleteCategory();

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
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Categorias</h1>
        {isAdmin && (
          <button
            onClick={() => setShowModal(true)}
            className="rounded-lg bg-slate-800 text-white px-4 py-2 text-sm hover:bg-slate-700"
          >
            + Nova categoria
          </button>
        )}
      </div>

      {isLoading ? (
        <p className="text-gray-400">Carregando…</p>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr className="text-left text-gray-500 text-xs uppercase">
                <th className="px-4 py-3 font-medium">Nome</th>
                <th className="px-4 py-3 font-medium">Descrição</th>
                {isAdmin && <th className="px-4 py-3 font-medium">Ações</th>}
              </tr>
            </thead>
            <tbody>
              {data?.items.map((c) => (
                <tr
                  key={c.id}
                  className="border-t border-gray-100 hover:bg-gray-50"
                >
                  <td className="px-4 py-3 font-medium text-gray-900">
                    {c.name}
                  </td>
                  <td className="px-4 py-3 text-gray-500">
                    {c.description ?? "—"}
                  </td>
                  {isAdmin && (
                    <td className="px-4 py-3">
                      <button
                        onClick={() => {
                          if (confirm(`Excluir "${c.name}"?`)) del.mutate(c.id);
                        }}
                        className="text-red-500 hover:text-red-700 text-xs"
                      >
                        Excluir
                      </button>
                    </td>
                  )}
                </tr>
              ))}
              {!data?.items.length && (
                <tr>
                  <td
                    colSpan={isAdmin ? 3 : 2}
                    className="px-4 py-8 text-center text-gray-400"
                  >
                    Nenhuma categoria cadastrada.
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

      {showModal && (
        <Modal title="Nova categoria" onClose={() => setShowModal(false)}>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nome *
              </label>
              <input
                {...register("name")}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-500"
              />
              {errors.name && (
                <p className="text-xs text-red-500 mt-1">{errors.name.message}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Descrição
              </label>
              <textarea
                {...register("description")}
                rows={3}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-500 resize-none"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={create.isPending}
                className="rounded-lg bg-slate-800 text-white px-4 py-2 text-sm disabled:opacity-50 hover:bg-slate-700"
              >
                {create.isPending ? "Salvando…" : "Salvar"}
              </button>
            </div>
            {create.error && (
              <p className="text-xs text-red-500">
                Erro ao salvar. Verifique se o nome já existe.
              </p>
            )}
          </form>
        </Modal>
      )}
    </div>
  );
}
