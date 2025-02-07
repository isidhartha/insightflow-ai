import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
  ResponsiveContainer,
} from "recharts";

interface FunnelStep {
  step: number;
  event: string;
  label: string;
  users: number;
  conversion_rate: number;
  drop_off_rate: number;
}

interface Props {
  steps: FunnelStep[];
  overall_conversion: number;
}

const COLORS = ["#7c3aed", "#8b5cf6", "#a78bfa", "#c4b5fd", "#ddd6fe"];

const CustomTooltip = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload as FunnelStep;
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-3 shadow-lg text-sm">
      <p className="font-semibold text-gray-900">{d.label}</p>
      <p className="text-gray-600">Users: <span className="font-medium">{d.users.toLocaleString()}</span></p>
      <p className="text-emerald-600">Conversion: <span className="font-medium">{d.conversion_rate}%</span></p>
      <p className="text-red-500">Drop-off: <span className="font-medium">{d.drop_off_rate}%</span></p>
    </div>
  );
};

export default function FunnelChart({ steps, overall_conversion }: Props) {
  if (!steps.length) {
    return (
      <div className="card h-64 flex items-center justify-center text-gray-400 text-sm">
        No funnel data available
      </div>
    );
  }

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base font-semibold text-gray-900">Conversion Funnel</h2>
        <span className="badge bg-brand-50 text-brand-700">
          {overall_conversion}% overall
        </span>
      </div>
      <ResponsiveContainer width="100%" height={260}>
        <BarChart data={steps} margin={{ top: 4, right: 8, left: 0, bottom: 40 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 11, fill: "#94a3b8" }}
            axisLine={false}
            tickLine={false}
            angle={-20}
            textAnchor="end"
          />
          <YAxis
            tick={{ fontSize: 11, fill: "#94a3b8" }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip content={<CustomTooltip />} />
          <Bar dataKey="users" radius={[4, 4, 0, 0]}>
            {steps.map((_, i) => (
              <Cell key={i} fill={COLORS[i % COLORS.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      <div className="mt-2 flex gap-4 flex-wrap">
        {steps.map((s) => (
          <div key={s.step} className="text-xs text-gray-500">
            <span className="font-medium text-gray-700">Step {s.step}:</span>{" "}
            {s.conversion_rate}% conv.
          </div>
        ))}
      </div>
    </div>
  );
}
