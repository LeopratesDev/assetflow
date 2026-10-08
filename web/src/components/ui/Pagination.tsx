interface Props {
  page: number;
  totalPages: number;
  onPage: (p: number) => void;
}

export function Pagination({ page, totalPages, onPage }: Props) {
  if (totalPages <= 1) return null;
  return (
    <div className="flex items-center justify-center gap-2 mt-4">
      <button
        onClick={() => onPage(page - 1)}
        disabled={page <= 1}
        className="rounded px-3 py-1 text-sm border border-gray-300 disabled:opacity-40 hover:bg-gray-50"
      >
        ← Anterior
      </button>
      <span className="text-sm text-gray-600">
        {page} / {totalPages}
      </span>
      <button
        onClick={() => onPage(page + 1)}
        disabled={page >= totalPages}
        className="rounded px-3 py-1 text-sm border border-gray-300 disabled:opacity-40 hover:bg-gray-50"
      >
        Próxima →
      </button>
    </div>
  );
}
