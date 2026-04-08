"use client";
import { useEffect, useState } from "react";
import axios from "axios";
import { TrendingUp, TrendingDown, RefreshCw } from "lucide-react";
import DateRangePicker, { defaultRange, type DateRange } from "@/components/DateRangePicker";

const API = "http://localhost:8000/api/v1";

const fmtMoney = (v: number) => "₹" + Math.round(v).toLocaleString("en-IN");
const fmtNum   = (v: number) => Math.round(v).toLocaleString("en-IN");

export default function AnalyticsPage() {
  const [daily,    setDaily]    = useState<any[]>([]);
  const [channels, setChannels] = useState<any[]>([]);
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [allBrands, setAllBrands] = useState<any[]>([]);
  const [selectedBrandId, setSelectedBrandId] = useState<string | null>(null);
  const [selectedBrand, setSelectedBrand] = useState<any | null>(null);
  const [range,    setRange]    = useState<DateRange>(defaultRange());
  const [loading,  setLoading]  = useState(true);
  const [tick,     setTick]     = useState(0);
  const [sortCol,  setSortCol]  = useState<string>("spend");
  const [sortAsc,  setSortAsc]  = useState(false);
  const [campFilter, setCampFilter] = useState("ALL");

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setDaily([]);
    setCampaigns([]);

    const brandIdParam = selectedBrandId ? `&brand_id=${selectedBrandId}` : '';

    Promise.all([
      axios.get(`${API}/analytics/overview?date_from=${range.from}&date_to=${range.to}${brandIdParam}`),
      axios.get(`${API}/analytics/by-channel?date_from=${range.from}&date_to=${range.to}${brandIdParam}`),
      axios.get(`${API}/analytics/campaigns?date_from=${range.from}&date_to=${range.to}${brandIdParam}`),
    ])
      .then(([ov, ch, camp]) => {
        if (cancelled) return;
        setDaily(ov.data.daily ?? []);
        setChannels(ch.data ?? []);
        setCampaigns(camp.data ?? []);
      })
      .catch(() => { if (!cancelled) { setDaily([]); setCampaigns([]); } })
      .finally(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; };
  }, [range.from, range.to, tick, selectedBrandId]);

  useEffect(() => {
    // Fetch all brands
    const fetchAllBrands = async () => {
      try {
        const r = await axios.get(`${API}/brands/`);
        setAllBrands(r.data);
        if (r.data.length > 0) {
          setSelectedBrandId(r.data[0].id); // Select the first brand by default
        }
      } catch (error) {
        console.error("Failed to fetch all brands:", error);
      }
    };
    fetchAllBrands();
  }, []); // Run only once on component mount

  useEffect(() => {
    // Update selectedBrand object when selectedBrandId or allBrands changes
    if (selectedBrandId && allBrands.length > 0) {
      const brand = allBrands.find(b => b.id === selectedBrandId);
      setSelectedBrand(brand || null);
    } else {
      setSelectedBrand(null);
    }
  }, [selectedBrandId, allBrands]);

  const totalSpend       = daily.reduce((s, r) => s + r.spend, 0);
  const totalRevenue     = daily.reduce((s, r) => s + r.revenue, 0);
  const totalConversions = daily.reduce((s, r) => s + r.conversions, 0);
  const avgRoas = totalSpend > 0 ? totalRevenue / totalSpend : 0;
  const avgCtr  = daily.length > 0 ? daily.reduce((s, r) => s + (r.ctr || 0), 0) / daily.length : 0;

  const mid        = Math.floor(daily.length / 2);
  const roasFirst  = mid > 0 ? daily.slice(0, mid).reduce((s, r) => s + r.roas, 0) / mid : 0;
  const roasSecond = daily.length - mid > 0 ? daily.slice(mid).reduce((s, r) => s + r.roas, 0) / (daily.length - mid) : 0;
  const roasTrend  = roasFirst > 0 ? ((roasSecond - roasFirst) / roasFirst) * 100 : 0;

  // Sortable campaigns
  const toggleSort = (col: string) => {
    if (sortCol === col) setSortAsc(a => !a);
    else { setSortCol(col); setSortAsc(false); }
  };

  const filteredCampaigns = campaigns.filter((c: any) => {
    if (campFilter === "ACTIVE") return c.status === "ACTIVE";
    if (campFilter === "PAUSED") return c.status === "PAUSED";
    return true;
  });

  const sorted = [...filteredCampaigns].sort((a, b) => {
    const av = a[sortCol] ?? 0, bv = b[sortCol] ?? 0;
    if (typeof av === "string") return sortAsc ? av.localeCompare(bv) : bv.localeCompare(av);
    return sortAsc ? av - bv : bv - av;
  });

  const SortTh = ({ col, label }: { col: string; label: string }) => (
    <th
      onClick={() => toggleSort(col)}
      className="text-left px-4 py-4 text-[10px] font-medium uppercase tracking-widest text-slate-500 cursor-pointer hover:text-slate-300 select-none whitespace-nowrap"
    >
      {label}{sortCol === col ? (sortAsc ? " ↑" : " ↓") : ""}
    </th>
  );

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-3xl font-medium text-white">📊 Analytics</h1>
          <p className="text-slate-500 mt-1">
            {loading ? "Loading..." : `${daily.length} day${daily.length !== 1 ? "s" : ""} · ${range.from} → ${range.to}`}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {allBrands.length > 0 && (
            <>
              {selectedBrand?.logo_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={selectedBrand.logo_url} alt={selectedBrand.name} className="w-8 h-8 rounded-full object-cover shadow-sm" />
              ) : (
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-medium shadow-sm"
                  style={{ backgroundColor: selectedBrand?.color || '#6366f1' }}
                >
                  {selectedBrand?.name?.slice(0, 2).toUpperCase() || 'BR'}
                </div>
              )}
              <select
                value={selectedBrandId || ''}
                onChange={(e) => setSelectedBrandId(e.target.value)}
                className="px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:border-indigo-500 font-medium"
              >
                {allBrands.map((brand) => (
                  <option key={brand.id} value={brand.id}>
                    {brand.name}
                  </option>
                ))}
              </select>
            </>
          )}
          <DateRangePicker value={range} onChange={setRange} />
          <button onClick={() => setTick(t => t + 1)} className="p-2.5 border border-white/10 rounded-xl hover:bg-white/5 transition-all text-slate-400">
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 xl:grid-cols-5 gap-4">
        {[
          { label: "Total Spend",   value: loading ? "..." : fmtMoney(totalSpend),            color: "text-white" },
          { label: "Total Revenue", value: loading ? "..." : fmtMoney(totalRevenue),           color: "text-emerald-400" },
          { label: "Avg ROAS",      value: loading ? "..." : `${avgRoas.toFixed(2)}x`,
            sub: !loading && roasTrend !== 0 ? `${roasTrend > 0 ? "↑" : "↓"} ${Math.abs(roasTrend).toFixed(1)}% trend` : null,
            color: avgRoas >= 3 ? "text-emerald-400" : "text-amber-400", trendPos: roasTrend > 0 },
          { label: "Conversions",   value: loading ? "..." : fmtNum(totalConversions),         color: "text-indigo-400" },
          { label: "Avg CTR",       value: loading ? "..." : `${avgCtr.toFixed(2)}%`,          color: "text-slate-200" },
        ].map(({ label, value, sub, color, trendPos }: any) => (
          <div key={label} className="p-5 bg-white/5 border border-white/5 rounded-2xl">
            <p className="text-[10px] font-medium uppercase tracking-widest text-slate-500 mb-2">{label}</p>
            <p className={`text-2xl font-medium ${color}`}>{value}</p>
            {sub && <p className={`text-[10px] mt-1 font-medium ${trendPos ? "text-emerald-500" : "text-red-400"}`}>{sub}</p>}
          </div>
        ))}
      </div>

      {/* Channel Breakdown */}
      {channels.length > 0 && (
        <div>
          <h2 className="text-sm font-medium uppercase tracking-widest text-slate-400 mb-4">Channel Breakdown</h2>
          <div className="grid grid-cols-3 gap-5">
            {channels.map((ch: any) => {
              const roasOk = ch.roas >= 3;
              return (
                <div key={ch.channel} className="p-5 bg-white/5 border border-white/5 rounded-2xl">
                  <div className="flex justify-between items-start mb-4">
                    <span className="text-xs font-medium bg-indigo-500/10 text-indigo-400 px-2 py-1 rounded-lg uppercase">{ch.channel}</span>
                    {roasOk ? <TrendingUp className="w-4 h-4 text-emerald-400" /> : <TrendingDown className="w-4 h-4 text-amber-400" />}
                  </div>
                  <p className={`text-2xl font-medium ${roasOk ? "text-emerald-400" : "text-amber-400"}`}>{ch.roas.toFixed(2)}x</p>
                  <p className="text-xs text-slate-500 mt-1">ROAS · {fmtMoney(ch.spend)} spend · {fmtMoney(ch.revenue)} rev</p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Daily Breakdown Table */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-medium uppercase tracking-widest text-slate-400">Daily Breakdown</h2>
          <span className="text-xs text-slate-600">{daily.length} rows</span>
        </div>
        <div className="bg-white/5 border border-white/5 rounded-2xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/5">
                {["Date", "Spend", "Revenue", "ROAS", "Conversions", "Clicks", "CTR"].map((h) => (
                  <th key={h} className="text-left px-5 py-4 text-[10px] font-medium uppercase tracking-widest text-slate-500">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} className="text-center py-12 text-slate-500">
                  <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 opacity-50" />Loading...
                </td></tr>
              ) : daily.length === 0 ? (
                <tr><td colSpan={7} className="text-center py-10 text-slate-500">No data for selected range</td></tr>
              ) : (
                [...daily].reverse().map((r: any, i: number) => {
                  const roasOk = r.roas >= 3;
                  return (
                    <tr key={i} className="border-b border-white/5 last:border-0 hover:bg-white/5 transition-colors">
                      <td className="px-5 py-3 text-slate-400 font-mono text-xs">{r.date}</td>
                      <td className="px-5 py-3 font-medium text-white">{fmtMoney(r.spend)}</td>
                      <td className="px-5 py-3 font-medium text-emerald-400">{fmtMoney(r.revenue)}</td>
                      <td className={`px-5 py-3 font-medium ${roasOk ? "text-emerald-400" : "text-amber-400"}`}>{r.roas}x</td>
                      <td className="px-5 py-3 text-slate-300">{fmtNum(r.conversions)}</td>
                      <td className="px-5 py-3 text-slate-400">{fmtNum(r.clicks)}</td>
                      <td className="px-5 py-3 text-slate-400">{r.ctr}%</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Campaign Performance Table */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-4">
            <h2 className="text-sm font-medium uppercase tracking-widest text-slate-400">Campaign Performance</h2>
            <div className="flex space-x-1 bg-white/5 rounded-lg p-1">
              {["ALL", "ACTIVE", "PAUSED"].map(f => (
                <button
                  key={f}
                  onClick={() => setCampFilter(f)}
                  className={`px-3 py-1 text-[10px] font-medium uppercase tracking-widest rounded transition-colors ${
                    campFilter === f ? "bg-white text-black drop-shadow-sm" : "text-slate-500 hover:text-white"
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>
          <span className="text-xs text-slate-600">{filteredCampaigns.length} campaigns · click header to sort</span>
        </div>
        <div className="bg-white/5 border border-white/5 rounded-2xl overflow-hidden overflow-x-auto">
          <table className="w-full text-sm min-w-[900px]">
            <thead>
              <tr className="border-b border-white/5">
                <SortTh col="campaign_name" label="Campaign" />
                <SortTh col="spend"         label="Spend" />
                <SortTh col="revenue"       label="Revenue" />
                <SortTh col="roas"          label="ROAS" />
                <SortTh col="conversions"   label="Conv" />
                <SortTh col="atc"           label="ATC" />
                <SortTh col="checkout"      label="Checkout" />
                <SortTh col="clicks"        label="Clicks" />
                <SortTh col="impressions"   label="Impr" />
                <SortTh col="ctr"           label="CTR" />
                <SortTh col="cvr"           label="CVR" />
                <SortTh col="cpa"           label="CPA" />
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={12} className="text-center py-12 text-slate-500">
                    <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 opacity-50" />
                    Loading campaigns...
                  </td>
                </tr>
              ) : sorted.length === 0 ? (
                <tr>
                  <td colSpan={12} className="text-center py-10 text-slate-500">
                    No campaign data — run Sync History first
                  </td>
                </tr>
              ) : (
                sorted.map((c: any) => {
                  const roasOk = c.roas >= 3;
                  return (
                    <tr key={c.campaign_id} className="border-b border-white/5 last:border-0 hover:bg-white/5 transition-colors">
                      <td className="px-4 py-3 font-medium text-white max-w-[220px] truncate" title={c.campaign_name}>
                        <div className="flex items-center gap-2">
                          {c.status === "ACTIVE" && (
                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.8)] flex-shrink-0" title="Active" />
                          )}
                          <span className="truncate">{c.campaign_name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 font-medium text-white">{fmtMoney(c.spend)}</td>
                      <td className="px-4 py-3 font-medium text-emerald-400">{fmtMoney(c.revenue)}</td>
                      <td className={`px-4 py-3 font-medium ${roasOk ? "text-emerald-400" : "text-amber-400"}`}>
                        {c.roas.toFixed(2)}x
                      </td>
                      <td className="px-4 py-3 text-slate-300">{fmtNum(c.conversions)}</td>
                      <td className="px-4 py-3 text-slate-300">{fmtNum(c.atc)}</td>
                      <td className="px-4 py-3 text-slate-400">{fmtNum(c.checkout)}</td>
                      <td className="px-4 py-3 text-slate-400">{fmtNum(c.clicks)}</td>
                      <td className="px-4 py-3 text-slate-400">{fmtNum(c.impressions)}</td>
                      <td className="px-4 py-3 text-slate-400">{c.ctr}%</td>
                      <td className="px-4 py-3 text-slate-400">{c.cvr}%</td>
                      <td className="px-4 py-3 text-slate-400">{c.cpa ? fmtMoney(c.cpa) : "—"}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
