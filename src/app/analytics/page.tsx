"use client";
import { useEffect, useState, useRef } from "react";
import axios from "axios";
import { RefreshCw } from "lucide-react";
import DateRangePicker, { useDateRange, type DateRange } from "@/components/DateRangePicker";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";
const fmtMoney = (v: number) => "₹" + Math.round(v).toLocaleString("en-IN");
const fmtNum   = (v: number) => Math.round(v).toLocaleString("en-IN");
const fmtShort = (v: number) =>
  v >= 1_00_00_000 ? `₹${(v / 1_00_00_000).toFixed(1)}Cr`
  : v >= 1_00_000  ? `₹${(v / 1_00_000).toFixed(1)}L`
  : v >= 1_000     ? `₹${(v / 1_000).toFixed(0)}k`
  : `₹${Math.round(v)}`;

// ── Smooth Bezier path helper ─────────────────────────────────────────────────
// Converts array of [x,y] points into a smooth SVG cubic bezier path string
function smoothPath(pts: [number, number][]): string {
  if (pts.length < 2) return "";
  const tension = 0.35;
  let d = `M ${pts[0][0]} ${pts[0][1]}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(i - 1, 0)];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[Math.min(i + 2, pts.length - 1)];
    const cp1x = p1[0] + (p2[0] - p0[0]) * tension;
    const cp1y = p1[1] + (p2[1] - p0[1]) * tension;
    const cp2x = p2[0] - (p3[0] - p1[0]) * tension;
    const cp2y = p2[1] - (p3[1] - p1[1]) * tension;
    d += ` C ${cp1x.toFixed(2)} ${cp1y.toFixed(2)}, ${cp2x.toFixed(2)} ${cp2y.toFixed(2)}, ${p2[0]} ${p2[1]}`;
  }
  return d;
}

// ── Sparkline — tiny line graph, no axes ─────────────────────────────────────
function SparkLine({ values, color }: { values: number[]; color: string }) {
  const W = 80, H = 28;
  const valid = values.filter(v => !isNaN(v));
  if (valid.length < 2) return <div style={{ width: W, height: H }} />;
  const min = Math.min(...valid), max = Math.max(...valid), range = max - min || 1;
  const pts: [number, number][] = valid.map((v, i) => [
    (i / (valid.length - 1)) * W,
    H - 2 - ((v - min) / range) * (H - 6),
  ]);
  const path = smoothPath(pts);
  const last  = pts[pts.length - 1];
  const first = pts[0];
  const up    = last[1] <= first[1];          // lower y = higher on screen = up
  const id    = `sp-${color.replace(/[^a-z]/g, "")}${Math.random().toString(36).slice(2, 6)}`;
  return (
    <svg width={W} height={H} className="overflow-visible flex-shrink-0">
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor={color} stopOpacity={0.28} />
          <stop offset="100%" stopColor={color} stopOpacity={0}    />
        </linearGradient>
      </defs>
      {/* Gradient fill */}
      <path
        d={`${path} L ${pts[pts.length - 1][0]} ${H} L ${pts[0][0]} ${H} Z`}
        fill={`url(#${id})`}
      />
      {/* Line */}
      <path d={path} fill="none" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
      {/* End dot */}
      <circle cx={last[0]} cy={last[1]} r={2} fill={color} />
    </svg>
  );
}

// ── KPI card ─────────────────────────────────────────────────────────────────
function KpiCard({
  label, value, sub, accentColor, textColor, sparkValues, loading,
}: {
  label: string; value: string; sub?: string;
  accentColor: string; textColor: string;
  sparkValues: number[]; loading: boolean;
}) {
  return (
    <div className="p-5 bg-white/5 border border-white/5 rounded-2xl relative overflow-hidden">
      {/* Accent top border */}
      <div className="absolute top-0 left-0 right-0 h-[2px]" style={{ background: accentColor }} />
      <p className="text-[10px] font-medium uppercase tracking-widest text-slate-500 mb-2">{label}</p>
      <p className={`text-2xl font-semibold ${textColor}`}>{loading ? "…" : value}</p>
      {sub && <p className="text-[10px] text-slate-600 mt-1">{sub}</p>}
      {/* Sparkline pushed to bottom-right */}
      {!loading && sparkValues.length >= 2 && (
        <div className="flex justify-end mt-2">
          <SparkLine values={sparkValues} color={accentColor} />
        </div>
      )}
    </div>
  );
}

// ── Bar chart — grouped vertical bars with X/Y axes ──────────────────────────
function BarChart({ data, keys, colors, fmtTip, fmtAxis, keyLabels }: {
  data: Record<string, any>[]; keys: string[]; colors: string[];
  fmtTip: (v: number) => string; fmtAxis: (v: number) => string; keyLabels?: string[];
}) {
  const [tip, setTip] = useState<{ x: number; y: number; date: string; vals: number[] } | null>(null);
  const W = 400, H = 160, PAD_L = 40, PAD_B = 24, PAD_T = 10, PAD_R = 8;
  const iW = W - PAD_L - PAD_R, iH = H - PAD_T - PAD_B;
  const allVals = data.flatMap(d => keys.map(k => Number(d[k]) || 0));
  const maxV = Math.max(...allVals, 1);
  const slotW = iW / (data.length || 1);
  const barW  = (slotW / keys.length) * 0.62;
  const barGap = (slotW / keys.length) * 0.08;
  const totalGroupW = keys.length * barW + (keys.length - 1) * barGap;
  const TIP_W = 88, TIP_H = 12 + keys.length * 13;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ display: 'block', height: 'auto' }}
      onMouseLeave={() => setTip(null)}>
      {Array.from({ length: 5 }, (_, i) => {
        const v = (maxV / 4) * i;
        const y = PAD_T + iH - (v / maxV) * iH;
        return (
          <g key={i}>
            <line x1={PAD_L} x2={W - PAD_R} y1={y} y2={y} stroke="rgba(99,140,255,0.07)" strokeWidth={0.6} />
            <text x={PAD_L - 3} y={y + 3} fill="#475569" fontSize={9} textAnchor="end" fontFamily="monospace">{fmtAxis(v)}</text>
          </g>
        );
      })}
      {data.map((d, i) => {
        const slotX  = PAD_L + i * slotW;
        const groupX = slotX + (slotW - totalGroupW) / 2;
        const vals   = keys.map(k => Number(d[k]) || 0);
        const minBarY = Math.min(...vals.map(v => PAD_T + iH - Math.max((v / maxV) * iH, 1)));
        return (
          <g key={i}>
            {keys.map((k, ki) => {
              const v = Number(d[k]) || 0;
              const bH = Math.max((v / maxV) * iH, v > 0 ? 1 : 0);
              const x = groupX + ki * (barW + barGap);
              const y = PAD_T + iH - bH;
              return <rect key={k} x={x} y={y} width={barW} height={bH} fill={colors[ki]} rx={2} opacity={0.85} />;
            })}
            <rect x={slotX} y={PAD_T} width={slotW} height={iH} fill="transparent"
              onMouseEnter={() => setTip({ x: slotX + slotW / 2, y: minBarY, date: String(d.date ?? ""), vals })} />
            {(i % Math.max(1, Math.floor(data.length / 10)) === 0 || i === data.length - 1) && (
              <text x={slotX + slotW / 2} y={H - PAD_B + 12} fill="#475569" fontSize={8} textAnchor="middle" fontFamily="monospace">
                {String(d.date ?? "").slice(5)}
              </text>
            )}
          </g>
        );
      })}
      {tip && (() => {
        const tx = Math.min(Math.max(tip.x - TIP_W / 2, PAD_L), W - PAD_R - TIP_W);
        const ty = Math.max(tip.y - TIP_H - 6, PAD_T);
        return (
          <g style={{ pointerEvents: 'none' }}>
            <rect x={tx} y={ty} width={TIP_W} height={TIP_H} rx={4} fill="#1e293b" stroke="rgba(255,255,255,0.1)" strokeWidth={0.5} />
            <text x={tx + 6} y={ty + 9} fill="#94a3b8" fontSize={7} fontFamily="monospace">{tip.date}</text>
            {tip.vals.map((v, ki) => (
              <g key={ki}>
                <rect x={tx + 6} y={ty + 13 + ki * 13} width={5} height={5} rx={1} fill={colors[ki]} />
                <text x={tx + 14} y={ty + 18 + ki * 13} fill="#f1f5f9" fontSize={7.5} fontFamily="monospace">
                  {(keyLabels?.[ki] ?? keys[ki]).charAt(0).toUpperCase() + (keyLabels?.[ki] ?? keys[ki]).slice(1)}: {fmtTip(v)}
                </text>
              </g>
            ))}
          </g>
        );
      })()}
    </svg>
  );
}

// ── Line chart — smooth Bezier + optional dashed target ──────────────────────
function LineChart({ data, dataKey, color, fmtAxis, fmtTip, targetLine }: {
  data: Record<string, any>[]; dataKey: string; color: string;
  fmtAxis: (v: number) => string; fmtTip: (v: number) => string; targetLine?: number;
}) {
  const [tip, setTip] = useState<{ x: number; y: number; date: string; val: string } | null>(null);
  const W = 400, H = 160, PAD_L = 40, PAD_B = 24, PAD_T = 10, PAD_R = 8;
  const iW = W - PAD_L - PAD_R, iH = H - PAD_T - PAD_B;
  const vals   = data.map(d => Number(d[dataKey]) || 0);
  const allV   = targetLine != null ? [...vals, targetLine] : vals;
  const minV   = Math.min(...allV, 0), maxV = Math.max(...allV, 1), range = maxV - minV || 1;
  const toX    = (i: number) => PAD_L + (i / Math.max(data.length - 1, 1)) * iW;
  const toY    = (v: number) => PAD_T + iH - ((v - minV) / range) * iH;
  const pts: [number, number][] = data.map((d, i) => [toX(i), toY(Number(d[dataKey]) || 0)]);
  const path   = smoothPath(pts);
  const id     = `lc-${dataKey}-${Math.random().toString(36).slice(2, 6)}`;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ display: 'block', height: 'auto' }}
      onMouseLeave={() => setTip(null)}>
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor={color} stopOpacity={0.22} />
          <stop offset="100%" stopColor={color} stopOpacity={0}    />
        </linearGradient>
      </defs>
      {Array.from({ length: 5 }, (_, i) => {
        const v = minV + (range / 4) * i;
        const y = toY(v);
        return (
          <g key={i}>
            <line x1={PAD_L} x2={W - PAD_R} y1={y} y2={y} stroke="rgba(99,140,255,0.07)" strokeWidth={0.6} />
            <text x={PAD_L - 3} y={y + 3} fill="#475569" fontSize={9} textAnchor="end" fontFamily="monospace">{fmtAxis(v)}</text>
          </g>
        );
      })}
      {targetLine != null && (
        <line x1={PAD_L} x2={W - PAD_R} y1={toY(targetLine)} y2={toY(targetLine)}
          stroke="rgba(245,158,11,0.55)" strokeWidth={1} strokeDasharray="4 3" />
      )}
      {pts.length > 1 && (
        <path d={`${path} L ${pts[pts.length-1][0]} ${PAD_T + iH} L ${pts[0][0]} ${PAD_T + iH} Z`} fill={`url(#${id})`} />
      )}
      {pts.length > 1 && (
        <path d={path} fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      )}
      {tip && (
        <line x1={tip.x} x2={tip.x} y1={PAD_T} y2={PAD_T + iH}
          stroke="rgba(255,255,255,0.12)" strokeWidth={0.8} />
      )}
      {pts.map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r={tip?.date === String(data[i]?.date ?? "") ? 3 : 2} fill={color} style={{ cursor: 'crosshair' }}
          onMouseEnter={() => setTip({ x, y, date: String(data[i]?.date ?? ""), val: fmtTip(Number(data[i]?.[dataKey]) || 0) })} />
      ))}
      {pts.map(([x, y], i) => (
        <circle key={`h${i}`} cx={x} cy={y} r={8} fill="transparent"
          onMouseEnter={() => setTip({ x, y, date: String(data[i]?.date ?? ""), val: fmtTip(Number(data[i]?.[dataKey]) || 0) })} />
      ))}
      {data.map((d, i) => {
        if (i % Math.max(1, Math.floor(data.length / 10)) !== 0 && i !== data.length - 1) return null;
        return <text key={i} x={toX(i)} y={H - PAD_B + 12} fill="#475569" fontSize={8} textAnchor="middle" fontFamily="monospace">{String(d.date ?? "").slice(5)}</text>;
      })}
      {tip && (() => {
        const TIP_W = 72, TIP_H = 26;
        const tx = Math.min(Math.max(tip.x - TIP_W / 2, PAD_L), W - PAD_R - TIP_W);
        const ty = Math.max(tip.y - TIP_H - 8, PAD_T);
        return (
          <g style={{ pointerEvents: 'none' }}>
            <rect x={tx} y={ty} width={TIP_W} height={TIP_H} rx={4} fill="#1e293b" stroke="rgba(255,255,255,0.1)" strokeWidth={0.5} />
            <text x={tx + 6} y={ty + 9} fill="#94a3b8" fontSize={7} fontFamily="monospace">{tip.date}</text>
            <circle cx={tx + 8} cy={ty + 18} r={3} fill={color} />
            <text x={tx + 14} y={ty + 21} fill="#f1f5f9" fontSize={8} fontFamily="monospace" fontWeight="600">{tip.val}</text>
          </g>
        );
      })()}
    </svg>
  );
}

// ── Types ─────────────────────────────────────────────────────────────────────
type MetricKey = "roas" | "spend" | "revenue" | "conversions" | "ctr";
const METRICS: { key: MetricKey; label: string; accent: string; textColor: string; fmtFn: (v: number) => string }[] = [
  { key: "spend",       label: "Spend",   accent: "#3b82f6", textColor: "text-blue-400",    fmtFn: fmtShort  },
  { key: "revenue",     label: "Revenue", accent: "#22c55e", textColor: "text-emerald-400", fmtFn: fmtShort  },
  { key: "roas",        label: "ROAS",    accent: "#14b8a6", textColor: "text-teal-400",    fmtFn: v => v.toFixed(2) + "×" },
  { key: "conversions", label: "Conv",    accent: "#a855f7", textColor: "text-purple-400",  fmtFn: fmtNum    },
  { key: "ctr",         label: "CTR",     accent: "#f59e0b", textColor: "text-amber-400",   fmtFn: v => v.toFixed(2) + "%" },
];

// ── Page ──────────────────────────────────────────────────────────────────────
export default function AnalyticsPage() {
  const [daily,      setDaily]      = useState<any[]>([]);
  const [channels,   setChannels]   = useState<any[]>([]);
  const [campaigns,  setCampaigns]  = useState<any[]>([]);
  const [allBrands,  setAllBrands]  = useState<any[]>([]);
  const [brandId,    setBrandId]    = useState<string | null>(null);
  const [range,      setRange]      = useDateRange();
  const [loading,    setLoading]    = useState(false);
  const [metric,     setMetric]     = useState<MetricKey>("spend");
  const [sortCol,    setSortCol]    = useState("spend");
  const [sortAsc,    setSortAsc]    = useState(false);
  const [campFilter, setCampFilter] = useState("ALL");
  const fetchRef = useRef(0);

  // Load brands first — then trigger analytics
  useEffect(() => {
    axios.get(`${API}/brands/`).then(r => {
      const brands = r.data || [];
      setAllBrands(brands);
      setBrandId(brands.length ? brands[0].id : "");
    }).catch(() => setBrandId(""));
  }, []);

  const loadData = (bid: string, r: DateRange, reqId: number) => {
    setLoading(true);
    const bq = bid ? `&brand_id=${bid}` : "";
    Promise.all([
      axios.get(`${API}/analytics/overview?date_from=${r.from}&date_to=${r.to}${bq}`),
      axios.get(`${API}/analytics/by-channel?date_from=${r.from}&date_to=${r.to}${bq}`),
      axios.get(`${API}/analytics/campaigns?date_from=${r.from}&date_to=${r.to}${bq}`),
    ]).then(([ov, ch, camp]) => {
      if (reqId !== fetchRef.current) return;
      setDaily(ov.data.daily ?? []);
      setChannels(ch.data ?? []);
      setCampaigns(camp.data ?? []);
    }).catch(() => {
      if (reqId !== fetchRef.current) return;
      setDaily([]); setChannels([]); setCampaigns([]);
    }).finally(() => {
      if (reqId === fetchRef.current) setLoading(false);
    });
  };

  useEffect(() => {
    if (brandId === null) return;
    const id = ++fetchRef.current;
    loadData(brandId, range, id);
  }, [brandId, range.from, range.to]);

  // Aggregates
  const totalSpend   = daily.reduce((s, r) => s + r.spend, 0);
  const totalRevenue = daily.reduce((s, r) => s + r.revenue, 0);
  const totalConv    = daily.reduce((s, r) => s + r.conversions, 0);
  const avgRoas      = totalSpend > 0 ? totalRevenue / totalSpend : 0;
  const avgCtr       = daily.length > 0 ? daily.reduce((s, r) => s + (r.ctr || 0), 0) / daily.length : 0;
  const mid          = Math.floor(daily.length / 2);
  const roasFirst    = mid > 0 ? daily.slice(0, mid).reduce((s, r) => s + r.roas, 0) / mid : 0;
  const roasSecond   = daily.length - mid > 0 ? daily.slice(mid).reduce((s, r) => s + r.roas, 0) / (daily.length - mid) : 0;
  const roasTrend    = roasFirst > 0 ? ((roasSecond - roasFirst) / roasFirst) * 100 : 0;
  const totalClicks  = daily.reduce((s, r) => s + (r.clicks || 0), 0);
  const totalImpr    = daily.reduce((s, r) => s + (r.impressions || 0), 0);

  const selectedBrand = allBrands.find(b => b.id === brandId);
  const targetRoas    = selectedBrand?.target_roas ?? 3;
  const roasOk        = avgRoas >= targetRoas;

  // Chart data
  const chartData = daily.map(r => ({ ...r, date: r.date }));

  // Active metric config
  const activeM = METRICS.find(m => m.key === metric)!;

  // Campaigns
  const toggleSort = (col: string) => {
    if (sortCol === col) setSortAsc(a => !a);
    else { setSortCol(col); setSortAsc(false); }
  };
  const filteredCamps = campaigns
    .filter(c =>
      campFilter === "ACTIVE" ? c.status === "ACTIVE" :
      campFilter === "PAUSED" ? c.status === "PAUSED" : true
    )
    .sort((a, b) => {
      const av = a[sortCol] ?? 0, bv = b[sortCol] ?? 0;
      if (typeof av === "string") return sortAsc ? av.localeCompare(bv) : bv.localeCompare(av);
      return sortAsc ? av - bv : bv - av;
    });

  const SortTh = ({ col, label }: { col: string; label: string }) => (
    <th onClick={() => toggleSort(col)}
      className="text-left px-4 py-3 text-[10px] font-medium uppercase tracking-widest text-slate-500 cursor-pointer hover:text-slate-300 select-none whitespace-nowrap">
      {label}{sortCol === col ? (sortAsc ? " ↑" : " ↓") : ""}
    </th>
  );

  if (brandId === null) {
    return (
      <div className="py-24 text-center text-slate-500">
        <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-3 opacity-40" />
        <p className="text-sm">Loading…</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-white tracking-tight">Analytics</h1>
          <p className="text-slate-500 text-sm mt-0.5">
            {loading ? "Fetching…" : `${daily.length} day${daily.length !== 1 ? "s" : ""} · ${range.from} → ${range.to}`}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {allBrands.length > 0 && (
            <select value={brandId} onChange={e => setBrandId(e.target.value)}
              className="px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:border-indigo-500">
              {allBrands.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          )}
          <DateRangePicker value={range} onChange={setRange} />
          <button
            onClick={() => { const id = ++fetchRef.current; loadData(brandId, range, id); }}
            className="p-2.5 border border-white/10 rounded-xl hover:bg-white/5 transition-all text-slate-400"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* ── KPI Cards with Sparklines ── */}
      <div className="grid grid-cols-2 xl:grid-cols-5 gap-3">
        <KpiCard
          label="Total Revenue"   loading={loading}
          value={fmtMoney(totalRevenue)}
          sub={`${range.label ?? range.from + " → " + range.to}`}
          accentColor="#22c55e"   textColor="text-emerald-400"
          sparkValues={daily.map(r => r.revenue)}
        />
        <KpiCard
          label="ROAS"            loading={loading}
          value={avgRoas.toFixed(2) + "×"}
          sub={`Target ${targetRoas}× · ${roasTrend >= 0 ? "↑" : "↓"} ${Math.abs(roasTrend).toFixed(1)}% trend`}
          accentColor={roasOk ? "#14b8a6" : "#f59e0b"}
          textColor={roasOk ? "text-teal-400" : "text-amber-400"}
          sparkValues={daily.map(r => r.roas)}
        />
        <KpiCard
          label="Total Spend"     loading={loading}
          value={fmtMoney(totalSpend)}
          sub="all channels"
          accentColor="#3b82f6"   textColor="text-white"
          sparkValues={daily.map(r => r.spend)}
        />
        <KpiCard
          label="Conversions"     loading={loading}
          value={fmtNum(totalConv)}
          sub={totalConv > 0 ? `CPA ${fmtMoney(totalSpend / totalConv)}` : "CPA —"}
          accentColor="#a855f7"   textColor="text-purple-400"
          sparkValues={daily.map(r => r.conversions)}
        />
        <KpiCard
          label="Avg CTR"         loading={loading}
          value={avgCtr.toFixed(2) + "%"}
          sub={`${fmtNum(totalImpr)} impressions`}
          accentColor="#f59e0b"   textColor="text-amber-400"
          sparkValues={daily.map(r => r.ctr)}
        />
      </div>

      {/* ── Main charts ── */}
      <div className="grid grid-cols-2 gap-5">

        {/* Spend vs Revenue — grouped bar chart */}
        <div className="p-6 bg-white/5 border border-white/5 rounded-2xl">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-medium uppercase tracking-widest text-slate-400">Spend vs Revenue</h2>
            <span className="text-[10px] text-slate-600 font-mono">{daily.length}-day</span>
          </div>
          {loading
            ? <div className="h-44 flex items-center justify-center"><RefreshCw className="w-4 h-4 animate-spin text-slate-700" /></div>
            : chartData.length === 0
              ? <div className="h-44 flex items-center justify-center text-slate-600 text-xs">No data</div>
              : <BarChart
                  data={chartData}
                  keys={["spend", "revenue"]}
                  colors={["rgba(59,130,246,0.75)", "rgba(34,197,94,0.75)"]}
                  fmtTip={fmtMoney}
                  fmtAxis={fmtShort}
                />
          }
          <div className="flex gap-5 mt-2 text-[10px] font-medium uppercase text-slate-500">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-sm bg-blue-500/75 inline-block" />Spend
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-sm bg-emerald-500/75 inline-block" />Revenue
            </span>
          </div>
        </div>

        {/* ROAS Trend — smooth line + dotted target */}
        <div className="p-6 bg-white/5 border border-white/5 rounded-2xl">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-medium uppercase tracking-widest text-slate-400">ROAS Trend</h2>
            <span className="text-[10px] text-slate-600 font-mono">Target {targetRoas}×</span>
          </div>
          {loading
            ? <div className="h-44 flex items-center justify-center"><RefreshCw className="w-4 h-4 animate-spin text-slate-700" /></div>
            : chartData.length === 0
              ? <div className="h-44 flex items-center justify-center text-slate-600 text-xs">No data</div>
              : <LineChart
                  data={chartData}
                  dataKey="roas"
                  color={roasOk ? "#14b8a6" : "#f59e0b"}
                  fmtAxis={v => v.toFixed(1) + "×"}
                  fmtTip={v => v.toFixed(2) + "×"}
                  targetLine={targetRoas}
                />
          }
        </div>

      </div>

      {/* ── Metric drill-down ── */}
      <div className="p-6 bg-white/5 border border-white/5 rounded-2xl">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3 flex-wrap">
            <h2 className="text-sm font-medium uppercase tracking-widest text-slate-400">Trend</h2>
            <div className="flex gap-1">
              {METRICS.map(m => (
                <button key={m.key} onClick={() => setMetric(m.key)}
                  className={`px-2.5 py-1 rounded-lg border text-[10px] font-semibold uppercase tracking-wide transition-all ${
                    metric === m.key
                      ? "text-white"
                      : "bg-white/5 text-slate-500 border-white/10 hover:text-slate-300"
                  }`}
                  style={metric === m.key
                    ? { background: activeM.accent + "22", borderColor: activeM.accent + "55", color: activeM.accent }
                    : {}
                  }>
                  {m.label}
                </button>
              ))}
            </div>
          </div>
          {/* Total for selected metric */}
          <div className="text-right">
            <p className="text-[10px] text-slate-600 uppercase tracking-widest font-mono">{metric} total</p>
            <p className={`text-xl font-semibold font-mono ${activeM.textColor}`}>
              {loading ? "…" : activeM.fmtFn(
                metric === "roas" ? avgRoas :
                metric === "ctr"  ? avgCtr  :
                metric === "conversions" ? totalConv :
                metric === "spend"   ? totalSpend : totalRevenue
              )}
            </p>
          </div>
        </div>
        {loading
          ? <div className="h-44 flex items-center justify-center"><RefreshCw className="w-4 h-4 animate-spin text-slate-700" /></div>
          : chartData.length === 0
            ? <div className="h-44 flex items-center justify-center text-slate-600 text-xs">No data</div>
            : <LineChart
                data={chartData}
                dataKey={metric}
                color={activeM.accent}
                fmtAxis={activeM.fmtFn}
                fmtTip={activeM.fmtFn}
              />
        }
      </div>

      {/* ── Campaign Scoreboard ── */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-4">
            <h2 className="text-sm font-medium uppercase tracking-widest text-slate-400">Campaign Scoreboard</h2>
            <div className="flex gap-1 bg-white/5 rounded-lg p-1">
              {["ALL", "ACTIVE", "PAUSED"].map(f => (
                <button key={f} onClick={() => setCampFilter(f)}
                  className={`px-3 py-1 text-[10px] font-medium uppercase tracking-widest rounded transition-colors ${
                    campFilter === f ? "bg-white text-black drop-shadow-sm" : "text-slate-500 hover:text-white"
                  }`}>{f}</button>
              ))}
            </div>
          </div>
          <span className="text-xs text-slate-600">{filteredCamps.length} campaigns · click header to sort</span>
        </div>
        <div className="bg-white/5 border border-white/5 rounded-2xl overflow-hidden overflow-x-auto">
          <table className="w-full text-sm min-w-[820px]">
            <thead>
              <tr className="border-b border-white/5">
                <SortTh col="campaign_name" label="Campaign" />
                <SortTh col="spend"         label="Spend" />
                <SortTh col="revenue"       label="Revenue" />
                <SortTh col="roas"          label="ROAS" />
                <SortTh col="cpa"           label="CPA" />
                <SortTh col="conversions"   label="Conv" />
                <SortTh col="clicks"        label="Clicks" />
                <SortTh col="ctr"           label="CTR" />
                <SortTh col="cvr"           label="CVR" />
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={9} className="text-center py-12 text-slate-500">
                  <RefreshCw className="w-4 h-4 animate-spin mx-auto mb-2 opacity-40" />Loading…
                </td></tr>
              ) : filteredCamps.length === 0 ? (
                <tr><td colSpan={9} className="text-center py-10 text-slate-600 text-xs">
                  No campaign data — run Sync History first
                </td></tr>
              ) : (
                filteredCamps.map((c: any) => {
                  const rg = c.roas >= targetRoas;
                  const chip = rg ? "bg-emerald-500/15 text-emerald-400"
                    : c.roas >= 2 ? "bg-amber-500/15 text-amber-400"
                    : "bg-red-500/15 text-red-400";
                  return (
                    <tr key={c.campaign_id} className="border-b border-white/5 last:border-0 hover:bg-white/5 transition-colors">
                      <td className="px-4 py-3 max-w-[220px]">
                        <div className="flex items-center gap-2">
                          {c.status === "ACTIVE"
                            ? <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_6px_rgba(16,185,129,0.8)] flex-shrink-0" />
                            : <div className="w-1.5 h-1.5 rounded-full bg-slate-600 flex-shrink-0" />
                          }
                          <span className="truncate text-white font-medium text-xs" title={c.campaign_name}>{c.campaign_name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-white font-medium text-xs">{fmtMoney(c.spend)}</td>
                      <td className="px-4 py-3 text-emerald-400 font-medium text-xs">{fmtMoney(c.revenue)}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-semibold font-mono ${chip}`}>{c.roas.toFixed(2)}×</span>
                      </td>
                      <td className="px-4 py-3 text-slate-400 text-xs">{c.cpa ? fmtMoney(c.cpa) : "—"}</td>
                      <td className="px-4 py-3 text-slate-300 text-xs">{fmtNum(c.conversions)}</td>
                      <td className="px-4 py-3 text-slate-400 text-xs">{fmtNum(c.clicks)}</td>
                      <td className="px-4 py-3 text-slate-400 text-xs">{c.ctr}%</td>
                      <td className="px-4 py-3 text-slate-400 text-xs">{c.cvr}%</td>
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
