import { useState, useRef, useEffect } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import toast from "react-hot-toast";
import { Plus, Search, Download, Monitor, Pencil, History, X, ChevronDown, FileSpreadsheet, FileText } from "lucide-react";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { Document, Packer, Paragraph, Table, TableRow, TableCell, TextRun, WidthType, HeadingLevel, AlignmentType } from "docx";
import {
  useAssets,
  useCreateAsset,
  useDeleteAsset,
  useUpdateAsset,
} from "../hooks/useAssets";
import { useCategories } from "../hooks/useCategories";
import { useNavigate, useSearchParams } from "react-router-dom";
import { getCurrentRole } from "../lib/auth";
import { StatusBadge } from "../components/ui/Badge";
import { Modal } from "../components/ui/Modal";
import { Pagination } from "../components/ui/Pagination";
import { SkeletonRows } from "../components/ui/SkeletonRow";
import type { Asset, AssetStatus } from "../types";

const STATUS_OPTIONS: { value: AssetStatus | ""; label: string }[] = [
  { value: "", label: "Todos os status" },
  { value: "available", label: "Disponível" },
  { value: "allocated", label: "Alocado" },
  { value: "maintenance", label: "Manutenção" },
  { value: "disposed", label: "Descartado" },
];

const createSchema = z.object({
  serial_number: z.string().min(1, "Obrigatório"),
  name: z.string().min(2, "Mínimo 2 caracteres"),
  brand: z.string().min(1, "Obrigatório"),
  model: z.string().min(1, "Obrigatório"),
  category_id: z.string().min(1, "Selecione uma categoria"),
  notes: z.string().optional(),
});
type CreateData = z.infer<typeof createSchema>;

const editSchema = z.object({
  serial_number: z.string().min(1, "Obrigatório"),
  name: z.string().min(2, "Mínimo 2 caracteres"),
  brand: z.string().min(1, "Obrigatório"),
  model: z.string().min(1, "Obrigatório"),
  category_id: z.string().min(1, "Selecione uma categoria"),
  status: z.enum(["available", "allocated", "maintenance", "disposed"]),
  notes: z.string().optional(),
});
type EditData = z.infer<typeof editSchema>;

const fmt = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

const fieldLabels: Record<string, string> = {
  serial_number: "Número de série",
  name: "Nome",
  brand: "Marca",
  model: "Modelo",
};

const EXPORT_HEADERS = ["Serial", "Nome", "Marca", "Modelo", "Categoria", "Data de compra", "Valor", "Status"];

function getRows(items: Asset[]) {
  return items.map((a) => [
    a.serial_number,
    a.name,
    a.brand,
    a.model,
    a.category.name,
    a.purchase_date ?? "",
    a.purchase_value ? `R$ ${parseFloat(a.purchase_value).toFixed(2).replace(".", ",")}` : "",
    a.status,
  ]);
}

function exportExcel(items: Asset[]) {
  const ws = XLSX.utils.aoa_to_sheet([EXPORT_HEADERS, ...getRows(items)]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Ativos");
  XLSX.writeFile(wb, `ativos-${new Date().toISOString().slice(0, 10)}.xlsx`);
  toast.success(`${items.length} ativos exportados para Excel`);
}

function exportPdf(items: Asset[]) {
  const doc = new jsPDF({ orientation: "landscape" });
  doc.setFontSize(14);
  doc.text("Relatório de Ativos", 14, 15);
  doc.setFontSize(9);
  doc.setTextColor(120);
  doc.text(`Gerado em ${new Date().toLocaleDateString("pt-BR")}`, 14, 21);
  autoTable(doc, {
    head: [EXPORT_HEADERS],
    body: getRows(items),
    startY: 26,
    styles: { fontSize: 8 },
    headStyles: { fillColor: [79, 70, 229] },
  });
  doc.save(`ativos-${new Date().toISOString().slice(0, 10)}.pdf`);
  toast.success(`${items.length} ativos exportados para PDF`);
}

async function exportWord(items: Asset[]) {
  const headerCells = EXPORT_HEADERS.map(
    (h) =>
      new TableCell({
        children: [new Paragraph({ children: [new TextRun({ text: h, bold: true, size: 18 })] })],
        width: { size: Math.floor(9000 / EXPORT_HEADERS.length), type: WidthType.DXA },
      })
  );
  const dataRows = getRows(items).map(
    (row) =>
      new TableRow({
        children: row.map(
          (cell) =>
            new TableCell({
              children: [new Paragraph({ children: [new TextRun({ text: String(cell), size: 16 })] })],
              width: { size: Math.floor(9000 / EXPORT_HEADERS.length), type: WidthType.DXA },
            })
        ),
      })
  );
  const doc = new Document({
    sections: [
      {
        children: [
          new Paragraph({
            text: "Relatório de Ativos",
            heading: HeadingLevel.HEADING_1,
            alignment: AlignmentType.LEFT,
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: `Gerado em ${new Date().toLocaleDateString("pt-BR")}`,
                size: 18,
                color: "777777",
              }),
            ],
          }),
          new Paragraph({ text: "" }),
          new Table({
            rows: [new TableRow({ children: headerCells }), ...dataRows],
            width: { size: 9000, type: WidthType.DXA },
          }),
        ],
      },
    ],
  });
  const blob = await Packer.toBlob(doc);
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `ativos-${new Date().toISOString().slice(0, 10)}.docx`;
  a.click();
  URL.revokeObjectURL(url);
  toast.success(`${items.length} ativos exportados para Word`);
}

export function AssetsPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<AssetStatus | "">("");
  const [showCreate, setShowCreate] = useState(false);
  const [editingAsset, setEditingAsset] = useState<Asset | null>(null);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const exportRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (exportRef.current && !exportRef.current.contains(e.target as Node)) {
        setShowExportMenu(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const categoryFilter = searchParams.get("category_id") ?? undefined;
  const role = getCurrentRole();
  const isAdmin = role === "admin";

  const { data, isLoading } = useAssets({
    page,
    search: search || undefined,
    status: status || undefined,
    category_id: categoryFilter,
  });
  const { data: allAssets } = useAssets({ pageSize: 100, category_id: categoryFilter });
  const { data: cats } = useCategories(1, 100);
  const activeCat = categoryFilter
    ? cats?.items.find((c) => c.id === categoryFilter)
    : undefined;
  const create = useCreateAsset();
  const update = useUpdateAsset();
  const del = useDeleteAsset();

  const createForm = useForm<CreateData>({ resolver: zodResolver(createSchema) });
  const editForm = useForm<EditData>({ resolver: zodResolver(editSchema) });

  function onCreateSubmit(d: CreateData) {
    create.mutate(d, {
      onSuccess: () => {
        setShowCreate(false);
        createForm.reset();
      },
    });
  }

  function openEdit(asset: Asset) {
    setEditingAsset(asset);
    editForm.reset({
      serial_number: asset.serial_number,
      name: asset.name,
      brand: asset.brand,
      model: asset.model,
      category_id: asset.category_id,
      status: asset.status,
      notes: asset.notes ?? "",
    });
  }

  function onEditSubmit(d: EditData) {
    if (!editingAsset) return;
    update.mutate(
      { id: editingAsset.id, ...d },
      { onSuccess: () => setEditingAsset(null) }
    );
  }

  function handleDelete(asset: Asset) {
    if (asset.status === "allocated") return;
    del.mutate(asset.id, { onSuccess: () => setEditingAsset(null) });
  }

  return (
    <div className="space-y-4">
      {activeCat && (
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500">Filtrado por categoria:</span>
          <span className="flex items-center gap-1.5 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-700 px-3 py-1 text-sm font-medium">
            {activeCat.name}
            <button
              onClick={() => setSearchParams({})}
              className="text-indigo-400 hover:text-indigo-700 transition-colors"
              title="Remover filtro"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </span>
        </div>
      )}
      {/* Toolbar */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          <input
            placeholder="Buscar por nome ou serial…"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="w-full pl-9 pr-4 py-2.5 rounded-lg border border-gray-200 text-sm bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          />
        </div>
        <select
          value={status}
          onChange={(e) => { setStatus(e.target.value as AssetStatus | ""); setPage(1); }}
          className="rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-700"
        >
          {STATUS_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
        <div ref={exportRef} className="relative">
          <button
            onClick={() => setShowExportMenu((v) => !v)}
            className="flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-600 shadow-sm hover:bg-gray-50 transition-colors"
          >
            <Download className="w-4 h-4" />
            Exportar
            <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
          </button>
          {showExportMenu && (
            <div className="absolute right-0 mt-1 w-44 rounded-lg border border-gray-200 bg-white shadow-lg z-10 py-1">
              <button
                onClick={() => { allAssets?.items && exportExcel(allAssets.items); setShowExportMenu(false); }}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
              >
                <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                Excel (.xlsx)
              </button>
              <button
                onClick={() => { allAssets?.items && exportPdf(allAssets.items); setShowExportMenu(false); }}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
              >
                <FileText className="w-4 h-4 text-red-500" />
                PDF (.pdf)
              </button>
              <button
                onClick={() => { allAssets?.items && exportWord(allAssets.items); setShowExportMenu(false); }}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
              >
                <FileText className="w-4 h-4 text-blue-600" />
                Word (.docx)
              </button>
            </div>
          )}
        </div>
        {isAdmin && (
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-1.5 rounded-lg bg-indigo-600 text-white px-4 py-2.5 text-sm font-medium hover:bg-indigo-700 shadow-sm transition-colors"
          >
            <Plus className="w-4 h-4" />
            Novo ativo
          </button>
        )}
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr className="text-left text-gray-400 text-xs uppercase tracking-wide">
              <th className="px-4 py-3 font-medium">Serial</th>
              <th className="px-4 py-3 font-medium">Nome</th>
              <th className="px-4 py-3 font-medium">Marca / Modelo</th>
              <th className="px-4 py-3 font-medium">Categoria</th>
              <th className="px-4 py-3 font-medium hidden lg:table-cell">Data de compra</th>
              <th className="px-4 py-3 font-medium">Valor</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium w-10" />
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <SkeletonRows cols={isAdmin ? 8 : 8} rows={6} />
            ) : (
              <>
              {data?.items.map((a) => (
                <tr
                  key={a.id}
                  className="border-t border-gray-50 hover:bg-gray-50 transition-colors"
                >
                  <td className="px-4 py-3">
                    <span className="font-mono text-xs bg-gray-100 text-gray-700 px-2 py-0.5 rounded-md">
                      {a.serial_number}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-medium text-gray-900">{a.name}</td>
                  <td className="px-4 py-3 text-gray-500">{a.brand} · {a.model}</td>
                  <td className="px-4 py-3 text-gray-500">{a.category.name}</td>
                  <td className="px-4 py-3 text-gray-400 tabular-nums text-xs hidden lg:table-cell">
                    {a.purchase_date
                      ? new Date(a.purchase_date + "T00:00:00").toLocaleDateString("pt-BR")
                      : "—"}
                  </td>
                  <td className="px-4 py-3 text-gray-500 tabular-nums text-xs">
                    {a.purchase_value ? fmt.format(parseFloat(a.purchase_value)) : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={a.status} />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => navigate(`/assets/${a.id}/history`)}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 transition-colors"
                        title="Ver histórico"
                      >
                        <History className="w-3.5 h-3.5" />
                      </button>
                      {isAdmin && (
                        <button
                          onClick={() => openEdit(a)}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                          title="Editar"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {!data?.items.length && (
                <tr>
                  <td colSpan={8}>
                    <div className="flex flex-col items-center justify-center py-14 text-center">
                      <Monitor className="w-10 h-10 text-gray-200 mb-3" />
                      <p className="text-sm text-gray-400">Nenhum ativo encontrado.</p>
                      {search && (
                        <p className="text-xs text-gray-300 mt-1">
                          Tente um termo diferente ou limpe os filtros.
                        </p>
                      )}
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

      {/* Modal: novo ativo */}
      {showCreate && (
        <Modal
          title="Novo ativo"
          subtitle="Preencha as informações do equipamento"
          onClose={() => { setShowCreate(false); createForm.reset(); }}
        >
          <form onSubmit={createForm.handleSubmit(onCreateSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              {(["serial_number", "name", "brand", "model"] as const).map((field) => (
                <div key={field} className={field === "name" ? "col-span-2" : ""}>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    {fieldLabels[field]} *
                  </label>
                  <input
                    {...createForm.register(field)}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                  {createForm.formState.errors[field] && (
                    <p className="text-xs text-red-500 mt-1">
                      {createForm.formState.errors[field]?.message}
                    </p>
                  )}
                </div>
              ))}
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Categoria *</label>
              <select
                {...createForm.register("category_id")}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">Selecione…</option>
                {cats?.items.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
              {createForm.formState.errors.category_id && (
                <p className="text-xs text-red-500 mt-1">
                  {createForm.formState.errors.category_id.message}
                </p>
              )}
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Observações</label>
              <textarea
                {...createForm.register("notes")}
                rows={2}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
              />
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => { setShowCreate(false); createForm.reset(); }}
                className="rounded-lg border border-gray-200 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={create.isPending}
                className="rounded-lg bg-indigo-600 text-white px-4 py-2 text-sm font-medium disabled:opacity-50 hover:bg-indigo-700 transition-colors"
              >
                {create.isPending ? "Salvando…" : "Cadastrar"}
              </button>
            </div>
            {create.error && (
              <p className="text-xs text-red-500">
                Erro ao salvar. Verifique se o número de série já existe.
              </p>
            )}
          </form>
        </Modal>
      )}

      {/* Modal: editar ativo */}
      {editingAsset && (
        <Modal
          title="Editar ativo"
          subtitle={editingAsset.serial_number}
          onClose={() => setEditingAsset(null)}
        >
          <form onSubmit={editForm.handleSubmit(onEditSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              {(["serial_number", "name", "brand", "model"] as const).map((field) => (
                <div key={field} className={field === "name" ? "col-span-2" : ""}>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    {fieldLabels[field]} *
                  </label>
                  <input
                    {...editForm.register(field)}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                  {editForm.formState.errors[field] && (
                    <p className="text-xs text-red-500 mt-1">
                      {editForm.formState.errors[field]?.message}
                    </p>
                  )}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Categoria *</label>
                <select
                  {...editForm.register("category_id")}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  {cats?.items.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Status</label>
                <select
                  {...editForm.register("status")}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  {STATUS_OPTIONS.filter((o) => o.value !== "").map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Observações</label>
              <textarea
                {...editForm.register("notes")}
                rows={2}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
              />
            </div>
            <div className="flex items-center justify-between pt-1 border-t border-gray-100">
              <button
                type="button"
                onClick={() => handleDelete(editingAsset)}
                disabled={editingAsset.status === "allocated" || del.isPending}
                title={
                  editingAsset.status === "allocated"
                    ? "Devolva o ativo antes de excluir"
                    : "Excluir ativo"
                }
                className="rounded-lg px-3 py-2 text-sm text-red-500 hover:bg-red-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                {del.isPending ? "Excluindo…" : "Excluir"}
              </button>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setEditingAsset(null)}
                  className="rounded-lg border border-gray-200 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={update.isPending}
                  className="rounded-lg bg-indigo-600 text-white px-4 py-2 text-sm font-medium disabled:opacity-50 hover:bg-indigo-700 transition-colors"
                >
                  {update.isPending ? "Salvando…" : "Salvar"}
                </button>
              </div>
            </div>
            {update.error && (
              <p className="text-xs text-red-500">Erro ao salvar. Tente novamente.</p>
            )}
          </form>
        </Modal>
      )}
    </div>
  );
}
