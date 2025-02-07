import { clsx } from "clsx";

interface Period {
  period: number;
  users: number;
  percentage: number;
}

interface CohortRow {
  cohort: string;
  cohort_size: number;
  periods: Period[];
}

interface Props {
  cohorts: CohortRow[];
  max_periods: number;
}

function heatColor(pct: number): string {
  if (pct === 0) return "bg-gray-50 text-gray-300";
  if (pct >= 80) return "bg-brand-700 text-white";
  if (pct >= 60) return "bg-brand-600 text-white";
  if (pct >= 40) return "bg-brand-400 text-white";
  if (pct >= 20) return "bg-brand-200 text-brand-800";
  if (pct >= 10) return "bg-brand-100 text-brand-700";
  return "bg-brand-50 text-brand-600";
}

export default function RetentionTable({ cohorts, max_periods }: Props) {
  if (!cohorts.length) {
    return (
      <div className="card h-48 flex items-center justify-center text-gray-400 text-sm">
        No retention data available
      </div>
    );
  }

  const periods = Array.from({ length: max_periods + 1 }, (_, i) => i);

  return (
    <div className="card overflow-x-auto">
      <h2 className="text-base font-semibold text-gray-900 mb-4">
        Cohort Retention
      </h2>
      <table className="min-w-full text-xs">
        <thead>
          <tr>
            <th className="text-left text-gray-500 font-medium pr-3 pb-2 whitespace-nowrap">
              Cohort
            </th>
            <th className="text-right text-gray-500 font-medium px-2 pb-2">
              Size
            </th>
            {periods.map((p) => (
              <th
                key={p}
                className="text-center text-gray-500 font-medium px-1 pb-2 min-w-10"
              >
                {p === 0 ? "New" : `W${p}`}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="space-y-1">
          {cohorts.map((row) => (
            <tr key={row.cohort}>
              <td className="pr-3 py-1 font-medium text-gray-700 whitespace-nowrap">
                {row.cohort}
              </td>
              <td className="px-2 py-1 text-right text-gray-500">
                {row.cohort_size.toLocaleString()}
              </td>
              {periods.map((p) => {
                const period = row.periods.find((pp) => pp.period === p);
                const pct = period?.percentage ?? 0;
                return (
                  <td key={p} className="px-1 py-1 text-center">
                    <span
                      className={clsx(
                        "inline-flex items-center justify-center w-10 h-7 rounded text-xs font-semibold",
                        heatColor(pct)
                      )}
                    >
                      {pct > 0 ? `${pct}%` : "—"}
                    </span>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
      <div className="mt-4 flex items-center gap-2 text-xs text-gray-500">
        <span>Retention:</span>
        {[
          ["bg-brand-50", "0-10%"],
          ["bg-brand-100", "10-20%"],
          ["bg-brand-200", "20-40%"],
          ["bg-brand-400", "40-60%"],
          ["bg-brand-600", "60-80%"],
          ["bg-brand-700", "80%+"],
        ].map(([cls, label]) => (
          <div key={label} className="flex items-center gap-1">
            <div className={clsx("w-4 h-4 rounded", cls)} />
            <span>{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
