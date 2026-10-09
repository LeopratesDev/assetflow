interface SkeletonRowProps {
  cols: number;
}

export function SkeletonRow({ cols }: SkeletonRowProps) {
  return (
    <tr>
      {Array.from({ length: cols }).map((_, i) => (
        <td key={i} className="px-4 py-3">
          <div className="h-4 bg-gray-100 rounded animate-pulse" style={{ width: `${60 + (i % 3) * 20}%` }} />
        </td>
      ))}
    </tr>
  );
}

export function SkeletonRows({ rows, cols }: { rows?: number; cols: number }) {
  return (
    <>
      {Array.from({ length: rows ?? 5 }).map((_, i) => (
        <SkeletonRow key={i} cols={cols} />
      ))}
    </>
  );
}
