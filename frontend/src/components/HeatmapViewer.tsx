import { useEffect, useRef } from "react";

interface HeatPoint {
  x: number;
  y: number;
  intensity: number;
}

interface Props {
  points: HeatPoint[];
  width?: number;
  height?: number;
  pageUrl?: string;
  totalClicks?: number;
}

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

function heatColor(intensity: number): string {
  // blue → green → yellow → red
  const r = Math.round(lerp(0, 255, Math.min(intensity * 2, 1)));
  const g = Math.round(lerp(0, 200, intensity < 0.5 ? intensity * 2 : 1 - (intensity - 0.5) * 2));
  const b = Math.round(lerp(255, 0, Math.min(intensity * 2, 1)));
  return `rgba(${r},${g},${b},${0.3 + intensity * 0.5})`;
}

export default function HeatmapViewer({
  points,
  width = 640,
  height = 360,
  pageUrl,
  totalClicks = 0,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, width, height);

    // Draw grid background
    ctx.fillStyle = "#f8fafc";
    ctx.fillRect(0, 0, width, height);
    ctx.strokeStyle = "#e2e8f0";
    ctx.lineWidth = 0.5;
    for (let x = 0; x <= width; x += 40) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, height); ctx.stroke();
    }
    for (let y = 0; y <= height; y += 40) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(width, y); ctx.stroke();
    }

    // Draw heat circles
    points.forEach(({ x, y, intensity }) => {
      const px = (x / 100) * width;
      const py = (y / 100) * height;
      const radius = 20 + intensity * 30;
      const gradient = ctx.createRadialGradient(px, py, 0, px, py, radius);
      gradient.addColorStop(0, heatColor(intensity));
      gradient.addColorStop(1, "rgba(0,0,0,0)");
      ctx.beginPath();
      ctx.arc(px, py, radius, 0, Math.PI * 2);
      ctx.fillStyle = gradient;
      ctx.fill();
    });
  }, [points, width, height]);

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-base font-semibold text-gray-900">Click Heatmap</h2>
        <span className="text-xs text-gray-500">{totalClicks.toLocaleString()} clicks</span>
      </div>
      {pageUrl && (
        <p className="text-xs text-gray-400 mb-3 truncate font-mono">{pageUrl}</p>
      )}
      <div className="rounded-lg overflow-hidden border border-gray-100">
        <canvas
          ref={canvasRef}
          width={width}
          height={height}
          className="w-full"
          style={{ display: "block" }}
        />
      </div>
      <div className="mt-2 flex items-center justify-between text-xs text-gray-400">
        <span>Low activity</span>
        <div className="flex gap-0.5">
          {["#0000ff", "#00aa00", "#ffff00", "#ff0000"].map((c) => (
            <div key={c} className="w-6 h-2 rounded-sm" style={{ background: c, opacity: 0.6 }} />
          ))}
        </div>
        <span>High activity</span>
      </div>
    </div>
  );
}
