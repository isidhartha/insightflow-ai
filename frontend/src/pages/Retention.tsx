import { useEffect, useState } from "react";
import axios from "axios";
import RetentionTable from "../components/RetentionTable";

const API = "/api/v1";

export default function Retention() {
  const [data, setData] = useState<any>(null);
  const [granularity, setGranularity] = useState<"week" | "month">("week");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    axios
      .get(`${API}/analytics/retention?granularity=${granularity}`)
      .then((r) => setData(r.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [granularity]);

  return (
    <div className="p-6 space-y-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Retention Analysis</h1>
          <p className="text-sm text-gray-500 mt-0.5">Cohort-based user retention</p>
        </div>
        <div className="flex gap-2">
          {(["week", "month"] as const).map((g) => (
            <button
              key={g}
              onClick={() => setGranularity(g)}
              className={granularity === g ? "btn-primary text-sm" : "btn-secondary text-sm"}
            >
              {g.charAt(0).toUpperCase() + g.slice(1)}ly
            </button>
          ))}
        </div>
      </div>

      <div className="card text-sm text-gray-600">
        <p>
          Each row is a cohort of users who first visited during that period. The columns show
          what percentage returned in subsequent {granularity}s. Darker cells = higher retention.
        </p>
      </div>

      {loading ? (
        <div className="card animate-pulse h-64" />
      ) : (
        <RetentionTable
          cohorts={data?.cohorts ?? []}
          max_periods={data?.max_periods ?? 0}
        />
      )}
    </div>
  );
}
