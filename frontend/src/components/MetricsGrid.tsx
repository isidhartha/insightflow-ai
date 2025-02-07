import { TrendingUp, TrendingDown, Users, Eye, Monitor } from "lucide-react";
import { clsx } from "clsx";

interface Metric {
  label: string;
  value: number | string;
  change?: number;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
}

interface Props {
  totalEvents: number;
  uniqueUsers: number;
  sessions: number;
  pageviews?: number;
}

function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toString();
}

export default function MetricsGrid({ totalEvents, uniqueUsers, sessions, pageviews = 0 }: Props) {
  const metrics: Metric[] = [
    {
      label: "Unique Visitors",
      value: formatNumber(uniqueUsers),
      change: 12.5,
      icon: Users,
      color: "text-violet-600",
    },
    {
      label: "Pageviews",
      value: formatNumber(pageviews || totalEvents),
      change: 8.3,
      icon: Eye,
      color: "text-blue-600",
    },
    {
      label: "Sessions",
      value: formatNumber(sessions),
      change: 5.1,
      icon: Monitor,
      color: "text-emerald-600",
    },
    {
      label: "Total Events",
      value: formatNumber(totalEvents),
      change: -2.4,
      icon: TrendingUp,
      color: "text-orange-600",
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {metrics.map((m) => (
        <div key={m.label} className="card">
          <div className="flex items-center justify-between mb-3">
            <p className="metric-label">{m.label}</p>
            <m.icon className={clsx("w-5 h-5", m.color)} />
          </div>
          <p className="metric-value">{m.value}</p>
          {m.change !== undefined && (
            <div className="mt-2 flex items-center gap-1">
              {m.change >= 0 ? (
                <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />
              ) : (
                <TrendingDown className="w-3.5 h-3.5 text-red-500" />
              )}
              <span
                className={clsx(
                  "text-xs font-medium",
                  m.change >= 0 ? "text-emerald-600" : "text-red-600"
                )}
              >
                {m.change > 0 ? "+" : ""}{m.change}% vs last period
              </span>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
