import { format, parseISO } from "date-fns";
import { clsx } from "clsx";

interface EventRecord {
  id: string;
  distinct_id: string;
  event: string;
  properties: Record<string, unknown>;
  timestamp: string;
  page_url?: string;
}

interface Props {
  events: EventRecord[];
  loading?: boolean;
}

const EVENT_COLORS: Record<string, string> = {
  "$pageview": "bg-blue-100 text-blue-700",
  "$click": "bg-emerald-100 text-emerald-700",
  "$identify": "bg-violet-100 text-violet-700",
  "signup": "bg-orange-100 text-orange-700",
  "purchase": "bg-green-100 text-green-700",
  "error": "bg-red-100 text-red-700",
};

function eventColor(event: string): string {
  return EVENT_COLORS[event] ?? "bg-gray-100 text-gray-600";
}

function shortId(id: string): string {
  return id.slice(0, 8) + "…";
}

function formatTs(ts: string): string {
  try {
    return format(parseISO(ts), "HH:mm:ss");
  } catch {
    return ts;
  }
}

export default function EventsTable({ events, loading }: Props) {
  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base font-semibold text-gray-900">Live Events</h2>
        <span className="flex items-center gap-1.5 text-xs text-emerald-600 font-medium">
          <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
          Live
        </span>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100">
              {["Time", "Event", "User", "Page URL", "Properties"].map((h) => (
                <th
                  key={h}
                  className="text-left text-xs font-medium text-gray-500 pb-2 pr-4 last:pr-0"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {loading
              ? Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i}>
                    {[24, 32, 24, 48, 40].map((w, j) => (
                      <td key={j} className="py-2.5 pr-4">
                        <div
                          className="h-3.5 bg-gray-100 rounded animate-pulse"
                          style={{ width: `${w * 3}px` }}
                        />
                      </td>
                    ))}
                  </tr>
                ))
              : events.map((e) => (
                  <tr key={e.id} className="hover:bg-gray-50 transition-colors">
                    <td className="py-2.5 pr-4 font-mono text-xs text-gray-500 whitespace-nowrap">
                      {formatTs(e.timestamp)}
                    </td>
                    <td className="py-2.5 pr-4">
                      <span className={clsx("badge", eventColor(e.event))}>
                        {e.event}
                      </span>
                    </td>
                    <td className="py-2.5 pr-4 font-mono text-xs text-gray-500">
                      {shortId(e.distinct_id)}
                    </td>
                    <td className="py-2.5 pr-4 text-xs text-gray-500 max-w-48 truncate">
                      {e.page_url ?? "—"}
                    </td>
                    <td className="py-2.5 text-xs text-gray-400 font-mono max-w-48 truncate">
                      {Object.keys(e.properties).length > 0
                        ? JSON.stringify(e.properties).slice(0, 60)
                        : "{}"}
                    </td>
                  </tr>
                ))}
          </tbody>
        </table>
        {!loading && events.length === 0 && (
          <p className="text-center text-gray-400 text-sm py-8">No events yet</p>
        )}
      </div>
    </div>
  );
}
