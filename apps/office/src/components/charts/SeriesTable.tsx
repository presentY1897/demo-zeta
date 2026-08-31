/** 모든 차트의 표 전환 뷰 — 툴팁 없이도 전 값에 접근 가능해야 한다 */
export function SeriesTable({
  labels,
  series,
  format,
}: {
  labels: string[];
  series: { label: string; color: string; values: number[] }[];
  format: (n: number) => string;
}) {
  return (
    <div className="max-h-64 overflow-auto rounded-lg border border-line">
      <table className="w-full text-[12px] tabular-nums">
        <thead className="sticky top-0 bg-surface-2 text-text-sub">
          <tr>
            <th className="px-3 py-2 text-left font-semibold">구간</th>
            {series.map((s) => (
              <th key={s.label} className="px-3 py-2 text-right font-semibold">
                <span
                  aria-hidden
                  className="mr-1.5 inline-block h-[3px] w-3 rounded-full align-middle"
                  style={{ background: s.color }}
                />
                {s.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {labels.map((label, i) => (
            <tr key={label}>
              <td className="px-3 py-1.5 text-text-sub">{label}</td>
              {series.map((s) => (
                <td key={s.label} className="px-3 py-1.5 text-right">
                  {format(s.values[i] ?? 0)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
