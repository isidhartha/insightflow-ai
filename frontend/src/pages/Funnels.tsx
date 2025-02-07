import { useState } from "react";
import axios from "axios";
import FunnelChart from "../components/FunnelChart";
import { Plus, Trash2, PlayCircle } from "lucide-react";

const API = "/api/v1";

interface Step {
  event: string;
  label: string;
}

const PRESET_FUNNELS = [
  {
    name: "Signup Funnel",
    steps: [
      { event: "$pageview", label: "Landing Page" },
      { event: "signup_started", label: "Signup Started" },
      { event: "signup_completed", label: "Signed Up" },
      { event: "onboarding_completed", label: "Onboarded" },
    ],
  },
  {
    name: "Purchase Funnel",
    steps: [
      { event: "product_viewed", label: "Product View" },
      { event: "add_to_cart", label: "Add to Cart" },
      { event: "checkout_started", label: "Checkout" },
      { event: "purchase", label: "Purchase" },
    ],
  },
];

export default function Funnels() {
  const [steps, setSteps] = useState<Step[]>([
    { event: "$pageview", label: "Page View" },
    { event: "signup_started", label: "Signup Started" },
    { event: "signup_completed", label: "Signed Up" },
  ]);
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const addStep = () => setSteps([...steps, { event: "", label: "" }]);
  const removeStep = (i: number) => setSteps(steps.filter((_, idx) => idx !== i));
  const updateStep = (i: number, field: keyof Step, value: string) => {
    const next = [...steps];
    next[i] = { ...next[i], [field]: value };
    setSteps(next);
  };

  const runAnalysis = async () => {
    setLoading(true);
    try {
      const res = await axios.post(`${API}/analytics/funnel`, { steps });
      setResult(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Funnel Analysis</h1>
        <p className="text-sm text-gray-500 mt-0.5">Build and analyze conversion funnels</p>
      </div>

      {/* Presets */}
      <div className="flex gap-3">
        {PRESET_FUNNELS.map((preset) => (
          <button
            key={preset.name}
            onClick={() => setSteps(preset.steps)}
            className="btn-secondary text-sm"
          >
            {preset.name}
          </button>
        ))}
      </div>

      {/* Step builder */}
      <div className="card space-y-3">
        <h2 className="text-sm font-semibold text-gray-700 mb-1">Funnel Steps</h2>
        {steps.map((step, i) => (
          <div key={i} className="flex gap-3 items-center">
            <div className="w-7 h-7 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center text-xs font-bold flex-shrink-0">
              {i + 1}
            </div>
            <input
              placeholder="Event name (e.g. $pageview)"
              value={step.event}
              onChange={(e) => updateStep(i, "event", e.target.value)}
              className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
            <input
              placeholder="Label (e.g. Landing Page)"
              value={step.label}
              onChange={(e) => updateStep(i, "label", e.target.value)}
              className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
            <button
              onClick={() => removeStep(i)}
              disabled={steps.length <= 2}
              className="p-2 text-gray-400 hover:text-red-500 disabled:opacity-30"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ))}
        <div className="flex gap-3 pt-2">
          <button onClick={addStep} className="btn-secondary text-sm flex items-center gap-1.5">
            <Plus className="w-4 h-4" /> Add Step
          </button>
          <button
            onClick={runAnalysis}
            disabled={loading || steps.some((s) => !s.event)}
            className="btn-primary text-sm flex items-center gap-1.5"
          >
            <PlayCircle className="w-4 h-4" />
            {loading ? "Analyzing…" : "Run Analysis"}
          </button>
        </div>
      </div>

      {result && (
        <FunnelChart steps={result.steps} overall_conversion={result.overall_conversion} />
      )}
    </div>
  );
}
