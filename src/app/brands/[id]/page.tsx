"use client";
import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import axios from "axios";
import {
  ArrowLeft, RefreshCw,
  ShoppingCart, MousePointer, Eye, CreditCard, Package,
  ChevronRight, X, Layers, Image as ImageIcon,
  Film, LayoutGrid, ExternalLink,
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
const CREATIVE_TYPE_LABELS: Record<string, string> = {
  IMAGE: "Image", VIDEO: "Video", CAROUSEL: "Carousel",
  LINK: "Link", STATUS: "Status", OFFER: "Offer",
  EVENT: "Event", NOTE: "Note", PHOTO: "Photo",
};

function CreativeTypeBadge({ type }: { type: string }) {
  const label = CREATIVE_TYPE_LABELS[type?.toUpperCase()] ?? (type || "Ad");
  const isVideo = type?.toUpperCase() === "VIDEO";
  const isCarousel = type?.toUpperCase() === "CAROUSEL";
  const Icon = isVideo ? Film : isCarousel ? LayoutGrid : ImageIcon;
  const color = isVideo ? "bg-violet-500/15 text-violet-400" : isCarousel ? "bg-amber-500/15 text-amber-400" : "bg-indigo-500/15 text-indigo-400";
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium uppercase tracking-wider ${color}`}>
      <Icon className="w-2.5 h-2.5" />
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
            {ad.creative_type && <CreativeTypeBadge type={ad.creative_type} />}
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
            setTimeout(() => load(true), 6000);
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
        {drill.level === "adsets" && (
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-white/10 text-slate-500 flex-shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        )}
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
            <div className="flex items-center justify-between mb-1">
              <p className="text-[10px] text-slate-600 uppercase tracking-widest">{rows.length} ads</p>
              {rows.length > 0 && !rows.some((r: any) => r.ad_title || r.thumbnail_url) && (
                <span className="flex items-center gap-1.5 text-[10px] text-amber-400">
                  <RefreshCw className="w-3 h-3 animate-spin" />
                  Syncing creatives…
                </span>
              )}
            </div>
            {rows.map((r: any) => (
              <AdCard key={r.ad_id} ad={r} targetRoas={targetRoas} />
            ))}
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
  const [range, setRange] = useState<DateRange>(defaultRange());
  const [sortCol, setSortCol] = useState<string>("spend");
  const [sortAsc, setSortAsc] = useState(false);
  const [campFilter, setCampFilter] = useState("ALL");
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
                  <span className="text-xs text-slate-600">{filteredCampaigns.length} campaigns · click row for ad sets</span>
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
                            <td className="px-4 py-3 font-medium text-white max-w-[220px] truncate" title={c.campaign_name}>
                              <div className="flex items-center gap-2">
                                {c.status === "ACTIVE" && (
                                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.8)] flex-shrink-0" title="Active" />
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
