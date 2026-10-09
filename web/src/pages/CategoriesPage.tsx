import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import {
  Plus, Tag, Trash2, AlertTriangle, Search,
  ArrowUpDown, Pencil, Check, X,
} from "lucide-react";
import {
  useCategories,
  useCreateCategory,
  useUpdateCategory,
  useDeleteCategory,
} from "../hooks/useCategories";
import { useAssets } from "../hooks/useAssets";
import { getCurrentRole } from "../lib/auth";
import { Modal } from "../components/ui/Modal";
import { Pagination } from "../components/ui/Pagination";
import type { Category } from "../types";
import type { AssetStatus } from "../types";

const STATUS_COLORS: Record<AssetStatus, string> = {
  available:   "bg-emerald-500",
  allocated:   "bg-indigo-500",
  maintenance: "bg-amber-400",
  disposed:    "bg-gray-300",
};
const STATUS_LABELS: Record<AssetStatus, string> = {
  available:   "Disponível",
  allocated:   "Alocado",
  maintenance: "Manutenção",
  disposed:    "Descartado",
};

interface CategoryStats {
  total: number;
  byStatus: Partial<Record<AssetStatus, number>>;
}

function CategorySkeleton() {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
      <div className="w-10 h-10 rounded-xl bg-gray-100 animate-pulse mb-3" />
      <div className="h-4 bg-gray-100 rounded animate-pulse w-2/3 mb-2" />
      <div className="h-3 bg-gray-100 rounded animate-pulse w-full" />
    </div>
  );
}

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
  const [search, setSearch] = useState("");
  const [sortByCount, setSortByCount] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [deletingCategory, setDeletingCategory] = useState<{ id: string; name: string } | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const role = getCurrentRole();
  const isAdmin = role === "admin";
  const navigate = useNavigate();

  const { data, isLoading } = useCategories(page);
  const { data: allAssets } = useAssets({ pageSize: 100 });

  const statsById: Record<string, CategoryStats> = {};
  for (const asset of allAssets?.items ?? []) {
    if (!statsById[asset.category_id]) {
      statsById[asset.category_id] = { total: 0, byStatus: {} };
    }
    statsById[asset.category_id].total += 1;
    const s = asset.status as AssetStatus;
    statsById[asset.category_id].byStatus[s] = (statsById[asset.category_id].byStatus[s] ?? 0) + 1;
  }

  let filtered = search.trim()
    ? (data?.items ?? []).filter(
        (c) =>
          c.name.toLowerCase().includes(search.toLowerCase()) ||
          (c.description ?? "").toLowerCase().includes(search.toLowerCase())
      )
    : (data?.items ?? []);

  if (sortByCount) {
    filtered = [...filtered].sort(
      (a, b) => (statsById[b.id]?.total ?? 0) - (statsById[a.id]?.total ?? 0)
    );
  }

  const create = useCreateCategory();
  const update = useUpdateCategory();
  const del = useDeleteCategory();

  const { register, handleSubmit, reset, formState: { errors } } =
    useForm<FormData>({ resolver: zodResolver(schema) });

  function onSubmit(d: FormData) {
    create.mutate(d, {
      onSuccess: () => { setShowModal(false); reset(); },
    });
  }

  function startEdit(c: Category) {
    setEditingId(c.id);
    setEditName(c.name);
    setEditDesc(c.description ?? "");
  }

  function cancelEdit() {
    setEditingId(null);
  }

  function saveEdit(id: string) {
    update.mutate(
      { id, name: editName.trim(), description: editDesc.trim() || undefined },
      { onSuccess: () => setEditingId(null) }
    );
  }

  function handleCardClick(catId: string) {
    if (editingId === catId) return;
    navigate(`/assets?category_id=${catId}`);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar categoria…"
            className="w-full pl-9 pr-3 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          />
        </div>
        <button
          onClick={() => setSortByCount((v) => !v)}
          className={`flex items-center gap-1.5 rounded-lg border px-3 py-2.5 text-sm transition-colors ${
            sortByCount
              ? "border-indigo-300 bg-indigo-50 text-indigo-700"
              : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
          }`}
          title="Ordenar por quantidade de ativos"
        >
          <ArrowUpDown className="w-4 h-4" />
          Ordenar por ativos
        </button>
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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => <CategorySkeleton key={i} />)}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((c, i) => {
            const stats = statsById[c.id] ?? { total: 0, byStatus: {} };
            const isEditing = editingId === c.id;
            const statusEntries = (["available", "allocated", "maintenance", "disposed"] as AssetStatus[])
              .map((s) => ({ s, count: stats.byStatus[s] ?? 0 }))
              .filter((e) => e.count > 0);

            return (
              <div
                key={c.id}
                onClick={() => handleCardClick(c.id)}
                className={`animate-fadein bg-white rounded-xl border border-gray-200 p-5 shadow-sm transition-shadow group ${
                  isEditing ? "ring-2 ring-indigo-500" : "hover:shadow-md cursor-pointer"
                }`}
                style={{ animationDelay: `${i * 50}ms` }}
              >
                <div className="flex items-start justify-between">
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center border ${catColors[i % catColors.length]}`}
                  >
                    <Tag className="w-5 h-5" />
                  </div>
                  <div className="flex items-center gap-1">
                    {isAdmin && !isEditing && (
                      <>
                        <button
                          onClick={(e) => { e.stopPropagation(); startEdit(c); }}
                          className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg text-gray-300 hover:text-indigo-500 hover:bg-indigo-50 transition-all"
                          title="Editar"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); setDeletingCategory({ id: c.id, name: c.name }); }}
                          className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg text-gray-300 hover:text-red-500 hover:bg-red-50 transition-all"
                          title="Excluir"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </>
                    )}
                    {isEditing && (
                      <>
                        <button
                          onClick={(e) => { e.stopPropagation(); saveEdit(c.id); }}
                          disabled={update.isPending}
                          className="p-1.5 rounded-lg text-emerald-600 hover:bg-emerald-50 transition-colors"
                          title="Salvar"
                        >
                          <Check className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); cancelEdit(); }}
                          className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 transition-colors"
                          title="Cancelar"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {isEditing ? (
                  <div className="mt-3 space-y-2" onClick={(e) => e.stopPropagation()}>
                    <input
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="w-full rounded-lg border border-gray-200 px-3 py-1.5 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      placeholder="Nome da categoria"
                      autoFocus
                    />
                    <input
                      value={editDesc}
                      onChange={(e) => setEditDesc(e.target.value)}
                      className="w-full rounded-lg border border-gray-200 px-3 py-1.5 text-sm text-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      placeholder="Descrição (opcional)"
                    />
                  </div>
                ) : (
                  <>
                    <h3 className="mt-3 font-semibold text-gray-900">{c.name}</h3>
                    <p className="text-sm text-gray-400 mt-0.5">
                      {c.description ?? "Sem descrição"}
                    </p>
                  </>
                )}

                <div className="mt-4 pt-3 border-t border-gray-50">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-gray-400">
                      {stats.total === 0
                        ? "Nenhum ativo"
                        : `${stats.total} ativo${stats.total !== 1 ? "s" : ""}`}
                    </span>
                    {stats.total > 0 && (
                      <span className="text-xs text-indigo-500 font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                        Ver ativos →
                      </span>
                    )}
                  </div>
                  {stats.total > 0 && (
                    <>
                      <div className="flex h-1.5 rounded-full overflow-hidden gap-px">
                        {statusEntries.map(({ s, count }) => (
                          <div
                            key={s}
                            className={`${STATUS_COLORS[s]} transition-all`}
                            style={{ width: `${(count / stats.total) * 100}%` }}
                            title={`${STATUS_LABELS[s]}: ${count}`}
                          />
                        ))}
                      </div>
                      <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2">
                        {statusEntries.map(({ s, count }) => (
                          <span key={s} className="flex items-center gap-1 text-[11px] text-gray-400">
                            <span className={`w-1.5 h-1.5 rounded-full ${STATUS_COLORS[s]}`} />
                            {count} {STATUS_LABELS[s].toLowerCase()}
                          </span>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              </div>
            );
          })}

          {!filtered.length && (
            <div className="col-span-3 flex flex-col items-center justify-center py-16 text-center">
              <Tag className="w-10 h-10 text-gray-200 mb-3" />
              <p className="text-sm text-gray-400">Nenhuma categoria encontrada.</p>
              {isAdmin && !search && (
                <button
                  onClick={() => setShowModal(true)}
                  className="mt-4 flex items-center gap-1.5 rounded-lg bg-indigo-600 text-white px-4 py-2 text-sm font-medium hover:bg-indigo-700 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  Criar primeira categoria
                </button>
              )}
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
