import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  TrendingDown,
  Users,
  Lightbulb,
  Zap,
  Settings,
} from "lucide-react";
import { clsx } from "clsx";

const nav = [
  { to: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { to: "/funnels", icon: TrendingDown, label: "Funnels" },
  { to: "/retention", icon: Users, label: "Retention" },
  { to: "/insights", icon: Lightbulb, label: "AI Insights" },
];

export default function Sidebar() {
  return (
    <aside className="w-60 bg-white border-r border-gray-100 flex flex-col h-screen">
      {/* Logo */}
      <div className="px-6 py-5 border-b border-gray-100">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-brand-600 rounded-lg flex items-center justify-center">
            <Zap className="w-4 h-4 text-white" />
          </div>
          <div>
            <p className="font-bold text-gray-900 text-sm leading-tight">InsightFlow</p>
            <p className="text-xs text-brand-600 font-medium">AI Analytics</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-0.5">
        {nav.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              clsx(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all",
                isActive
                  ? "bg-brand-50 text-brand-700"
                  : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
              )
            }
          >
            {({ isActive }) => (
              <>
                <Icon
                  className={clsx("w-4 h-4", isActive ? "text-brand-600" : "text-gray-400")}
                />
                {label}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Footer */}
      <div className="px-3 py-4 border-t border-gray-100">
        <button className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50 w-full">
          <Settings className="w-4 h-4 text-gray-400" />
          Settings
        </button>
        <div className="mt-3 px-3">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-brand-100 flex items-center justify-center text-xs font-bold text-brand-700">
              IF
            </div>
            <div>
              <p className="text-xs font-medium text-gray-700">InsightFlow AI</p>
              <p className="text-xs text-gray-400">v1.0.0</p>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}
