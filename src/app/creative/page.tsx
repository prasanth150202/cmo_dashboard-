"use client";
import { useEffect, useState } from "react";
import axios from "axios";
import { Palette, AlertTriangle, CheckCircle, Eye } from "lucide-react";

const API = "http://localhost:8000/api/v1";

const STATUS_CONFIG: Record<string, { color: string; icon: any; bg: string }> = {
  FATIGUED: { color: "text-red-400", bg: "bg-red-500/10 border-red-500/20", icon: AlertTriangle },
  WARNING: { color: "text-amber-400", bg: "bg-amber-500/10 border-amber-500/10", icon: Eye },
  HEALTHY: { color: "text-emerald-400", bg: "bg-emerald-500/10 border-emerald-500/10", icon: CheckCircle },
};

export default function CreativePage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axios.get(`${API}/creative/status`).then(r => { setData(r.data); setLoading(false); });
  }, []);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-medium text-white">🎨 Creative Fatigue Tracker</h1>
        <p className="text-slate-500 mt-1">Monitor ad frequency, CTR decay, and rotation signals</p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "🔴 Fatigued", value: data?.fatigued_count, color: "red" },
          { label: "🟡 Warning", value: data?.warning_count, color: "amber" },
          { label: "🟢 Healthy", value: (data?.creatives?.length ?? 0) - (data?.fatigued_count ?? 0) - (data?.warning_count ?? 0), color: "emerald" },
        ].map(({ label, value, color }) => (
          <div key={label} className={`p-5 bg-${color}-500/5 border border-${color}-500/10 rounded-2xl`}>
            <p className="text-xs font-medium uppercase tracking-widest text-slate-500 mb-2">{label}</p>
            <p className={`text-3xl font-medium text-${color}-400`}>{loading ? "..." : value}</p>
          </div>
        ))}
      </div>

      <div className="space-y-3">
        {loading ? (
          <div className="py-20 text-center text-slate-500">Scanning creatives...</div>
        ) : (data?.creatives ?? []).map((c: any, i: number) => {
          const config = STATUS_CONFIG[c.fatigue_status];
          const Icon = config.icon;
          return (
            <div key={i} className={`p-5 rounded-2xl border flex items-center justify-between ${config.bg}`}>
              <div className="flex items-center gap-5">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center bg-black/20`}>
                  <Icon className={`w-5 h-5 ${config.color}`} />
                </div>
                <div>
                  <p className="font-medium text-slate-200">{c.creative_name}</p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Freq: <span className={config.color}>{c.frequency_7d}x</span> · 
                    CTR Δ: <span className={c.ctr_trend < 0 ? "text-red-400" : "text-emerald-400"}>{c.ctr_trend > 0 ? "+" : ""}{(c.ctr_trend * 100).toFixed(0)}%</span> · 
                    Age: {c.age_days}d · Spend: ₹{(c.spend/1000).toFixed(0)}K
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className={`text-xs font-medium px-3 py-1.5 rounded-full bg-black/20 ${config.color}`}>
                  {c.recommendation}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
