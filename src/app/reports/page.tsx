"use client";
import { useEffect, useState } from "react";
import axios from "axios";
import { CheckCircle, XCircle, AlertTriangle, Clock, RefreshCw } from "lucide-react";

const API = "http://localhost:8000/api/v1";

export default function ReportsPage() {
  const [summary, setSummary] = useState<any>(null);
  const [changelog, setChangelog] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      axios.get(`${API}/reports/summary`),
      axios.get(`${API}/reports/changelog`),
    ]).then(([s, c]) => { setSummary(s.data); setChangelog(c.data); setLoading(false); });
  }, []);

  const ws = summary?.weekly_summary;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-medium text-white">📋 Reports & Monitoring</h1>
        <p className="text-slate-500 mt-1">Weekly performance summary, engine changelog, and alerts</p>
      </div>

      {/* Alerts */}
      {summary?.alerts && (
        <div className="space-y-2">
          {summary.alerts.map((alert: any, i: number) => (
            <div key={i} className={`p-4 rounded-xl flex items-center gap-3 border ${
              alert.type === "WARNING" ? "bg-amber-500/5 border-amber-500/20" :
              alert.type === "SUCCESS" ? "bg-emerald-500/5 border-emerald-500/20" :
              "bg-blue-500/5 border-blue-500/20"
            }`}>
              {alert.type === "WARNING" ? <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" /> :
               alert.type === "SUCCESS" ? <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" /> :
               <Clock className="w-4 h-4 text-blue-400 shrink-0" />}
              <p className="text-sm text-slate-300">{alert.msg}</p>
            </div>
          ))}
        </div>
      )}

      {/* Weekly KPIs */}
      <div>
        <h2 className="text-lg font-medium text-slate-200 mb-4">This Week's Summary</h2>
        <div className="grid grid-cols-4 gap-4">
          {loading ? <div className="col-span-4 text-center text-slate-500 py-8">Loading...</div> : [
            { label: "Total Spend", value: `₹${(ws?.total_spend/100000).toFixed(1)}L` },
            { label: "Total Revenue", value: `₹${(ws?.total_revenue/100000).toFixed(1)}L` },
            { label: "Rules Fired", value: ws?.rules_fired },
            { label: "Approved Actions", value: ws?.suggestions_approved },
            { label: "Rejected", value: ws?.suggestions_rejected },
            { label: "AI Calls", value: ws?.ai_calls_made },
            { label: "Budget Changes", value: ws?.budget_changes_executed },
            { label: "ROAS", value: `${ws?.roas}x` },
          ].map(({ label, value }) => (
            <div key={label} className="p-5 bg-white/5 border border-white/5 rounded-2xl">
              <p className="text-[10px] font-medium uppercase tracking-widest text-slate-500 mb-2">{label}</p>
              <p className="text-2xl font-medium text-white">{value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Top Performers */}
      <div>
        <h2 className="text-lg font-medium text-slate-200 mb-4">Top Performers</h2>
        <div className="space-y-2">
          {(summary?.top_performers ?? []).map((p: any, i: number) => (
            <div key={i} className="p-4 bg-white/5 border border-white/5 rounded-xl flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-xs font-medium text-slate-500 w-6">#{i+1}</span>
                <p className="font-medium text-slate-200">{p.entity}</p>
              </div>
              <div className="flex items-center gap-6 text-sm">
                <span className="text-indigo-400 font-medium">{p.roas}x ROAS</span>
                <span className="text-slate-400">₹{(p.spend/1000).toFixed(0)}K</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Changelog */}
      <div>
        <h2 className="text-lg font-medium text-slate-200 mb-4">Execution Changelog</h2>
        <div className="bg-white/5 border border-white/5 rounded-2xl overflow-hidden">
          <table className="w-full text-sm">
            <thead><tr className="border-b border-white/5">
              {["ID", "Action", "Entity", "Channel", "Magnitude", "Status", "Time"].map(h => (
                <th key={h} className="text-left px-4 py-3 text-xs font-medium uppercase tracking-widest text-slate-500">{h}</th>
              ))}
            </tr></thead>
            <tbody>
              {changelog.map((r: any, i: number) => (
                <tr key={i} className="border-b border-white/5 hover:bg-white/5">
                  <td className="px-4 py-3 font-mono text-xs text-slate-500">{r.id}</td>
                  <td className="px-4 py-3 text-xs font-medium text-indigo-400">{r.action}</td>
                  <td className="px-4 py-3 text-slate-300">{r.entity}</td>
                  <td className="px-4 py-3 text-slate-400">{r.channel}</td>
                  <td className="px-4 py-3 font-medium">{r.magnitude}%</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-medium px-2 py-1 rounded-full ${r.status === "SUCCESS" ? "bg-emerald-500/10 text-emerald-400" : "bg-red-500/10 text-red-400"}`}>
                      {r.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-500 font-mono">{r.timestamp.slice(11, 16)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
