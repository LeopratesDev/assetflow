import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Plus, Tag, Trash2, AlertTriangle } from "lucide-react";
import {
  useCategories,
  useCreateCategory,
  useDeleteCategory,
} from "../hooks/useCategories";
import { getCurrentRole } from "../lib/auth";
import { Modal } from "../components/ui/Modal";
import { Pagination } from "../components/ui/Pagination";

const schema = z.object({
  name: z.string().min(2, "Mínimo 2 caracteres"),
  description: z.string().optional(),
});
type FormData = z.infer<typeof schema>;

const catColors = [
  "bg-indigo-50 text-indigo-600 border-indigo-100",
  "bg-emerald-50 text-emerald-600 border-emerald-100",
  "bg-amber-50 text-amber-600 border-amber-100",
  "bg-rose-50 text-rose-600 border-rose-100",
  "bg-violet-50 text-violet-600 border-violet-100",
];

export function CategoriesPage() {
  const [page, setPage] = useState(1);
  const [showModal, setShowModal] = useState(false);
  const [deletingCategory, setDeletingCategory] = useState<{ id: string; name: string } | null>(null);
  const role = getCurrentRole();
  const isAdmin = role === "admin";

  const { data, isLoading } = useCategories(page);
  const create = useCreateCategory();
  const del = useDeleteCategory();

  const { register, handleSubmit, reset, formState: { errors } } =
    useForm<FormData>({ resolver: zodResolver(schema) });

  function onSubmit(d: FormData) {
    create.mutate(d, {
      onSuccess: () => {
        setShowModal(false);
        reset();
      },
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        {isAdmin && (
          <button
            onClick={() => setShowModal(true)}
            className="ml-auto flex items-center gap-1.5 rounded-lg bg-indigo-600 text-white px-4 py-2.5 text-sm font-medium hover:bg-indigo-700 shadow-sm transition-colors"
          >
            <Plus className="w-4 h-4" />
            Nova categoria
          </button>
        )}
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {data?.items.map((c, i) => (
            <div
              key={c.id}
              className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm hover:shadow-md transition-shadow group"
            >
              <div className="flex items-start justify-between">
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center border ${catColors[i % catColors.length]}`}
                >
                  <Tag className="w-5 h-5" />
                </div>
                {isAdmin && (
                  <button
                    onClick={() => setDeletingCategory({ id: c.id, name: c.name })}
                    className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg text-gray-300 hover:text-red-500 hover:bg-red-50 transition-all"
                    title="Excluir"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
              <h3 className="mt-3 font-semibold text-gray-900">{c.name}</h3>
              <p className="text-sm text-gray-400 mt-0.5">
                {c.description ?? "Sem descrição"}
              </p>
            </div>
          ))}

          {!data?.items.length && (
            <div className="col-span-3 flex flex-col items-center justify-center py-16 text-center">
              <Tag className="w-10 h-10 text-gray-200 mb-3" />
              <p className="text-sm text-gray-400">Nenhuma categoria cadastrada.</p>
            </div>
          )}
        </div>
      )}

      <Pagination page={page} totalPages={data?.total_pages ?? 1} onPage={setPage} />

      {deletingCategory && (
        <Modal
          title="Excluir categoria"
          subtitle={deletingCategory.name}
          size="sm"
          onClose={() => setDeletingCategory(null)}
        >
          <div className="flex items-start gap-3 mb-5">
            <div className="w-9 h-9 rounded-full bg-red-50 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-4 h-4 text-red-500" />
            </div>
            <p className="text-sm text-gray-600 pt-1.5">
              Tem certeza que deseja excluir a categoria{" "}
              <span className="font-semibold text-gray-900">"{deletingCategory.name}"</span>?
              Esta ação não pode ser desfeita.
            </p>
          </div>
          <div className="flex justify-end gap-2">
            <button
              onClick={() => setDeletingCategory(null)}
              className="rounded-lg border border-gray-200 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50 transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={() => {
                del.mutate(deletingCategory.id, { onSuccess: () => setDeletingCategory(null) });
              }}
              disabled={del.isPending}
              className="rounded-lg bg-red-600 text-white px-4 py-2 text-sm font-medium disabled:opacity-50 hover:bg-red-700 transition-colors"
            >
              {del.isPending ? "Excluindo…" : "Excluir"}
            </button>
          </div>
        </Modal>
      )}

      {showModal && (
        <Modal
          title="Nova categoria"
          subtitle="Tipos de equipamento para organizar o inventário"
          onClose={() => { setShowModal(false); reset(); }}
        >
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Nome *</label>
              <input
                {...register("name")}
                placeholder="Ex: Notebook, Monitor…"
                className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
              {errors.name && (
                <p className="text-xs text-red-500 mt-1">{errors.name.message}</p>
              )}
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Descrição</label>
              <textarea
                {...register("description")}
                rows={3}
                placeholder="Descreva o tipo de equipamento…"
                className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
              />
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => { setShowModal(false); reset(); }}
                className="rounded-lg border border-gray-200 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={create.isPending}
                className="rounded-lg bg-indigo-600 text-white px-4 py-2 text-sm font-medium disabled:opacity-50 hover:bg-indigo-700 transition-colors"
              >
                {create.isPending ? "Salvando…" : "Criar"}
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
