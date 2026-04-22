"use client";
import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import axios from "axios";
import {
  ArrowLeft, RefreshCw,
  ChevronRight, X, Layers, Image as ImageIcon,
  Film, LayoutGrid, ExternalLink, Link2,
} from "lucide-react";
import DateRangePicker, { useDateRange, type DateRange } from "@/components/DateRangePicker";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";
const fmtMoney = (v: number) => "₹" + Math.round(v).toLocaleString("en-IN");
const fmtNum   = (v: number) => Math.round(v).toLocaleString("en-IN");
const fmtShort = (v: number) =>
  v >= 1_00_00_000 ? `₹${(v / 1_00_00_000).toFixed(1)}Cr`
  : v >= 1_00_000  ? `₹${(v / 1_00_000).toFixed(1)}L`
  : v >= 1_000     ? `₹${(v / 1_000).toFixed(0)}k`
  : `₹${Math.round(v)}`;

// ── Bezier path helper ────────────────────────────────────────────────────────
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

// ── Sparkline ─────────────────────────────────────────────────────────────────
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
  const last = pts[pts.length - 1];
  const id = `sp-${color.replace(/[^a-z0-9]/g, "")}${Math.random().toString(36).slice(2, 6)}`;
  return (
    <svg width={W} height={H} className="overflow-visible flex-shrink-0">
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor={color} stopOpacity={0.28} />
          <stop offset="100%" stopColor={color} stopOpacity={0}    />
        </linearGradient>
      </defs>
      <path d={`${path} L ${pts[pts.length-1][0]} ${H} L ${pts[0][0]} ${H} Z`} fill={`url(#${id})`} />
      <path d={path} fill="none" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={last[0]} cy={last[1]} r={2} fill={color} />
    </svg>
  );
}

// ── KPI card with sparkline ───────────────────────────────────────────────────
function KpiCard({ label, value, sub, accentColor, textColor, sparkValues, loading }: {
  label: string; value: string; sub?: string;
  accentColor: string; textColor: string;
  sparkValues: number[]; loading: boolean;
}) {
  return (
    <div className="p-5 bg-white/5 border border-white/5 rounded-2xl relative overflow-hidden">
      <div className="absolute top-0 left-0 right-0 h-[2px]" style={{ background: accentColor }} />
      <p className="text-[10px] font-medium uppercase tracking-widest text-slate-500 mb-2">{label}</p>
      <p className={`text-2xl font-semibold ${textColor}`}>{loading ? "…" : value}</p>
      {sub && <p className="text-[10px] text-slate-600 mt-1">{sub}</p>}
      {!loading && sparkValues.length >= 2 && (
        <div className="flex justify-end mt-2">
          <SparkLine values={sparkValues} color={accentColor} />
        </div>
      )}
    </div>
  );
}

// ── Grouped bar chart ─────────────────────────────────────────────────────────
function BarChart({ data, keys, colors, fmtTip, fmtAxis, keyLabels }: {
  data: Record<string, any>[]; keys: string[]; colors: string[];
  fmtTip: (v: number) => string; fmtAxis: (v: number) => string;
  keyLabels?: string[];
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

  // Tooltip dimensions
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
              const v  = Number(d[k]) || 0;
              const bH = Math.max((v / maxV) * iH, v > 0 ? 1 : 0);
              const x  = groupX + ki * (barW + barGap);
              const y  = PAD_T + iH - bH;
              return <rect key={k} x={x} y={y} width={barW} height={bH} fill={colors[ki]} rx={2} opacity={0.85} />;
            })}
            {/* Invisible hover zone over full slot */}
            <rect
              x={slotX} y={PAD_T} width={slotW} height={iH}
              fill="transparent"
              onMouseEnter={() => setTip({ x: slotX + slotW / 2, y: minBarY, date: String(d.date ?? ""), vals })}
            />
            {(i % Math.max(1, Math.floor(data.length / 10)) === 0 || i === data.length - 1) && (
              <text x={slotX + slotW / 2} y={H - PAD_B + 12} fill="#475569" fontSize={8} textAnchor="middle" fontFamily="monospace">
                {String(d.date ?? "").slice(5)}
              </text>
            )}
          </g>
        );
      })}

      {/* Tooltip */}
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

// ── Smooth line chart ─────────────────────────────────────────────────────────
function LineChart({ data, dataKey, color, fmtAxis, fmtTip, targetLine, h = 160 }: {
  data: Record<string, any>[]; dataKey: string; color: string;
  fmtAxis: (v: number) => string; fmtTip: (v: number) => string; targetLine?: number; h?: number;
}) {
  const [tip, setTip] = useState<{ x: number; y: number; date: string; val: string } | null>(null);
  const W = 400, H = h, PAD_L = 30, PAD_B = 20, PAD_T = 8, PAD_R = 6;
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
            <line x1={PAD_L} x2={W - PAD_R} y1={y} y2={y} stroke="rgba(99,140,255,0.07)" strokeWidth={0.4} />
            <text x={PAD_L - 2} y={y + 2.5} fill="#475569" fontSize={6} textAnchor="end" fontFamily="monospace">{fmtAxis(v)}</text>
          </g>
        );
      })}
      {targetLine != null && (
        <line x1={PAD_L} x2={W - PAD_R} y1={toY(targetLine)} y2={toY(targetLine)}
          stroke="rgba(245,158,11,0.55)" strokeWidth={0.8} strokeDasharray="4 3" />
      )}
      {pts.length > 1 && (
        <path d={`${path} L ${pts[pts.length-1][0]} ${PAD_T + iH} L ${pts[0][0]} ${PAD_T + iH} Z`} fill={`url(#${id})`} />
      )}
      {pts.length > 1 && (
        <path d={path} fill="none" stroke={color} strokeWidth={1.2} strokeLinecap="round" strokeLinejoin="round" />
      )}
      {/* Vertical crosshair on hover */}
      {tip && (
        <line x1={tip.x} x2={tip.x} y1={PAD_T} y2={PAD_T + iH}
          stroke="rgba(255,255,255,0.12)" strokeWidth={0.8} />
      )}
      {pts.map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r={tip?.date === String(data[i]?.date ?? "") ? 3 : 1.5}
          fill={color} style={{ cursor: 'crosshair' }}
          onMouseEnter={() => setTip({ x, y, date: String(data[i]?.date ?? ""), val: fmtTip(Number(data[i]?.[dataKey]) || 0) })}
        />
      ))}
      {/* Invisible wider hit area per point */}
      {pts.map(([x, y], i) => (
        <circle key={`h${i}`} cx={x} cy={y} r={8} fill="transparent"
          onMouseEnter={() => setTip({ x, y, date: String(data[i]?.date ?? ""), val: fmtTip(Number(data[i]?.[dataKey]) || 0) })}
        />
      ))}
      {data.map((d, i) => {
        if (i % Math.max(1, Math.floor(data.length / 10)) !== 0 && i !== data.length - 1) return null;
        return <text key={i} x={toX(i)} y={H - PAD_B + 8} fill="#475569" fontSize={6} textAnchor="middle" fontFamily="monospace">{String(d.date ?? "").slice(5)}</text>;
      })}
      {/* Tooltip */}
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

// ── Conversion Funnel ─────────────────────────────────────────────────────────
function ConversionFunnel({ steps }: {
  steps: { label: string; value: number; convRate?: string }[];
}) {
  const W = 500, H = 160;
  const PAD_L = 8, PAD_R = 8, PAD_TOP = 56, PAD_BOT = 14;
  const CHART_H = H - PAD_TOP - PAD_BOT;
  const CHART_BOT = PAD_TOP + CHART_H;
  const n = steps.length;
  const GAP = 8;
  const BAR_W = (W - PAD_L - PAD_R - (n - 1) * GAP) / n;

  const max = steps[0]?.value || 1;

  const BAR_COLORS = ["#6366f1","#818cf8","#a5b4fc","#c7d2fe","#10b981"];
  const TRAP_COLORS = ["rgba(99,102,241,0.12)","rgba(129,140,248,0.12)","rgba(165,180,252,0.12)","rgba(199,210,254,0.12)"];

  const bars = steps.map((step, i) => {
    const x = PAD_L + i * (BAR_W + GAP);
    const h = Math.max((step.value / max) * CHART_H, step.value > 0 ? 3 : 0);
    const y = CHART_BOT - h;
    return { ...step, x, h, y };
  });

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ display: 'block', height: 'auto' }}>
      {/* Trapezoid fills between bars */}
      {bars.slice(0, -1).map((bar, i) => {
        const next = bars[i + 1];
        const x1 = bar.x + BAR_W, y1 = bar.y;
        const x2 = next.x,        y2 = next.y;
        return (
          <polygon key={i}
            points={`${x1},${y1} ${x2},${y2} ${x2},${CHART_BOT} ${x1},${CHART_BOT}`}
            fill={TRAP_COLORS[i]}
          />
        );
      })}

      {/* Bars */}
      {bars.map((bar, i) => (
        <rect key={i}
          x={bar.x} y={bar.y} width={BAR_W} height={bar.h}
          fill={BAR_COLORS[i]} rx={3} opacity={0.88}
        />
      ))}

      {/* Connector lines: top-right of bar → top-left of next bar */}
      {bars.slice(0, -1).map((bar, i) => {
        const next = bars[i + 1];
        return (
          <line key={i}
            x1={bar.x + BAR_W} y1={bar.y}
            x2={next.x}        y2={next.y}
            stroke="#ffffff" strokeWidth={1.2} opacity={0.25}
          />
        );
      })}

      {/* Labels above each bar */}
      {bars.map((bar, i) => {
        const cx = bar.x + BAR_W / 2;
        const pct = ((bar.value / max) * 100).toFixed(1);
        return (
          <g key={i}>
            {/* Step name */}
            <text x={cx} y={PAD_TOP - 42} fill="#64748b" fontSize={7} textAnchor="middle" fontFamily="sans-serif" fontWeight="500">
              {bar.label.toUpperCase()}
            </text>
            {/* % of total */}
            <text x={cx} y={PAD_TOP - 29} fill="#94a3b8" fontSize={8} textAnchor="middle" fontFamily="monospace" fontWeight="600">
              {pct}%
            </text>
            {/* Count */}
            <text x={cx} y={PAD_TOP - 16} fill="#f1f5f9" fontSize={9.5} textAnchor="middle" fontFamily="monospace" fontWeight="700">
              {fmtNum(bar.value)}
            </text>
            {/* Conv rate */}
            {bar.convRate && (
              <text x={cx} y={PAD_TOP - 4} fill="#10b981" fontSize={7} textAnchor="middle" fontFamily="monospace">
                ↗ {bar.convRate}%
              </text>
            )}
          </g>
        );
      })}

      {/* X-axis baseline */}
      <line x1={PAD_L} x2={W - PAD_R} y1={CHART_BOT} y2={CHART_BOT} stroke="rgba(255,255,255,0.06)" strokeWidth={1} />
    </svg>
  );
}

// ── Adset metric row (table) ──────────────────────────────────────────────────
function AdsetRow({ name, spend, revenue, roas, conversions, clicks, impressions, ctr, cpa, atc, targetRoas, onClick }: any) {
  const roasOk = roas >= targetRoas;
  return (
    <tr onClick={onClick} className="border-b border-white/5 last:border-0 cursor-pointer transition-colors hover:bg-indigo-500/10">
      <td className="px-4 py-3 font-medium text-white max-w-[200px]">
        <div className="flex items-center gap-2">
          <span className="truncate text-sm" title={name}>{name}</span>
          <ChevronRight className="w-3 h-3 text-slate-600 flex-shrink-0" />
        </div>
      </td>
      <td className="px-4 py-3 text-sm font-medium text-white">{fmtMoney(spend)}</td>
      <td className="px-4 py-3 text-sm font-medium text-emerald-400">{fmtMoney(revenue)}</td>
      <td className={`px-4 py-3 text-sm font-medium ${roasOk ? "text-emerald-400" : "text-amber-400"}`}>{roas.toFixed(2)}x</td>
      <td className="px-4 py-3 text-sm text-slate-300">{fmtNum(conversions)}</td>
      <td className="px-4 py-3 text-sm text-slate-300">{fmtNum(atc)}</td>
      <td className="px-4 py-3 text-sm text-slate-400">{fmtNum(clicks)}</td>
      <td className="px-4 py-3 text-sm text-slate-400">{fmtNum(impressions)}</td>
      <td className="px-4 py-3 text-sm text-slate-400">{ctr}%</td>
      <td className="px-4 py-3 text-sm text-slate-400">{cpa ? fmtMoney(cpa) : "—"}</td>
    </tr>
  );
}

// ── Creative type icon + badge ────────────────────────────────────────────────
const CREATIVE_TYPE_CONFIG: Record<string, { label: string; icon: any; color: string }> = {
  IMAGE:    { label: "Image",    icon: ImageIcon,  color: "bg-indigo-500/15 text-indigo-400" },
  PHOTO:    { label: "Photo",    icon: ImageIcon,  color: "bg-indigo-500/15 text-indigo-400" },
  VIDEO:    { label: "Video",    icon: Film,       color: "bg-violet-500/15 text-violet-400" },
  CAROUSEL: { label: "Carousel", icon: LayoutGrid, color: "bg-amber-500/15 text-amber-400" },
  // SHARE = boosted link-preview post (URL share with OG image + headline)
  SHARE:    { label: "Share",    icon: Link2,      color: "bg-sky-500/15 text-sky-400" },
  LINK:     { label: "Link",     icon: Link2,      color: "bg-sky-500/15 text-sky-400" },
  STATUS:   { label: "Status",   icon: ImageIcon,  color: "bg-slate-500/15 text-slate-400" },
  OFFER:    { label: "Offer",    icon: ImageIcon,  color: "bg-emerald-500/15 text-emerald-400" },
  EVENT:    { label: "Event",    icon: ImageIcon,  color: "bg-rose-500/15 text-rose-400" },
};

function CreativeTypeBadge({ type }: { type: string }) {
  const key = type?.toUpperCase() ?? "";
  const cfg = CREATIVE_TYPE_CONFIG[key] ?? { label: type || "Ad", icon: ImageIcon, color: "bg-indigo-500/15 text-indigo-400" };
  const Icon = cfg.icon;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium uppercase tracking-wider ${cfg.color}`}>
      <Icon className="w-2.5 h-2.5" />
      {cfg.label}
    </span>
  );
}

// ── Ad status badge ───────────────────────────────────────────────────────────
function AdStatusBadge({ status }: { status: string }) {
  const s = (status || "UNKNOWN").toUpperCase();
  const isLive    = s === "ACTIVE";
  const isPaused  = s === "PAUSED" || s === "CAMPAIGN_PAUSED" || s === "ADSET_PAUSED";
  const color = isLive
    ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/20"
    : isPaused
    ? "bg-amber-500/15 text-amber-400 border-amber-500/20"
    : "bg-white/5 text-slate-500 border-white/10";
  const label = isLive ? "● Live" : isPaused ? "⏸ Paused" : s.toLowerCase().replace(/_/g, " ");
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-medium border ${color}`}>
      {label}
    </span>
  );
}

// ── Ad creative card ──────────────────────────────────────────────────────────
function AdCard({ ad, targetRoas }: { ad: any; targetRoas: number }) {
  const roasOk = ad.roas >= targetRoas;
  const hasThumbnail = !!ad.thumbnail_url;

  return (
    <div className="border border-white/5 rounded-xl overflow-hidden bg-white/[0.02] hover:bg-white/[0.04] transition-colors">
      {/* Creative preview + info */}
      <div className="flex gap-3 p-4">
        {/* Thumbnail */}
        <div className="w-20 h-20 rounded-lg overflow-hidden bg-white/5 flex-shrink-0 flex items-center justify-center">
          {hasThumbnail ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={ad.thumbnail_url} alt={ad.ad_name} className="w-full h-full object-cover" />
          ) : (
            <ImageIcon className="w-6 h-6 text-slate-700" />
          )}
        </div>

        {/* Text details */}
        <div className="flex-1 min-w-0 space-y-1.5">
          <div className="flex items-start justify-between gap-2">
            <p className="text-xs font-medium text-slate-400 truncate" title={ad.ad_name}>{ad.ad_name}</p>
            <div className="flex items-center gap-1.5 flex-shrink-0">
              {ad.ad_status && ad.ad_status !== "UNKNOWN" && <AdStatusBadge status={ad.ad_status} />}
              {ad.creative_type && <CreativeTypeBadge type={ad.creative_type} />}
            </div>
          </div>
          {ad.ad_title && (
            <p className="text-sm font-medium text-white leading-snug line-clamp-2" title={ad.ad_title}>
              {ad.ad_title}
            </p>
          )}
          {ad.ad_body && (
            <p className="text-xs text-slate-500 leading-relaxed line-clamp-3" title={ad.ad_body}>
              {ad.ad_body}
            </p>
          )}
          <div className="flex items-center gap-2 flex-wrap pt-0.5">
            {ad.call_to_action && (
              <span className="px-2 py-0.5 bg-white/5 border border-white/10 rounded text-[10px] font-medium text-slate-400 uppercase tracking-wider">
                {ad.call_to_action.replace(/_/g, " ")}
              </span>
            )}
            {ad.destination_url && (
              <a
                href={ad.destination_url}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="inline-flex items-center gap-1 text-[10px] text-indigo-400 hover:text-indigo-300 truncate max-w-[160px]"
                title={ad.destination_url}
              >
                <ExternalLink className="w-2.5 h-2.5 flex-shrink-0" />
                <span className="truncate">{new URL(ad.destination_url).hostname}</span>
              </a>
            )}
          </div>
        </div>
      </div>

      {/* Metrics strip */}
      <div className="grid grid-cols-4 border-t border-white/5">
        {[
          { label: "Spend",   value: fmtMoney(ad.spend),   color: "text-white" },
          { label: "Revenue", value: fmtMoney(ad.revenue), color: "text-emerald-400" },
          { label: "ROAS",    value: `${ad.roas.toFixed(2)}×`, color: roasOk ? "text-emerald-400" : "text-amber-400" },
          { label: "Conv",    value: fmtNum(ad.conversions), color: "text-indigo-400" },
        ].map(({ label, value, color }) => (
          <div key={label} className="px-3 py-2 text-center border-r border-white/5 last:border-0">
            <p className={`text-xs font-medium ${color}`}>{value}</p>
            <p className="text-[9px] text-slate-600 uppercase tracking-wider mt-0.5">{label}</p>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-4 border-t border-white/5">
        {[
          { label: "Clicks",  value: fmtNum(ad.clicks) },
          { label: "Impr",    value: fmtNum(ad.impressions) },
          { label: "CTR",     value: `${ad.ctr}%` },
          { label: "CPA",     value: ad.cpa ? fmtMoney(ad.cpa) : "—" },
        ].map(({ label, value }) => (
          <div key={label} className="px-3 py-2 text-center border-r border-white/5 last:border-0">
            <p className="text-xs font-medium text-slate-400">{value}</p>
            <p className="text-[9px] text-slate-600 uppercase tracking-wider mt-0.5">{label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Drill-down panel ──────────────────────────────────────────────────────────
type DrillLevel = "adsets" | "ads";

interface DrillState {
  level: DrillLevel;
  campaignId: string;
  campaignName: string;
  adsetId?: string;
  adsetName?: string;
}

function DrillPanel({
  drill, range, brandId, targetRoas, onClose,
}: {
  drill: DrillState;
  range: DateRange;
  brandId: string;
  targetRoas: number;
  onClose: () => void;
}) {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [noData, setNoData] = useState(false);
  const [innerDrill, setInnerDrill] = useState<DrillState | null>(null);
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [typeFilter, setTypeFilter] = useState("ALL");

  const load = useCallback((quiet = false) => {
    if (!quiet) setLoading(true);
    const url =
      drill.level === "adsets"
        ? `${API}/brands/${brandId}/campaigns/${drill.campaignId}/adsets?date_from=${range.from}&date_to=${range.to}`
        : `${API}/brands/${brandId}/adsets/${drill.adsetId}/ads?date_from=${range.from}&date_to=${range.to}`;
    axios.get(url)
      .then((r) => {
        const data = r.data || [];
        setRows(data);
        setNoData(data.length === 0);
        // If ads came back but all lack creative fields, backend is re-syncing — poll again
        if (drill.level === "ads" && data.length > 0) {
          const hasCreatives = data.some((d: any) => d.ad_title || d.thumbnail_url);
          if (!hasCreatives) {
            setTimeout(() => load(true), 3000);
          }
        }
      })
      .catch(() => { setRows([]); setNoData(true); })
      .finally(() => setLoading(false));
  }, [drill, range, brandId]);

  const triggerSync = () => {
    setSyncing(true);
    const url =
      drill.level === "adsets"
        ? `${API}/brands/${brandId}/campaigns/${drill.campaignId}/adsets/sync?date_from=${range.from}&date_to=${range.to}`
        : `${API}/brands/${brandId}/adsets/${drill.adsetId}/ads/sync?date_from=${range.from}&date_to=${range.to}`;
    axios.post(url)
      .then(() => {
        // Poll every 4s up to 5 times for data to appear
        let attempts = 0;
        const poll = setInterval(() => {
          attempts++;
          load(true);
          if (attempts >= 5) { clearInterval(poll); setSyncing(false); }
        }, 4000);
      })
      .catch(() => setSyncing(false));
  };

  useEffect(() => {
    setRows([]);
    setNoData(false);
    setInnerDrill(null);
    setStatusFilter("ALL");
    setTypeFilter("ALL");
    load();
  }, [load]);

  const title = drill.level === "adsets" ? drill.campaignName : drill.adsetName ?? "";
  const subtitle = drill.level === "adsets" ? "Ad Sets" : "Ads";
  const Icon = drill.level === "adsets" ? Layers : ImageIcon;

  // If user drills into an ad set, render nested panel on top
  if (innerDrill) {
    return (
      <DrillPanel
        drill={innerDrill}
        range={range}
        brandId={brandId}
        targetRoas={targetRoas}
        onClose={() => setInnerDrill(null)}
      />
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-white/5">
        <div className="flex items-center gap-3 min-w-0">
          {drill.level === "ads" && (
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-white/10 text-slate-400 flex-shrink-0"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
            </button>
          )}
          <div className={`w-7 h-7 rounded-lg bg-indigo-500/20 flex items-center justify-center flex-shrink-0`}>
            <Icon className="w-3.5 h-3.5 text-indigo-400" />
          </div>
          <div className="min-w-0">
            <p className="text-white text-sm font-medium truncate">{title}</p>
            <p className="text-[10px] text-slate-500 uppercase tracking-widest">{subtitle}</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <button
            onClick={triggerSync}
            disabled={syncing || loading}
            title="Refresh from Meta"
            className="p-1.5 rounded-lg hover:bg-white/10 disabled:opacity-40 text-slate-400 transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${syncing ? "animate-spin text-indigo-400" : ""}`} />
          </button>
          {drill.level === "adsets" && (
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-white/10 text-slate-500"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto">
        {loading ? (
          <div className="py-16 flex flex-col items-center gap-3 text-slate-500">
            <RefreshCw className="w-5 h-5 animate-spin opacity-40" />
            <span className="text-xs">Loading {subtitle.toLowerCase()}…</span>
          </div>
        ) : noData ? (
          <div className="py-16 flex flex-col items-center gap-4 text-slate-500">
            <p className="text-xs text-slate-600">No data synced for this period</p>
            <button
              onClick={triggerSync}
              disabled={syncing}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-medium rounded-xl transition-colors"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${syncing ? "animate-spin" : ""}`} />
              {syncing ? "Syncing from Meta…" : "Sync from Meta"}
            </button>
            {syncing && <p className="text-[10px] text-slate-600">Pulling from Meta API, checking every 4s…</p>}
          </div>
        ) : drill.level === "adsets" ? (
          // ── Ad sets: compact table ──
          <table className="w-full text-sm min-w-[700px]">
            <thead>
              <tr className="border-b border-white/5 sticky top-0 bg-[#0f1117]">
                <th className="text-left px-4 py-3 text-[10px] font-medium uppercase tracking-widest text-slate-500">Ad Set</th>
                <th className="text-left px-4 py-3 text-[10px] font-medium uppercase tracking-widest text-slate-500">Spend</th>
                <th className="text-left px-4 py-3 text-[10px] font-medium uppercase tracking-widest text-slate-500">Revenue</th>
                <th className="text-left px-4 py-3 text-[10px] font-medium uppercase tracking-widest text-slate-500">ROAS</th>
                <th className="text-left px-4 py-3 text-[10px] font-medium uppercase tracking-widest text-slate-500">Conv</th>
                <th className="text-left px-4 py-3 text-[10px] font-medium uppercase tracking-widest text-slate-500">ATC</th>
                <th className="text-left px-4 py-3 text-[10px] font-medium uppercase tracking-widest text-slate-500">Clicks</th>
                <th className="text-left px-4 py-3 text-[10px] font-medium uppercase tracking-widest text-slate-500">Impr</th>
                <th className="text-left px-4 py-3 text-[10px] font-medium uppercase tracking-widest text-slate-500">CTR</th>
                <th className="text-left px-4 py-3 text-[10px] font-medium uppercase tracking-widest text-slate-500">CPA</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r: any) => (
                <AdsetRow
                  key={r.adset_id}
                  name={r.adset_name}
                  spend={r.spend} revenue={r.revenue} roas={r.roas}
                  conversions={r.conversions} clicks={r.clicks}
                  impressions={r.impressions} ctr={r.ctr} cpa={r.cpa} atc={r.atc}
                  targetRoas={targetRoas}
                  onClick={() => setInnerDrill({
                    level: "ads",
                    campaignId: drill.campaignId,
                    campaignName: drill.campaignName,
                    adsetId: r.adset_id,
                    adsetName: r.adset_name,
                  })}
                />
              ))}
            </tbody>
          </table>
        ) : (
          // ── Ads: creative cards ──
          <div className="p-4 space-y-3">
            {/* Filter bar */}
            <div className="space-y-2">
              {/* Status filter */}
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[9px] font-medium uppercase tracking-widest text-slate-600 w-10">Status</span>
                {[
                  { key: "ALL",    label: "All" },
                  { key: "ACTIVE", label: "● Live" },
                  { key: "PAUSED", label: "Paused" },
                ].map(({ key, label }) => (
                  <button
                    key={key}
                    onClick={() => setStatusFilter(key)}
                    className={`px-2.5 py-1 rounded-lg text-[10px] font-medium transition-colors ${
                      statusFilter === key
                        ? key === "ACTIVE"
                          ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                          : "bg-indigo-500/20 text-indigo-400 border border-indigo-500/30"
                        : "bg-white/5 text-slate-500 border border-white/10 hover:text-slate-300"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
              {/* Type filter */}
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[9px] font-medium uppercase tracking-widest text-slate-600 w-10">Type</span>
                {[
                  { key: "ALL",      label: "All" },
                  { key: "IMAGE",    label: "Image" },
                  { key: "VIDEO",    label: "Video" },
                  { key: "CAROUSEL", label: "Carousel" },
                  { key: "SHARE",    label: "Share" },
                ].map(({ key, label }) => (
                  <button
                    key={key}
                    onClick={() => setTypeFilter(key)}
                    className={`px-2.5 py-1 rounded-lg text-[10px] font-medium transition-colors ${
                      typeFilter === key
                        ? "bg-indigo-500/20 text-indigo-400 border border-indigo-500/30"
                        : "bg-white/5 text-slate-500 border border-white/10 hover:text-slate-300"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Count + syncing indicator */}
            {(() => {
              const filtered = rows.filter((r: any) => {
                const st = (r.ad_status || "").toUpperCase();
                const statusOk =
                  statusFilter === "ALL" ||
                  (statusFilter === "ACTIVE" && st === "ACTIVE") ||
                  (statusFilter === "PAUSED" && (st === "PAUSED" || st === "CAMPAIGN_PAUSED" || st === "ADSET_PAUSED"));
                const ct = (r.creative_type || "").toUpperCase();
                const typeOk =
                  typeFilter === "ALL" ||
                  ct === typeFilter ||
                  // IMAGE filter also matches PHOTO
                  (typeFilter === "IMAGE" && ct === "PHOTO") ||
                  // SHARE filter also matches LINK (same structure)
                  (typeFilter === "SHARE" && ct === "LINK");
                return statusOk && typeOk;
              });
              const syncing = rows.length > 0 && !rows.some((r: any) => r.ad_title || r.thumbnail_url);
              return (
                <>
                  <div className="flex items-center justify-between">
                    <p className="text-[10px] text-slate-600 uppercase tracking-widest">
                      {filtered.length} of {rows.length} ads
                    </p>
                    {syncing && (
                      <span className="flex items-center gap-1.5 text-[10px] text-amber-400">
                        <RefreshCw className="w-3 h-3 animate-spin" />
                        Syncing creatives…
                      </span>
                    )}
                  </div>
                  {filtered.length === 0 && rows.length > 0 && (
                    <p className="text-[11px] text-slate-600 text-center py-6">No ads match the selected filters</p>
                  )}
                  {filtered.map((r: any) => (
                    <AdCard key={r.ad_id} ad={r} targetRoas={targetRoas} />
                  ))}
                </>
              );
            })()}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function BrandDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useDateRange();
  const [sortCol, setSortCol] = useState<string>("spend");
  const [sortAsc, setSortAsc] = useState(false);
  const [campFilter, setCampFilter] = useState("LIVE");
  const [createdInRange, setCreatedInRange] = useState(false);
  const [drill, setDrill] = useState<DrillState | null>(null);

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

  const mid        = Math.floor(daily.length / 2);
  const roasFirst  = mid > 0 ? daily.slice(0, mid).reduce((s: number, r: any) => s + r.roas, 0) / mid : 0;
  const roasSecond = daily.length - mid > 0 ? daily.slice(mid).reduce((s: number, r: any) => s + r.roas, 0) / (daily.length - mid) : 0;
  const roasTrend  = roasFirst > 0 ? ((roasSecond - roasFirst) / roasFirst) * 100 : 0;

  const targetRoas = brand?.target_roas ?? 3;
  const roasOk     = summary.roas >= targetRoas;
  const campaigns  = data?.campaigns ?? [];

  const toggleSort = (col: string) => {
    if (sortCol === col) setSortAsc(a => !a);
    else { setSortCol(col); setSortAsc(false); }
  };

  const liveCampaigns = campaigns.filter((c: any) => c.status === "ACTIVE");
  const baseCampaigns = campFilter === "LIVE" ? liveCampaigns : campaigns;
  const filteredCampaigns = createdInRange
    ? baseCampaigns.filter((c: any) => {
        if (!c.created_at) return false;
        const d = c.created_at.slice(0, 10);
        return d >= range.from && d <= range.to;
      })
    : baseCampaigns;

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

  const ctrPct      = summary.impressions > 0 ? ((summary.clicks    / summary.impressions) * 100).toFixed(1) : "0.0";
  const atcPct      = summary.clicks      > 0 ? ((summary.atc       / summary.clicks)      * 100).toFixed(1) : "0.0";
  const checkoutPct = summary.atc         > 0 ? ((summary.checkout  / summary.atc)         * 100).toFixed(1) : "0.0";
  const purchasePct = summary.checkout    > 0 ? ((summary.purchases / summary.checkout)    * 100).toFixed(1) : "0.0";

  return (
    <div className={`flex gap-0 transition-all duration-300 ${drill ? "pr-0" : ""}`}>
      {/* ── Main content ── */}
      <div className={`flex-1 min-w-0 space-y-8 transition-all duration-300 ${drill ? "mr-[480px]" : ""}`}>
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
            {/* KPIs */}
            <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
              <KpiCard label="Revenue"   loading={loading}
                value={fmtMoney(summary.revenue ?? 0)}
                sub={range.label}
                accentColor="#22c55e" textColor="text-emerald-400"
                sparkValues={daily.map((r: any) => r.revenue)} />
              <KpiCard label="ROAS"      loading={loading}
                value={`${(summary.roas ?? 0).toFixed(2)}×`}
                sub={`Target ${targetRoas}× · ${roasTrend >= 0 ? "↑" : "↓"} ${Math.abs(roasTrend).toFixed(1)}% trend`}
                accentColor={roasOk ? "#14b8a6" : "#f59e0b"}
                textColor={roasOk ? "text-teal-400" : "text-amber-400"}
                sparkValues={daily.map((r: any) => r.roas)} />
              <KpiCard label="Spend"     loading={loading}
                value={fmtMoney(summary.spend ?? 0)}
                sub={range.label}
                accentColor="#3b82f6" textColor="text-white"
                sparkValues={daily.map((r: any) => r.spend)} />
              <KpiCard label="Purchases" loading={loading}
                value={fmtNum(summary.purchases ?? 0)}
                sub={(summary.purchases ?? 0) > 0 ? `CPA ${fmtMoney((summary.spend ?? 0) / summary.purchases)}` : "CPA —"}
                accentColor="#a855f7" textColor="text-purple-400"
                sparkValues={daily.map((r: any) => r.conversions)} />
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

            {/* Funnel + Spend vs Revenue — same row */}
            <div className="grid grid-cols-2 gap-5">
              <div className="p-6 bg-white/5 border border-white/5 rounded-2xl">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-sm font-medium uppercase tracking-widest text-slate-400">Conversion Funnel</h2>
                  <span className="text-[10px] text-slate-600 uppercase tracking-widest">{range.label}</span>
                </div>
                <ConversionFunnel steps={[
                  { label: "Impressions", value: summary.impressions ?? 0 },
                  { label: "Clicks",      value: summary.clicks ?? 0,     convRate: ctrPct },
                  { label: "Add to Cart", value: summary.atc ?? 0,        convRate: atcPct },
                  { label: "Checkout",    value: summary.checkout ?? 0,   convRate: checkoutPct },
                  { label: "Purchases",   value: summary.purchases ?? 0,  convRate: purchasePct },
                ]} />
              </div>

              <div className="p-6 bg-white/5 border border-white/5 rounded-2xl">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-sm font-medium uppercase tracking-widest text-slate-400">Spend vs Revenue</h2>
                  <span className="text-[10px] text-slate-600 font-mono">{daily.length}-day</span>
                </div>
                {daily.length === 0
                  ? <div className="h-36 flex items-center justify-center text-slate-600 text-xs">No data</div>
                  : <BarChart
                      data={daily}
                      keys={["spend", "revenue"]}
                      keyLabels={["Spend", "Revenue"]}
                      colors={["rgba(59,130,246,0.75)", "rgba(34,197,94,0.75)"]}
                      fmtTip={fmtMoney}
                      fmtAxis={fmtShort}
                    />
                }
                <div className="flex gap-5 mt-2 text-[10px] font-medium uppercase text-slate-500">
                  <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-sm bg-blue-500/75 inline-block" />Spend</span>
                  <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-sm bg-emerald-500/75 inline-block" />Revenue</span>
                </div>
              </div>
            </div>

            {/* ROAS Trend — constrained width, centered */}
            <div className="p-6 bg-white/5 border border-white/5 rounded-2xl max-w-[65%] mx-auto w-full">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-medium uppercase tracking-widest text-slate-400">ROAS Trend</h2>
                <span className="text-[10px] text-slate-600 font-mono">Target {targetRoas}×</span>
              </div>
              {daily.length === 0
                ? <div className="h-36 flex items-center justify-center text-slate-600 text-xs">No data</div>
                : <LineChart
                    data={daily}
                    dataKey="roas"
                    color={roasOk ? "#14b8a6" : "#f59e0b"}
                    fmtAxis={v => v.toFixed(1) + "×"}
                    fmtTip={v => v.toFixed(2) + "×"}
                    targetLine={targetRoas}
                    h={100}
                  />
              }
            </div>

            {/* Campaign Performance Table */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-4">
                  <h2 className="text-sm font-medium uppercase tracking-widest text-slate-400">Campaign Performance</h2>
                  {campaigns.length > 0 && (
                    <div className="flex space-x-1 bg-white/5 rounded-lg p-1">
                      {[
                        { key: "LIVE", label: "Live", count: liveCampaigns.length },
                        { key: "ALL",  label: "All",  count: campaigns.length },
                      ].map(({ key, label, count }) => (
                        <button
                          key={key}
                          onClick={() => setCampFilter(key)}
                          className={`flex items-center gap-1.5 px-3 py-1 text-[10px] font-medium uppercase tracking-widest rounded transition-colors ${
                            campFilter === key ? "bg-white text-black drop-shadow-sm" : "text-slate-500 hover:text-white"
                          }`}
                        >
                          {key === "LIVE" && campFilter === "LIVE" && (
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                          )}
                          {label}
                          <span className={`px-1.5 py-0.5 rounded text-[9px] font-semibold ${
                            campFilter === key ? "bg-black/10 text-black/60" : "bg-white/10 text-slate-400"
                          }`}>
                            {count}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                  {campaigns.length > 0 && (
                    <button
                      onClick={() => setCreatedInRange(v => !v)}
                      className={`flex items-center gap-1.5 px-3 py-1 rounded-lg border text-[10px] font-medium transition-colors ${
                        createdInRange
                          ? "bg-indigo-500/20 border-indigo-500/40 text-indigo-300"
                          : "bg-white/5 border-white/10 text-slate-500 hover:text-slate-300"
                      }`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full ${createdInRange ? "bg-indigo-400" : "bg-slate-600"}`} />
                      Created in range
                    </button>
                  )}
                </div>
                <span className="text-xs text-slate-600">
                  {campaigns.length > 0
                    ? `${filteredCampaigns.length} of ${campaigns.length} campaigns · click row for ad sets`
                    : `${range.from} → ${range.to}`}
                </span>
              </div>
              {campaigns.length === 0 ? (
                <div className="bg-white/5 border border-white/5 rounded-2xl px-6 py-12 flex flex-col items-center gap-3 text-center">
                  <p className="text-sm text-slate-400 font-medium">No campaign data for this period</p>
                  <p className="text-xs text-slate-600 max-w-sm">
                    Campaign metrics for <span className="font-mono text-slate-500">{range.from} → {range.to}</span> haven&apos;t been synced yet. Try a different date range or refresh from Meta.
                  </p>
                  <button
                    onClick={() => fetch(range)}
                    className="mt-2 flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium rounded-xl transition-colors"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    Retry
                  </button>
                </div>
              ) : (
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
                        <th className="text-left px-4 py-3 text-[10px] font-medium uppercase tracking-widest text-slate-500 whitespace-nowrap">Created</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sortedCampaigns.map((c: any) => {
                        const isRoasOk = c.roas >= targetRoas;
                        const isSelected = drill?.campaignId === c.campaign_id;
                        return (
                          <tr
                            key={c.campaign_id}
                            onClick={() => {
                              if (isSelected) {
                                setDrill(null);
                              } else {
                                setDrill({
                                  level: "adsets",
                                  campaignId: c.campaign_id,
                                  campaignName: c.campaign_name,
                                });
                              }
                            }}
                            className={`border-b border-white/5 last:border-0 cursor-pointer transition-colors ${
                              isSelected
                                ? "bg-indigo-500/15 border-l-2 border-l-indigo-500"
                                : "hover:bg-white/5"
                            }`}
                          >
                            <td className="px-4 py-3 font-medium text-white max-w-[260px]" title={c.campaign_name}>
                              <div className="flex items-center gap-2">
                                {c.status === "ACTIVE" ? (
                                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.8)] flex-shrink-0" title="Active" />
                                ) : (
                                  <span className={`flex-shrink-0 px-1.5 py-0.5 rounded text-[9px] font-semibold uppercase ${
                                    c.status === "PAUSED" || c.status === "CAMPAIGN_PAUSED"
                                      ? "bg-amber-500/15 text-amber-400"
                                      : "bg-slate-500/15 text-slate-500"
                                  }`}>
                                    {c.status === "CAMPAIGN_PAUSED" ? "PAUSED" : (c.status || "UNKNOWN")}
                                  </span>
                                )}
                                <span className="truncate">{c.campaign_name}</span>
                                <ChevronRight className={`w-3 h-3 flex-shrink-0 transition-transform ${isSelected ? "text-indigo-400 rotate-90" : "text-slate-700"}`} />
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
                            <td className="px-4 py-3 text-slate-500 text-[11px] whitespace-nowrap">
                              {c.created_at ? new Date(c.created_at).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "—"}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

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

      {/* ── Drill-down sidebar ── */}
      {drill && (
        <div className="fixed right-0 top-0 h-full w-[480px] bg-[#0f1117] border-l border-white/10 z-40 flex flex-col shadow-2xl">
          <DrillPanel
            drill={drill}
            range={range}
            brandId={id}
            targetRoas={targetRoas}
            onClose={() => setDrill(null)}
          />
        </div>
      )}
    </div>
  );
}
