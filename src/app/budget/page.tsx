"use client";
import { useEffect, useState } from "react";
import axios from "axios";
import { DollarSign, AlertTriangle, TrendingDown, TrendingUp } from "lucide-react";

const API = "http://localhost:8000/api/v1";

const PACE_CONFIG: Record<string, { color: string; label: string }> = {
  ON_PACE: { color: "emerald", label: "✅ On Pace" },
  OVERPACING: { color: "red", label: "🔴 Overpacing" },
  UNDERPACING: { color: "amber", label: "🟡 Underpacing" },
};

export default function BudgetPage() {
  const [data, setData] = useState<any>(null);
  const [risk, setRisk] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      axios.get(`${API}/budget/pace`),
      axios.get(`${API}/budget/exhaustion-risk`),
    ]).then(([p, r]) => { setData(p.data); setRisk(r.data); setLoading(false); });
  }, []);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-medium text-white">💰 Budget Pace Tracker</h1>
        <p className="text-slate-500 mt-1">Monthly cap utilization, pacing status, and exhaustion risk</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {loading ? (
          <div className="col-span-2 py-20 text-center text-slate-500">Loading budget data...</div>
        ) : (data?.accounts ?? []).map((acct: any) => {
          const cfg = PACE_CONFIG[acct.pace_status] || PACE_CONFIG.ON_PACE;
          const fillPct = Math.min(acct.utilization_pct, 100);
          return (
            <div key={acct.account_id} className="p-6 bg-white/5 border border-white/5 rounded-3xl space-y-5">
              <div className="flex justify-between items-start">
                <div>
                  <p className="font-medium text-lg text-white">{acct.account_name}</p>
                  <p className="text-xs text-slate-500 mt-0.5 font-mono">{acct.account_id}</p>
                </div>
                <span className={`text-xs font-medium px-3 py-1.5 rounded-full bg-${cfg.color}-500/10 text-${cfg.color}-400 border border-${cfg.color}-500/20`}>
                  {cfg.label}
                </span>
              </div>
              
              {/* Progress Bar */}
              <div>
                <div className="flex justify-between text-xs mb-2">
                  <span className="text-slate-500">MTD Spend</span>
                  <span className="font-medium text-white">{acct.utilization_pct}% of cap</span>
                </div>
                <div className="w-full h-3 bg-white/5 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      fillPct > 90 ? "bg-red-500" : fillPct > 75 ? "bg-amber-500" : "bg-emerald-500"
                    }`}
                    style={{ width: `${fillPct}%` }}
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4 pt-2 border-t border-white/5">
                <div><p className="text-[10px] text-slate-500 uppercase font-medium mb-1">MTD Spend</p><p className="font-medium">₹{(acct.mtd_spend/100000).toFixed(1)}L</p></div>
                <div><p className="text-[10px] text-slate-500 uppercase font-medium mb-1">Remaining</p><p className="font-medium text-emerald-400">₹{(acct.remaining_budget/100000).toFixed(1)}L</p></div>
                <div><p className="text-[10px] text-slate-500 uppercase font-medium mb-1">Projected EOM</p><p className={`font-medium ${acct.projected_eom_spend > acct.monthly_cap ? "text-red-400" : "text-white"}`}>₹{(acct.projected_eom_spend/100000).toFixed(1)}L</p></div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Exhaustion Risk Table */}
      <div>
        <h2 className="text-lg font-medium text-slate-200 mb-4">Campaign Exhaustion Risk</h2>
        <div className="bg-white/5 border border-white/5 rounded-2xl overflow-hidden">
          <table className="w-full text-sm">
            <thead><tr className="border-b border-white/5">
              {["Campaign", "Daily Spend", "Daily Budget", "Utilization", "Risk"].map(h => (
                <th key={h} className="text-left px-5 py-4 text-xs font-medium uppercase tracking-widest text-slate-500">{h}</th>
              ))}
            </tr></thead>
            <tbody>
              {risk.map((r: any, i: number) => (
                <tr key={i} className="border-b border-white/5 hover:bg-white/5">
                  <td className="px-5 py-3 font-medium text-slate-200">{r.name}</td>
                  <td className="px-5 py-3">₹{(r.daily_spend/1000).toFixed(0)}K</td>
                  <td className="px-5 py-3 text-slate-400">₹{(r.daily_budget/1000).toFixed(0)}K</td>
                  <td className="px-5 py-3 font-medium">{(r.utilization * 100).toFixed(0)}%</td>
                  <td className="px-5 py-3">
                    <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                      r.risk === "HIGH" ? "bg-red-500/10 text-red-400" :
                      r.risk === "MEDIUM" ? "bg-amber-500/10 text-amber-400" :
                      "bg-emerald-500/10 text-emerald-400"
                    }`}>{r.risk}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
