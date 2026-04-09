"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import axios from "axios";
import {
  ArrowLeft, TrendingUp, TrendingDown, RefreshCw,
  ShoppingCart, MousePointer, Eye, CreditCard, Package,
} from "lucide-react";
import DateRangePicker, { defaultRange, type DateRange } from "@/components/DateRangePicker";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";
const fmtMoney = (v: number) => "₹" + Math.round(v).toLocaleString("en-IN");
const fmtNum   = (v: number) => Math.round(v).toLocaleString("en-IN");

// ── Mini bar chart ────────────────────────────────────────────────────────────
function SparkBars({ data, field, color = "bg-indigo-500" }: { data: any[]; field: string; color?: string }) {
  if (!data.length) return null;
  const max = Math.max(...data.map((r) => r[field] || 0), 1);
  return (
    <div className="flex items-end gap-0.5 h-10">
      {data.map((r, i) => (
        <div
          key={i}
          className={`flex-1 rounded-sm ${color} opacity-80`}
          style={{ height: `${Math.max(4, ((r[field] || 0) / max) * 100)}%` }}
          title={`${r.date}: ${r[field]}`}
        />
      ))}
    </div>
  );
}

// ── Funnel step ───────────────────────────────────────────────────────────────
function FunnelStep({ label, value, pct, icon: Icon, color }: any) {
  return (
    <div className="flex-1 text-center">
      <div className={`w-10 h-10 rounded-xl ${color} flex items-center justify-center mx-auto mb-2`}>
        <Icon className="w-4 h-4 text-white" />
      </div>
      <p className="text-lg font-medium text-white">{fmtNum(value)}</p>
      <p className="text-[10px] text-slate-500 font-medium uppercase tracking-wider mt-0.5">{label}</p>
      {pct !== null && (
        <p className="text-[10px] text-indigo-400 font-medium mt-0.5">{pct}%</p>
      )}
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function BrandDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState<DateRange>(defaultRange());
  const [sortCol, setSortCol] = useState<string>("spend");
  const [sortAsc, setSortAsc] = useState(false);
  const [campFilter, setCampFilter] = useState("ALL");

  const fetch = (r: DateRange) => {
    setLoading(true);
    axios
      .get(`${API}/brands/${id}/detail?date_from=${r.from}&date_to=${r.to}`)
      .then((res) => setData(res.data))
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetch(range); }, [id, range.from, range.to]);

  const brand   = data?.brand;
  const summary = data?.summary ?? {};
  const daily   = data?.daily   ?? [];
  const sc      = data?.scorecard ?? [];

  // ROAS trend: first half vs second half of daily range
  const mid        = Math.floor(daily.length / 2);
  const roasFirst  = mid > 0 ? daily.slice(0, mid).reduce((s: number, r: any) => s + r.roas, 0) / mid : 0;
  const roasSecond = daily.length - mid > 0 ? daily.slice(mid).reduce((s: number, r: any) => s + r.roas, 0) / (daily.length - mid) : 0;
  const roasTrend  = roasFirst > 0 ? ((roasSecond - roasFirst) / roasFirst) * 100 : 0;

  const targetRoas = brand?.target_roas ?? 3;
  const roasOk     = summary.roas >= targetRoas;
  const campaigns  = data?.campaigns ?? [];

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

  const sortedCampaigns = [...filteredCampaigns].sort((a: any, b: any) => {
    const av = a[sortCol] ?? 0, bv = b[sortCol] ?? 0;
    if (typeof av === "string") return sortAsc ? av.localeCompare(bv) : bv.localeCompare(av);
    return sortAsc ? av - bv : bv - av;
  });

  const SortTh = ({ col, label }: { col: string; label: string }) => (
    <th
      onClick={() => toggleSort(col)}
      className="text-left px-4 py-3 text-[10px] font-medium uppercase tracking-widest text-slate-500 cursor-pointer hover:text-slate-300 select-none whitespace-nowrap"
    >
      {label}{sortCol === col ? (sortAsc ? " ↑" : " ↓") : ""}
    </th>
  );

  // Funnel rates
  const ctrPct      = summary.impressions > 0 ? ((summary.clicks    / summary.impressions) * 100).toFixed(1) : "0.0";
  const atcPct      = summary.clicks      > 0 ? ((summary.atc       / summary.clicks)      * 100).toFixed(1) : "0.0";
  const checkoutPct = summary.atc         > 0 ? ((summary.checkout  / summary.atc)         * 100).toFixed(1) : "0.0";
  const purchasePct = summary.checkout    > 0 ? ((summary.purchases / summary.checkout)    * 100).toFixed(1) : "0.0";

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-end justify-between">
        <div className="flex items-center gap-4">
          <button onClick={() => router.back()} className="p-2 rounded-xl border border-white/10 hover:bg-white/5 transition-all text-slate-400">
            <ArrowLeft className="w-4 h-4" />
          </button>
          {brand && (
            <div className="flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-medium text-sm shadow-lg overflow-hidden"
                style={{ backgroundColor: brand.color }}
              >
                {brand.logo_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={brand.logo_url} alt={brand.name} className="w-full h-full object-cover" />
                ) : (
                  brand.name.slice(0, 2).toUpperCase()
                )}
              </div>
              <div>
                <h1 className="text-2xl font-medium text-white">{brand.name}</h1>
                <p className="text-slate-500 text-sm">{brand.industry} · Target {targetRoas}× ROAS · {range.from} → {range.to}</p>
              </div>
            </div>
          )}
        </div>
        <div className="flex items-center gap-3">
          <DateRangePicker value={range} onChange={setRange} />
          <button onClick={() => fetch(range)} className="p-2.5 border border-white/10 rounded-xl hover:bg-white/5 transition-all text-slate-400">
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {loading && !data ? (
        <div className="py-24 text-center text-slate-500">
          <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-3 opacity-40" />
          Loading brand data...
        </div>
      ) : (
        <>
          {/* KPIs for selected range */}
          <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
            {[
              { label: "Revenue",   value: fmtMoney(summary.revenue ?? 0),   sub: range.label,    color: "text-emerald-400" },
              { label: "ROAS",      value: `${(summary.roas ?? 0).toFixed(2)}×`, sub: `Target ${targetRoas}×`, color: roasOk ? "text-emerald-400" : "text-amber-400" },
              { label: "Spend",     value: fmtMoney(summary.spend ?? 0),     sub: range.label,    color: "text-white" },
              { label: "Purchases", value: fmtNum(summary.purchases ?? 0),   sub: summary.purchases > 0 ? `CPA ${fmtMoney((summary.spend ?? 0) / summary.purchases)}` : "CPA —", color: "text-indigo-400" },
            ].map(({ label, value, sub, color }) => (
              <div key={label} className="p-5 bg-white/5 border border-white/5 rounded-2xl">
                <p className="text-[10px] font-medium uppercase tracking-widest text-slate-500 mb-2">{label}</p>
                <p className={`text-2xl font-medium ${color}`}>{value}</p>
                <p className="text-[10px] text-slate-600 mt-1 font-medium">{sub}</p>
              </div>
            ))}
          </div>

          {/* ATC + CTR cards */}
          <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
            <div className="p-5 bg-white/5 border border-white/5 rounded-2xl">
              <p className="text-[10px] font-medium uppercase tracking-widest text-slate-500 mb-2">Add to Cart</p>
              <p className="text-2xl font-medium text-white">{fmtNum(summary.atc ?? 0)}</p>
              <p className="text-[10px] text-slate-600 mt-1">total · {fmtMoney(summary.atc_value ?? 0)}</p>
            </div>
            <div className="p-5 bg-white/5 border border-white/5 rounded-2xl">
              <p className="text-[10px] font-medium uppercase tracking-widest text-slate-500 mb-2">Checkout</p>
              <p className="text-2xl font-medium text-white">{fmtNum(summary.checkout ?? 0)}</p>
              <p className="text-[10px] text-slate-600 mt-1">{checkoutPct}% of ATC</p>
            </div>
            <div className="p-5 bg-white/5 border border-white/5 rounded-2xl">
              <p className="text-[10px] font-medium uppercase tracking-widest text-slate-500 mb-2">CTR</p>
              <p className="text-2xl font-medium text-white">{summary.ctr ?? 0}%</p>
              <p className="text-[10px] text-slate-600 mt-1">{fmtNum(summary.impressions ?? 0)} impr</p>
            </div>
            <div className="p-5 bg-white/5 border border-white/5 rounded-2xl">
              <p className="text-[10px] font-medium uppercase tracking-widest text-slate-500 mb-2">ROAS Trend</p>
              <p className={`text-2xl font-medium ${roasTrend >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                {roasTrend >= 0 ? "↑" : "↓"} {Math.abs(roasTrend).toFixed(1)}%
              </p>
              <p className="text-[10px] text-slate-600 mt-1">vs first half of period</p>
            </div>
          </div>

          {/* Conversion Funnel */}
          <div className="p-6 bg-white/5 border border-white/5 rounded-2xl">
            <h2 className="text-sm font-medium uppercase tracking-widest text-slate-400 mb-6">
              Conversion Funnel — Today
            </h2>
            <p className="text-[10px] text-slate-600 mb-4 uppercase tracking-widest">
              Impressions → Clicks → ATC → Checkout → Purchase · {range.label}
            </p>
            <div className="flex items-start gap-2">
              <FunnelStep label="Impressions" value={summary.impressions ?? 0} pct={null}         icon={Eye}           color="bg-slate-700" />
              <div className="flex items-center self-center pb-6 text-slate-700">→</div>
              <FunnelStep label="Clicks"      value={summary.clicks ?? 0}      pct={ctrPct}       icon={MousePointer}  color="bg-indigo-600" />
              <div className="flex items-center self-center pb-6 text-slate-700">→</div>
              <FunnelStep label="Add to Cart" value={summary.atc ?? 0}         pct={atcPct}       icon={ShoppingCart}  color="bg-violet-600" />
              <div className="flex items-center self-center pb-6 text-slate-700">→</div>
              <FunnelStep label="Checkout"    value={summary.checkout ?? 0}    pct={checkoutPct}  icon={CreditCard}    color="bg-amber-600" />
              <div className="flex items-center self-center pb-6 text-slate-700">→</div>
              <FunnelStep label="Purchases"   value={summary.purchases ?? 0}   pct={purchasePct}  icon={Package}       color="bg-emerald-600" />
            </div>
          </div>

          {/* Charts row */}
          <div className="grid grid-cols-2 gap-5">
            {/* Spend vs Revenue */}
            <div className="p-6 bg-white/5 border border-white/5 rounded-2xl">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-medium uppercase tracking-widest text-slate-400">Spend vs Revenue</h2>
                <span className="text-[10px] text-slate-600">{daily.length}-day</span>
              </div>
              <div className="flex gap-4 mb-3">
                <SparkBars data={daily} field="spend"   color="bg-indigo-500" />
                <SparkBars data={daily} field="revenue" color="bg-emerald-500" />
              </div>
              <div className="flex gap-6 text-[10px] font-medium uppercase text-slate-500">
                <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-indigo-500 inline-block" />Spend</span>
                <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />Revenue</span>
              </div>
            </div>

            {/* ROAS Trend */}
            <div className="p-6 bg-white/5 border border-white/5 rounded-2xl">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-medium uppercase tracking-widest text-slate-400">ROAS Trend</h2>
                <span className="text-[10px] text-slate-600">Target: {targetRoas}×</span>
              </div>
              <SparkBars data={daily} field="roas" color={roasOk ? "bg-emerald-500" : "bg-amber-500"} />
              <div className="flex items-center justify-between mt-3 text-[10px] font-medium text-slate-600 uppercase">
                <span>{daily[0]?.date}</span>
                <span>{daily[daily.length - 1]?.date}</span>
              </div>
            </div>
          </div>

          {/* Campaign Performance Table */}
          {campaigns.length > 0 && (
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
                    {sortedCampaigns.map((c: any) => {
                      const isRoasOk = c.roas >= targetRoas;
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
                          <td className={`px-4 py-3 font-medium ${isRoasOk ? "text-emerald-400" : "text-amber-400"}`}>
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
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Account Scorecard */}
          {sc.length > 0 && (
            <div>
              <h2 className="text-sm font-medium uppercase tracking-widest text-slate-400 mb-4">Account Scorecard</h2>
              <div className="bg-white/5 border border-white/5 rounded-2xl overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-white/5">
                      {["Account", "Ch", "Spend", "Revenue", "ROAS", "ATC", "Conv", "CVR", "CPA", "Score"].map((h) => (
                        <th key={h} className="text-left px-4 py-3 text-[10px] font-medium uppercase tracking-widest text-slate-500">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {sc.map((row: any) => {
                      const ok = row.roas >= targetRoas;
                      return (
                        <tr key={row.account_id} className="border-b border-white/5 last:border-0 hover:bg-white/5 transition-colors">
                          <td className="px-4 py-3 font-medium text-white text-xs truncate max-w-[140px]">{row.account_name}</td>
                          <td className="px-4 py-3">
                            <span className="text-[10px] font-medium bg-indigo-500/10 text-indigo-400 px-2 py-0.5 rounded-lg">{row.platform}</span>
                          </td>
                          <td className="px-4 py-3 font-medium text-white">{fmtMoney(row.spend)}</td>
                          <td className="px-4 py-3 font-medium text-emerald-400">{fmtMoney(row.revenue)}</td>
                          <td className={`px-4 py-3 font-medium ${ok ? "text-emerald-400" : "text-amber-400"}`}>{row.roas.toFixed(2)}×</td>
                          <td className="px-4 py-3 text-slate-300">{row.atc}</td>
                          <td className="px-4 py-3 text-slate-300">{row.conversions}</td>
                          <td className="px-4 py-3 text-slate-400">{row.cvr}%</td>
                          <td className="px-4 py-3 text-slate-400">{row.cpa ? fmtMoney(row.cpa) : "—"}</td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <div className="flex-1 h-1.5 bg-white/5 rounded-full overflow-hidden">
                                <div className={`h-full rounded-full ${row.score >= 60 ? "bg-emerald-500" : row.score >= 30 ? "bg-amber-500" : "bg-red-500"}`}
                                  style={{ width: `${row.score}%` }} />
                              </div>
                              <span className="text-[10px] font-medium text-slate-400 w-6 text-right">{row.score}</span>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
