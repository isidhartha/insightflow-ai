import { useEffect, useState } from "react";
import axios from "axios";
import MetricsGrid from "../components/MetricsGrid";
import AnalyticsDashboard from "../components/AnalyticsDashboard";
import FunnelChart from "../components/FunnelChart";
import RetentionTable from "../components/RetentionTable";
import AIInsights from "../components/AIInsights";
import EventsTable from "../components/EventsTable";

const API = "/api/v1";

const DEFAULT_FUNNEL = {
  steps: [
    { event: "$pageview", label: "Landing Page" },
    { event: "signup_started", label: "Signup Started" },
    { event: "signup_completed", label: "Signed Up" },
    { event: "onboarding_completed", label: "Onboarded" },
    { event: "purchase", label: "Purchased" },
  ],
};

export default function Dashboard() {
  const [overview, setOverview] = useState<any>(null);
  const [pageviews, setPageviews] = useState<any[]>([]);
  const [funnel, setFunnel] = useState<any>(null);
  const [retention, setRetention] = useState<any>(null);
  const [insights, setInsights] = useState<any>(null);
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchAll() {
      setLoading(true);
      try {
        const [ovRes, pvRes, funnelRes, retRes, evRes] = await Promise.all([
          axios.get(`${API}/analytics/overview`),
          axios.get(`${API}/analytics/pageviews`),
          axios.post(`${API}/analytics/funnel`, DEFAULT_FUNNEL),
          axios.get(`${API}/analytics/retention`),
          axios.get(`${API}/analytics/events?limit=20`),
        ]);
        setOverview(ovRes.data);
        setPageviews(pvRes.data.series || []);
        setFunnel(funnelRes.data);
        setRetention(retRes.data);
        setEvents(evRes.data.events || []);

        // Fetch AI insights with overview data
        const insightRes = await axios.post(`${API}/ai/insights`, ovRes.data);
        setInsights(insightRes.data);
      } catch (err) {
        console.error("Failed to fetch analytics:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchAll();

    // Refresh events every 30 seconds
    const interval = setInterval(async () => {
      try {
        const evRes = await axios.get(`${API}/analytics/events?limit=20`);
        setEvents(evRes.data.events || []);
      } catch {}
    }, 30_000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-sm text-gray-500 mt-0.5">Last 30 days · All projects</p>
        </div>
        <span className="badge bg-emerald-50 text-emerald-700 text-xs">Live</span>
      </div>

      <MetricsGrid
        totalEvents={overview?.total_events ?? 0}
        uniqueUsers={overview?.unique_users ?? 0}
        sessions={overview?.sessions ?? 0}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <AnalyticsDashboard data={pageviews} />
        </div>
        <AIInsights insights={insights} loading={loading && !insights} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <FunnelChart
          steps={funnel?.steps ?? []}
          overall_conversion={funnel?.overall_conversion ?? 0}
        />
        <RetentionTable
          cohorts={retention?.cohorts ?? []}
          max_periods={retention?.max_periods ?? 0}
        />
      </div>

      <EventsTable events={events} loading={loading && !events.length} />
    </div>
  );
}
