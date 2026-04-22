"use client";
import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Tag, RefreshCw, Zap, TrendingUp, TrendingDown } from "lucide-react";
import axios from "axios";
import DateRangePicker, { useDateRange, type DateRange } from "@/components/DateRangePicker";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";
const fmtMoney = (v: number) => "₹" + Math.round(v).toLocaleString("en-IN");

export default function DashboardPage() {
  const router = useRouter();
  const [brands, setBrands]   = useState<any[]>([]);
  const [dateRange, setDateRange] = useDateRange();
  const [loading, setLoading]  = useState(true);
  const [syncing, setSyncing]  = useState(false);

  const [viewMode, setViewMode] = useState<"grid" | "table">("table");

  const fetchBrands = async (from: string, to: string) => {
    setLoading(true);
    try {
      const r = await axios.get(`${API_BASE}/brands/overview?date_from=${from}&date_to=${to}`);
      setBrands(r.data || []);
    } catch {
      setBrands([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBrands(dateRange.from, dateRange.to);
  }, [dateRange.from, dateRange.to]);

  const triggerSync = async (type: "recent" | "history") => {
    setSyncing(true);
    try {
      if (type === "history") {
        await axios.post(`${API_BASE}/dashboard/sync-history?days=90`);
        alert("✅ 90-day history stored in Supabase.");
      } else {
        await axios.post(`${API_BASE}/dashboard/sync-recent`);
      }
      fetchBrands(dateRange.from, dateRange.to);
    } catch {
      alert("❌ Sync failed. Check META_SYSTEM_USER_TOKEN in .env");
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-medium text-foreground tracking-tight">
            Command Center
          </h1>
          <p className="text-muted-foreground mt-1 font-medium">
            {brands.length} brand{brands.length !== 1 ? "s" : ""} · <span className="text-primary">{dateRange.label}</span>
          </p>
        </div>
        <div className="flex items-center gap-3">
          <DateRangePicker value={dateRange} onChange={setDateRange} />
          
          <div className="flex p-1 bg-card border border-border rounded-xl shadow-sm">
            <button
              onClick={() => setViewMode("grid")}
              className={`p-1.5 rounded-lg transition-all ${viewMode === "grid" ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:bg-muted"}`}
              title="Grid View"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="7" height="7" x="3" y="3" rx="1"/><rect width="7" height="7" x="14" y="3" rx="1"/><rect width="7" height="7" x="14" y="14" rx="1"/><rect width="7" height="7" x="3" y="14" rx="1"/></svg>
            </button>
            <button
              onClick={() => setViewMode("table")}
              className={`p-1.5 rounded-lg transition-all ${viewMode === "table" ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:bg-muted"}`}
              title="Table View"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="3" x2="21" y1="6" y2="6"/><line x1="3" x2="21" y1="12" y2="12"/><line x1="3" x2="21" y1="18" y2="18"/></svg>
            </button>
          </div>

          <button
            onClick={() => fetchBrands(dateRange.from, dateRange.to)}
            className="p-2.5 border border-border bg-card rounded-xl hover:bg-muted transition-all text-muted-foreground shadow-sm"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
          <button
            onClick={() => triggerSync("recent")}
            disabled={syncing}
            className="flex items-center gap-2 px-4 py-2.5 bg-card border border-border rounded-xl hover:bg-muted transition-all disabled:opacity-50 font-medium text-sm text-foreground shadow-sm"
          >
            <RefreshCw className={`w-4 h-4 ${syncing ? "animate-spin" : ""}`} />
            {syncing ? "Syncing..." : "Sync Recent"}
          </button>
          <button
            onClick={() => triggerSync("history")}
            disabled={syncing}
            className="flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground rounded-xl hover:bg-primary-hover transition-all shadow-md shadow-primary/20 disabled:opacity-50 font-medium text-sm"
          >
            <Zap className={`w-4 h-4 ${syncing ? "animate-pulse fill-current" : "fill-current"}`} />
            {syncing ? "Syncing..." : "Sync History"}
          </button>
        </div>
      </div>

      {/* Brand Grid / Table */}
      {loading ? (
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-52 bg-card border border-border rounded-2xl animate-pulse shadow-sm" />
          ))}
        </div>
      ) : brands.length === 0 ? (
        <div className="p-8 bg-primary/5 border border-primary/10 rounded-2xl flex items-center gap-4">
          <Tag className="w-6 h-6 text-primary shrink-0" />
          <div>
            <p className="font-medium text-primary">No brands configured</p>
            <p className="text-xs text-muted-foreground mt-0.5">Go to Brand Manager to create brands and map ad accounts.</p>
          </div>
        </div>
      ) : viewMode === "grid" ? (
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
          {brands.map((b) => {
            const roas   = b.metrics?.roas ?? 0;
            const roasOk = roas >= b.target_roas;
            return (
              <button
                key={b.brand_id}
                onClick={() => router.push(`/brands/${b.brand_id}`)}
                className="text-left p-5 rounded-2xl border border-border bg-card shadow-sm hover:shadow-md hover:border-primary/50 hover:-translate-y-0.5 transition-all group"
              >
                <div className="flex items-center gap-3 mb-5">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-medium text-sm shrink-0 shadow-sm overflow-hidden"
                    style={{ backgroundColor: b.brand_color }}
                  >
                    {b.logo_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={b.logo_url} alt={b.brand_name} className="w-full h-full object-cover" />
                    ) : (
                      b.brand_name.slice(0, 2).toUpperCase()
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium text-foreground text-sm truncate">{b.brand_name}</p>
                    <p className="text-[10px] text-muted-foreground truncate">{b.industry || "—"}</p>
                  </div>
                  <div className="ml-auto shrink-0 flex items-center justify-center w-8 h-8 rounded-full bg-muted group-hover:bg-background transition-colors">
                    {roasOk
                      ? <TrendingUp className="w-4 h-4 text-emerald-500" />
                      : <TrendingDown className="w-4 h-4 text-amber-500" />}
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] text-muted-foreground uppercase font-medium tracking-wider">Spend</span>
                    <span className="text-sm font-medium text-foreground">{fmtMoney(b.metrics?.spend ?? 0)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] text-muted-foreground uppercase font-medium tracking-wider">Revenue</span>
                    <span className="text-sm font-medium text-emerald-600 dark:text-emerald-400">{fmtMoney(b.metrics?.revenue ?? 0)}</span>
                  </div>
                  <div className="flex justify-between items-center bg-muted/50 p-2 rounded-lg -mx-2 px-2">
                    <span className="text-[10px] text-muted-foreground uppercase font-medium tracking-wider">ROAS</span>
                    <span className={`text-sm font-medium ${roasOk ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600 dark:text-amber-400"}`}>
                      {roas.toFixed(2)}×
                    </span>
                  </div>
                  {(() => {
                    const score = b.metrics?.score ?? 0;
                    return (
                      <div className="flex items-center justify-between gap-2 pt-1">
                        <span className="text-[10px] text-muted-foreground uppercase font-medium tracking-wider shrink-0">Score</span>
                        <div className="flex items-center gap-2 flex-1 justify-end">
                          <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden max-w-[60px]">
                            <div
                              className={`h-full rounded-full ${score >= 60 ? "bg-emerald-500" : score >= 30 ? "bg-amber-500" : "bg-red-500"}`}
                              style={{ width: `${score}%` }}
                            />
                          </div>
                          <span className={`text-sm font-medium ${score >= 60 ? "text-emerald-600 dark:text-emerald-400" : score >= 30 ? "text-amber-600 dark:text-amber-400" : "text-red-600 dark:text-red-400"}`}>
                            {score}
                          </span>
                        </div>
                      </div>
                    );
                  })()}
                </div>

                <div className="mt-4 pt-4 border-t border-border flex items-center justify-between">
                  <span className={`text-[10px] font-medium uppercase tracking-wider px-2 py-0.5 rounded-lg ${roasOk ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" : "bg-amber-500/10 text-amber-600 dark:text-amber-400"}`}>
                    {roasOk ? "On Target" : "Below Target"}
                  </span>
                  <span className="text-[10px] text-muted-foreground font-medium">{b.accounts_count} acct{b.accounts_count !== 1 ? "s" : ""}</span>
                </div>
              </button>
            );
          })}
        </div>
      ) : (
        <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="px-6 py-4 text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Brand</th>
                <th className="px-6 py-4 text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Status</th>
                <th className="px-6 py-4 text-[10px] text-muted-foreground uppercase font-bold tracking-wider text-right">Spend</th>
                <th className="px-6 py-4 text-[10px] text-muted-foreground uppercase font-bold tracking-wider text-right">Revenue</th>
                <th className="px-6 py-4 text-[10px] text-muted-foreground uppercase font-bold tracking-wider text-right">Target ROAS</th>
                <th className="px-6 py-4 text-[10px] text-muted-foreground uppercase font-bold tracking-wider text-right">Current ROAS</th>
                <th className="px-6 py-4 text-[10px] text-muted-foreground uppercase font-bold tracking-wider text-right">Score</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {brands.map((b) => {
                const roas = b.metrics?.roas ?? 0;
                const roasOk = roas >= b.target_roas;
                return (
                  <tr 
                    key={b.brand_id} 
                    onClick={() => router.push(`/brands/${b.brand_id}`)}
                    className="hover:bg-muted/50 cursor-pointer transition-colors group"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-medium text-[10px] shrink-0 shadow-sm overflow-hidden"
                          style={{ backgroundColor: b.brand_color }}
                        >
                          {b.logo_url ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={b.logo_url} alt={b.brand_name} className="w-full h-full object-cover" />
                          ) : (
                            b.brand_name.slice(0, 2).toUpperCase()
                          )}
                        </div>
                        <div>
                          <p className="font-semibold text-foreground text-sm">{b.brand_name}</p>
                          <p className="text-[10px] text-muted-foreground">{b.industry || "—"}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${roasOk ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" : "bg-amber-500/10 text-amber-600 dark:text-amber-400"}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${roasOk ? "bg-emerald-500" : "bg-amber-500"}`}></span>
                        {roasOk ? "On Target" : "Below Target"}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <p className="text-sm font-medium text-foreground">{fmtMoney(b.metrics?.spend ?? 0)}</p>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <p className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">{fmtMoney(b.metrics?.revenue ?? 0)}</p>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <p className="text-sm font-medium text-muted-foreground">{b.target_roas.toFixed(1)}×</p>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <span className={`text-sm font-bold ${roasOk ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600 dark:text-amber-400"}`}>
                          {roas.toFixed(2)}×
                        </span>
                        {roasOk
                          ? <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />
                          : <TrendingDown className="w-3.5 h-3.5 text-amber-500" />}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      {(() => {
                        const score = b.metrics?.score ?? 0;
                        return (
                          <div className="flex items-center justify-end gap-2">
                            <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full ${score >= 60 ? "bg-emerald-500" : score >= 30 ? "bg-amber-500" : "bg-red-500"}`}
                                style={{ width: `${score}%` }}
                              />
                            </div>
                            <span className={`text-sm font-bold w-7 text-right ${score >= 60 ? "text-emerald-600 dark:text-emerald-400" : score >= 30 ? "text-amber-600 dark:text-amber-400" : "text-red-600 dark:text-red-400"}`}>
                              {score}
                            </span>
                          </div>
                        );
                      })()}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
