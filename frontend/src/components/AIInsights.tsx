import { Lightbulb, AlertTriangle, TrendingUp, Sparkles } from "lucide-react";
import { clsx } from "clsx";

interface Insights {
  trends?: string[];
  concerns?: string[];
  recommendations?: string[];
  summary?: string;
}

interface Props {
  insights: Insights | null;
  loading?: boolean;
}

function Section({
  icon: Icon,
  title,
  items,
  color,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  items: string[];
  color: string;
}) {
  return (
    <div>
      <div className={clsx("flex items-center gap-1.5 mb-2", color)}>
        <Icon className="w-3.5 h-3.5" />
        <span className="text-xs font-semibold uppercase tracking-wide">{title}</span>
      </div>
      <ul className="space-y-1.5">
        {items.map((item, i) => (
          <li key={i} className="flex gap-2 text-sm text-gray-600">
            <span className={clsx("mt-1.5 w-1.5 h-1.5 rounded-full flex-shrink-0", color.replace("text-", "bg-"))} />
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function AIInsights({ insights, loading }: Props) {
  if (loading) {
    return (
      <div className="card">
        <div className="flex items-center gap-2 mb-4">
          <Sparkles className="w-4 h-4 text-brand-600 animate-pulse" />
          <h2 className="text-base font-semibold text-gray-900">AI Insights</h2>
        </div>
        <div className="space-y-3">
          {[80, 60, 90, 70].map((w) => (
            <div key={w} className={`h-4 bg-gray-100 rounded animate-pulse`} style={{ width: `${w}%` }} />
          ))}
        </div>
      </div>
    );
  }

  if (!insights) return null;

  return (
    <div className="card">
      <div className="flex items-center gap-2 mb-4">
        <Sparkles className="w-4 h-4 text-brand-600" />
        <h2 className="text-base font-semibold text-gray-900">AI Insights</h2>
        <span className="badge bg-brand-50 text-brand-600 text-xs ml-auto">GPT-4o</span>
      </div>

      {insights.summary && (
        <p className="text-sm text-gray-600 bg-brand-50 rounded-lg px-3 py-2.5 mb-4 leading-relaxed">
          {insights.summary}
        </p>
      )}

      <div className="space-y-4">
        {insights.trends && insights.trends.length > 0 && (
          <Section
            icon={TrendingUp}
            title="Trends"
            items={insights.trends}
            color="text-emerald-600"
          />
        )}
        {insights.concerns && insights.concerns.length > 0 && (
          <Section
            icon={AlertTriangle}
            title="Concerns"
            items={insights.concerns}
            color="text-amber-600"
          />
        )}
        {insights.recommendations && insights.recommendations.length > 0 && (
          <Section
            icon={Lightbulb}
            title="Recommendations"
            items={insights.recommendations}
            color="text-brand-600"
          />
        )}
      </div>
    </div>
  );
}
