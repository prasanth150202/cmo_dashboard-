"use client";
import { useEffect, useState, useCallback, useRef } from "react";
import axios from "axios";
import {
  RefreshCw, Star, Minus, XCircle, ChevronDown,
  TrendingUp, TrendingDown, BarChart2,
  Image as ImageIcon, Video, Layers, Link2, Zap, Activity, CloudDownload,
} from "lucide-react";
import DateRangePicker, { useDateRange } from "@/components/DateRangePicker";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

const fmtShort = (v: number) =>
  v >= 1_00_00_000 ? `₹${(v / 1_00_00_000).toFixed(1)}Cr`
  : v >= 1_00_000  ? `₹${(v / 1_00_000).toFixed(1)}L`
  : v >= 1_000     ? `₹${(v / 1_000).toFixed(0)}K`
  : `₹${Math.round(v)}`;

const fmtNum  = (v: number) => Math.round(v).toLocaleString("en-IN");
const fmtDate = (d: string) => d ? new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short" }) : "";


// ── Types ─────────────────────────────────────────────────────────────────────

type Metrics = {
  spend: number; revenue: number; roas: number;
  ctr: number; cpm: number; hook_rate: number;
  conversions: number; impressions: number;
  clicks: number; atc: number; checkout: number;
};

type Creative = {
  ad_id: string; ad_name: string; ad_status: string;
  adset_id: string;
  campaign_id: string; campaign_name: string; campaign_status: string;
  is_active: boolean; active_priority: boolean;
  creative_type: string;
  thumbnail_url: string; image_url: string;
  ad_title: string; ad_body: string;
  first_seen_date: string;
  is_new_in_range: boolean;
  metrics: Metrics;
  performance_score: number; ai_score: number;
  score_gap: number; category: "GOOD" | "AVERAGE" | "BAD";
  score_breakdown: Record<string, number>;
  ai_reasoning: string; rank: number;
};

type Summary = {
  total: number; good_count: number; average_count: number; bad_count: number;
  active_count: number; inactive_count: number;
  active_avg_score: number; inactive_avg_score: number; score_diff: number;
};

type AnalysisData = {
  creatives: Creative[]; summary: Summary;
  date_from: string; date_to: string;
  synced_from_meta?: boolean;
  missing_thumbnails_count?: number;
};

type Brand      = { id: string; name: string; color: string };
type FilterKey  = "ALL" | "GOOD" | "AVERAGE" | "BAD" | "ACTIVE" | "INACTIVE";
type SortKey    = "score" | "roas" | "spend" | "ctr" | "date";


// ── Helpers ───────────────────────────────────────────────────────────────────

function CreativeTypeIcon({ type }: { type: string }) {
  const t = (type || "").toUpperCase();
  if (t === "VIDEO")    return <Video   className="w-5 h-5 text-violet-400" />;
  if (t === "CAROUSEL") return <Layers  className="w-5 h-5 text-blue-400" />;
  if (t === "LINK")     return <Link2   className="w-5 h-5 text-cyan-400" />;
  return <ImageIcon className="w-5 h-5 text-slate-500" />;
}

function CategoryBadge({ cat }: { cat: string }) {
  if (cat === "GOOD")
    return <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/20"><Star className="w-3 h-3" />Good</span>;
  if (cat === "BAD")
    return <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-0.5 rounded-full bg-red-500/15 text-red-400 border border-red-500/20"><XCircle className="w-3 h-3" />Bad</span>;
  return <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-0.5 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/20"><Minus className="w-3 h-3" />Average</span>;
}

function StatusPill({ active, priority }: { active: boolean; priority: boolean }) {
  if (priority)
    return <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-indigo-500/15 text-indigo-400 border border-indigo-500/20"><Zap className="w-3 h-3" />Active ★</span>;
  if (active)
    return <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"><Activity className="w-3 h-3" />Active</span>;
  return <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-slate-500/10 text-slate-500 border border-slate-700">Inactive</span>;
}

function ScoreBar({ label, score, color }: { label: string; score: number; color: string }) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-xs text-slate-500 w-28 shrink-0">{label}</span>
      <div className="flex-1 h-1.5 bg-white/5 rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all duration-700 ${color}`} style={{ width: `${Math.min(score, 100)}%` }} />
      </div>
      <span className={`text-sm font-semibold tabular-nums w-8 text-right ${color.replace("bg-", "text-")}`}>{Math.round(score)}</span>
    </div>
  );
}

const TYPE_BG: Record<string, string> = {
  VIDEO:    "bg-violet-950",
  CAROUSEL: "bg-blue-950",
  LINK:     "bg-cyan-950",
  IMAGE:    "bg-slate-800",
};

function Thumbnail({ url, type, name }: { url: string; type: string; name: string }) {
  const [err, setErr] = useState(false);
  if (url && !err)
    return <img src={url} alt="" onError={() => setErr(true)} className="w-full h-full object-cover" />;

  const bg = TYPE_BG[(type || "").toUpperCase()] ?? "bg-slate-800";
  const initial = (name || type || "?")[0].toUpperCase();
  return (
    <div className={`w-full h-full flex flex-col items-center justify-center gap-1.5 ${bg}`}>
      <CreativeTypeIcon type={type} />
      <span className="text-[10px] text-slate-500 font-medium">{(type || "AD").toUpperCase()}</span>
      <span className="text-xs font-bold text-slate-400 w-10 h-10 rounded-xl bg-black/30 flex items-center justify-center">
        {initial}
      </span>
    </div>
  );
}

function GapTag({ gap, perf, ai }: { gap: number; perf: number; ai: number }) {
  if (gap < 5) return <span className="text-[10px] text-emerald-600 font-medium">Aligned ✓</span>;
  if (perf > ai) return <span className="text-[10px] text-amber-500 font-medium">P +{gap.toFixed(0)}</span>;
  return <span className="text-[10px] text-violet-400 font-medium">AI +{gap.toFixed(0)}</span>;
}


// ── Creative card ─────────────────────────────────────────────────────────────

function CreativeCard({
  c, brandId, dateFrom, dateTo, onReanalyzed,
}: {
  c: Creative; brandId: string; dateFrom: string; dateTo: string;
  onReanalyzed: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const m = c.metrics;

  const rankStyle =
    c.rank === 1 ? "text-amber-400 border-amber-500/40 bg-amber-500/10"
    : c.rank === 2 ? "text-slate-300 border-slate-500/30 bg-white/5"
    : c.rank === 3 ? "text-orange-400 border-orange-500/30 bg-orange-500/8"
    : "text-slate-600 border-slate-700/50 bg-white/3";

  const cardBorder =
    c.category === "GOOD" ? "border-emerald-500/15 hover:border-emerald-500/25"
    : c.category === "BAD" ? "border-red-500/15 hover:border-red-500/25"
    : "border-white/5 hover:border-white/10";

  const doReanalyze = async () => {
    setBusy(true);
    try {
      await axios.post(`${API}/creative/reanalyze/${c.ad_id}`, null, {
        params: { brand_id: brandId, date_from: dateFrom, date_to: dateTo },
      });
      onReanalyzed();
    } finally { setBusy(false); }
  };

  return (
    <div className={`rounded-2xl border bg-slate-900/50 overflow-hidden transition-colors ${cardBorder}`}>
      <div className="flex">
        {/* Thumbnail */}
        <div className="relative w-32 shrink-0 bg-black/20 min-h-[140px]">
          <Thumbnail url={c.thumbnail_url || c.image_url} type={c.creative_type} name={c.ad_name} />
          {/* Rank */}
          <div className={`absolute top-2 left-2 w-7 h-7 rounded-lg border text-xs font-bold flex items-center justify-center ${rankStyle}`}>
            {c.rank}
          </div>
          {/* NEW badge — created within this date range */}
          {c.is_new_in_range && (
            <div className="absolute top-2 right-1 text-[9px] font-bold px-1.5 py-0.5 rounded bg-indigo-500 text-white leading-none">
              NEW
            </div>
          )}
          {/* Campaign active dot */}
          {c.campaign_status === "ACTIVE" && (
            <div className="absolute bottom-2 left-2 w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_5px_rgba(52,211,153,0.9)]" title="Campaign active" />
          )}
          {/* Creation / first-seen date */}
          {c.first_seen_date && (
            <div className="absolute bottom-2 right-1 text-[9px] text-slate-500 bg-black/70 px-1.5 py-0.5 rounded leading-none">
              {fmtDate(c.first_seen_date)}
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0 p-4 space-y-2.5">
          {/* Top row */}
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="font-semibold text-slate-100 truncate leading-snug">{c.ad_name || c.ad_id}</p>
              <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                {c.campaign_name && (
                  <span className="text-xs text-slate-600 truncate max-w-[200px]"
                    title={c.campaign_name}>
                    {c.campaign_name}
                  </span>
                )}
                <span className="text-xs text-slate-700">· {c.creative_type || "UNKNOWN"}</span>
                {c.campaign_status === "ACTIVE" && (
                  <span className="text-[10px] text-emerald-700 font-medium">Campaign ACTIVE</span>
                )}
              </div>
            </div>
            <div className="flex items-center gap-1.5 shrink-0 flex-wrap justify-end">
              <CategoryBadge cat={c.category} />
              <StatusPill active={c.is_active} priority={c.active_priority} />
            </div>
          </div>

          {/* Score bars */}
          <div className="space-y-1.5 py-2 border-t border-b border-white/5">
            <ScoreBar
              label="Performance Score"
              score={c.performance_score}
              color={c.performance_score >= 65 ? "bg-emerald-500" : c.performance_score >= 35 ? "bg-amber-500" : "bg-red-500"}
            />
            <div className="flex items-center gap-2">
              <div className="flex-1">
                <ScoreBar label="AI Score" score={c.ai_score} color="bg-violet-500" />
              </div>
              <GapTag gap={c.score_gap} perf={c.performance_score} ai={c.ai_score} />
            </div>
          </div>

          {/* Metrics */}
          <div className="flex items-center gap-5 flex-wrap">
            {[
              ["ROAS",    `${m.roas.toFixed(2)}x`],
              ["CTR",     `${m.ctr.toFixed(2)}%`],
              ["CPM",     `₹${Math.round(m.cpm)}`],
              ["Hook/1K", m.hook_rate.toFixed(2)],
              ["Conv",    fmtNum(m.conversions)],
              ["Spend",   fmtShort(m.spend)],
              ["Rev",     fmtShort(m.revenue)],
            ].map(([label, val]) => (
              <div key={label} className="text-center min-w-0">
                <p className="text-[10px] text-slate-600 uppercase tracking-wider">{label}</p>
                <p className="text-xs font-semibold text-slate-200 tabular-nums">{val}</p>
              </div>
            ))}
          </div>

          {/* AI reasoning + re-analyze */}
          {c.ai_reasoning && (
            <div className="flex items-end justify-between gap-4 pt-1">
              <p className="text-xs text-slate-600 italic leading-relaxed">
                AI: &ldquo;{c.ai_reasoning}&rdquo;
              </p>
              <button
                onClick={doReanalyze}
                disabled={busy}
                className="shrink-0 flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-500 hover:text-slate-200 transition-all disabled:opacity-40"
              >
                <RefreshCw className={`w-3 h-3 ${busy ? "animate-spin" : ""}`} />
                {busy ? "Analyzing…" : "Re-analyze"}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}


// ── Main page ─────────────────────────────────────────────────────────────────

export default function CreativeAnalysisPage() {
  const [range, setRange, dateHydrated] = useDateRange();

  const [brands, setBrands]           = useState<Brand[]>([]);
  const [selectedBrand, setBrand]     = useState("");
  const [brandOpen, setBrandOpen]     = useState(false);

  const [data, setData]               = useState<AnalysisData | null>(null);
  const [loading, setLoading]         = useState(false);
  const [loadingStep, setLoadingStep] = useState("");
  const [reanalyzingAll, setReAll]    = useState(false);
  const [syncing, setSyncing]         = useState(false);

  const [filter, setFilter]           = useState<FilterKey>("ALL");
  const [sortBy, setSortBy]           = useState<SortKey>("score");
  const [selectedCampaign, setCamp]   = useState("ALL");
  const [campOpen, setCampOpen]       = useState(false);

  // Used to discard responses from superseded requests (stale fetch guard)
  const fetchId = useRef(0);

  // Load brands
  useEffect(() => {
    axios.get(`${API}/brands/`).then(r => {
      const list: Brand[] = r.data || [];
      setBrands(list);
      if (list.length > 0) setBrand(list[0].id);
    }).catch(() => {});
  }, []);

  const fetchAnalysis = useCallback(async (forceReanalyze = false, forceSync = false) => {
    if (!selectedBrand) return;
    const id = ++fetchId.current;
    setLoading(true);
    setLoadingStep(forceSync ? "Connecting to Meta API…" : "Loading creatives…");
    try {
      // Staged progress messages so the user sees something moving
      let stepTimer: ReturnType<typeof setTimeout> | null = null;
      if (forceSync) {
        const steps = [
          [1500,  "Fetching active campaigns & ads…"],
          [6000,  "Loading creative thumbnails…"],
          [14000, "Computing performance scores…"],
          [22000, "Running AI analysis…"],
          [32000, "Finalizing & caching…"],
        ] as [number, string][];
        for (const [delay, msg] of steps) {
          const t = setTimeout(() => {
            if (fetchId.current === id) setLoadingStep(msg);
          }, delay);
          // Keep only the last timer ref to clear on finish
          stepTimer = t;
        }
      }

      const r = await axios.get(`${API}/creative/analysis`, {
        params: {
          brand_id: selectedBrand,
          date_from: range.from,
          date_to: range.to,
          force_reanalyze: forceReanalyze,
          force_sync: forceSync,
        },
        timeout: 120_000,
      });

      if (stepTimer) clearTimeout(stepTimer);
      if (id !== fetchId.current) return; // stale — a newer request is in flight
      setData(r.data);
      if (forceSync) setCamp("ALL");
    } catch {
      if (id !== fetchId.current) return;
      /* leave stale data visible */
    } finally {
      if (id === fetchId.current) { setLoading(false); setLoadingStep(""); }
    }
  }, [selectedBrand, range.from, range.to]);

  // Only fire once BOTH brand and correct date range are ready
  useEffect(() => {
    if (selectedBrand && dateHydrated) fetchAnalysis();
  }, [selectedBrand, range.from, range.to, dateHydrated]); // eslint-disable-line

  const handleReanalyzed = useCallback(() => fetchAnalysis(), [fetchAnalysis]);

  const handleReanalyzeAll = async () => {
    if (!selectedBrand) return;
    setReAll(true);
    try {
      await axios.post(`${API}/creative/reanalyze-all`, null, {
        params: { brand_id: selectedBrand, date_from: range.from, date_to: range.to },
      });
      await fetchAnalysis(true, false);
    } finally { setReAll(false); }
  };

  const handleSyncFromMeta = async () => {
    if (!selectedBrand) return;
    setSyncing(true);
    try {
      // Clear cached scores then force re-pull metrics from Meta
      await axios.post(`${API}/creative/reanalyze-all`, null, {
        params: { brand_id: selectedBrand, date_from: range.from, date_to: range.to },
      });
      await fetchAnalysis(true, true);
    } finally { setSyncing(false); }
  };

  // Unique campaigns from loaded creatives
  const campaigns: { id: string; name: string }[] = [];
  const seenCamp = new Set<string>();
  for (const c of data?.creatives ?? []) {
    if (c.campaign_id && !seenCamp.has(c.campaign_id)) {
      seenCamp.add(c.campaign_id);
      campaigns.push({ id: c.campaign_id, name: c.campaign_name || c.campaign_id });
    }
  }

  // ── Derived + filtered + sorted list ────────────────────────────────────────
  let list: Creative[] = data?.creatives ?? [];

  // campaign filter
  if (selectedCampaign !== "ALL") list = list.filter(c => c.campaign_id === selectedCampaign);

  // category / status filter
  if (filter === "GOOD")     list = list.filter(c => c.category === "GOOD");
  if (filter === "AVERAGE")  list = list.filter(c => c.category === "AVERAGE");
  if (filter === "BAD")      list = list.filter(c => c.category === "BAD");
  if (filter === "ACTIVE")   list = list.filter(c => c.is_active);
  if (filter === "INACTIVE") list = list.filter(c => !c.is_active);

  // sort
  const sorted = [...list].sort((a, b) => {
    if (sortBy === "roas")  return b.metrics.roas  - a.metrics.roas;
    if (sortBy === "spend") return b.metrics.spend - a.metrics.spend;
    if (sortBy === "ctr")   return b.metrics.ctr   - a.metrics.ctr;
    if (sortBy === "date") {
      const da = a.first_seen_date || "9999";
      const db = b.first_seen_date || "9999";
      return db.localeCompare(da); // newest first
    }
    // default "score": category order GOOD > AVERAGE > BAD, then by score
    const catOrder = { GOOD: 0, AVERAGE: 1, BAD: 2 };
    const cDiff = catOrder[a.category] - catOrder[b.category];
    return cDiff !== 0 ? cDiff : b.performance_score - a.performance_score;
  });

  const s = data?.summary;
  const selBrand = brands.find(b => b.id === selectedBrand);
  const selCampName = campaigns.find(c => c.id === selectedCampaign)?.name ?? "All Campaigns";
  const diffAbs = Math.abs(s?.score_diff ?? 0);
  const diffPos = (s?.score_diff ?? 0) > 0;

  // KPI card config — each is a clickable filter
  const kpiCards = [
    { key: "GOOD"     as FilterKey, label: "Good",     count: s?.good_count     ?? 0, color: "text-emerald-400", bg: "bg-emerald-500/5",  border: "border-emerald-500/15", ring: "ring-emerald-500/40" },
    { key: "AVERAGE"  as FilterKey, label: "Average",  count: s?.average_count  ?? 0, color: "text-amber-400",   bg: "bg-amber-500/5",    border: "border-amber-500/15",   ring: "ring-amber-500/40" },
    { key: "BAD"      as FilterKey, label: "Bad",      count: s?.bad_count      ?? 0, color: "text-red-400",     bg: "bg-red-500/5",      border: "border-red-500/15",     ring: "ring-red-500/40" },
    { key: "ALL"      as FilterKey, label: "Total",    count: s?.total          ?? 0, color: "text-slate-300",   bg: "bg-white/3",        border: "border-white/5",        ring: "ring-white/20" },
    { key: "ACTIVE"   as FilterKey, label: "Active",   count: s?.active_count   ?? 0, color: "text-indigo-400",  bg: "bg-indigo-500/5",   border: "border-indigo-500/15",  ring: "ring-indigo-500/40" },
    { key: "INACTIVE" as FilterKey, label: "Inactive", count: s?.inactive_count ?? 0, color: "text-slate-500",   bg: "bg-white/3",        border: "border-white/5",        ring: "ring-slate-500/30" },
  ];

  return (
    <div className="space-y-5">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-medium text-white">Creative Analysis</h1>
          <p className="text-slate-500 mt-1 text-sm">Performance + AI dual scoring · ranked by weighted composite</p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <DateRangePicker value={range} onChange={setRange} />
          <button
            onClick={handleSyncFromMeta}
            disabled={syncing || loading || !selectedBrand}
            title="Re-pull all creative metrics from Meta API for this date range"
            className="flex items-center gap-2 text-xs font-medium px-3 py-2 rounded-xl bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/20 text-indigo-400 hover:text-indigo-200 transition-all disabled:opacity-40"
          >
            <CloudDownload className={`w-3.5 h-3.5 ${syncing ? "animate-pulse" : ""}`} />
            {syncing ? "Syncing…" : "Sync from Meta"}
          </button>
          <button
            onClick={handleReanalyzeAll}
            disabled={reanalyzingAll || loading || !selectedBrand}
            className="flex items-center gap-2 text-xs font-medium px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-all disabled:opacity-40"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${reanalyzingAll ? "animate-spin" : ""}`} />
            {reanalyzingAll ? "Re-analyzing…" : "Re-analyze All"}
          </button>
        </div>
      </div>

      {/* ── Brand + Campaign selectors ──────────────────────────────────────── */}
      <div className="flex items-center gap-3 flex-wrap">
        {/* Brand */}
        <div className="relative">
          <button
            onClick={() => setBrandOpen(o => !o)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 border border-white/8 hover:bg-white/8 transition text-sm font-medium text-slate-200"
          >
            {selBrand && <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: selBrand.color }} />}
            {selBrand?.name ?? "Select brand"}
            <ChevronDown className="w-4 h-4 text-slate-500" />
          </button>
          {brandOpen && (
            <div className="absolute top-full left-0 mt-1 z-50 w-56 bg-slate-900 border border-white/10 rounded-xl shadow-2xl overflow-hidden">
              {brands.map(b => (
                <button
                  key={b.id}
                  onClick={() => { setBrand(b.id); setBrandOpen(false); setData(null); }}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm text-left hover:bg-white/5 transition ${b.id === selectedBrand ? "text-white bg-white/5" : "text-slate-400"}`}
                >
                  <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: b.color }} />
                  {b.name}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Campaign */}
        {campaigns.length > 0 && (
          <div className="relative">
            <button
              onClick={() => setCampOpen(o => !o)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 border border-white/8 hover:bg-white/8 transition text-sm font-medium text-slate-300 max-w-xs"
            >
              <span className="truncate max-w-[180px]">{selCampName}</span>
              <ChevronDown className="w-4 h-4 text-slate-500 shrink-0" />
            </button>
            {campOpen && (
              <div className="absolute top-full left-0 mt-1 z-50 w-72 bg-slate-900 border border-white/10 rounded-xl shadow-2xl overflow-hidden max-h-64 overflow-y-auto">
                <button
                  onClick={() => { setCamp("ALL"); setCampOpen(false); }}
                  className={`w-full px-4 py-2.5 text-sm text-left hover:bg-white/5 transition ${selectedCampaign === "ALL" ? "text-white bg-white/5" : "text-slate-400"}`}
                >
                  All Campaigns
                </button>
                {campaigns.map(camp => (
                  <button
                    key={camp.id}
                    onClick={() => { setCamp(camp.id); setCampOpen(false); }}
                    className={`w-full px-4 py-2.5 text-sm text-left hover:bg-white/5 transition truncate ${selectedCampaign === camp.id ? "text-white bg-white/5" : "text-slate-400"}`}
                  >
                    {camp.name}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        <span className="text-xs text-slate-700">
          {range.label} · <span className="text-slate-600">{range.from} → {range.to}</span>
        </span>
      </div>

      {/* ── First-time Meta sync notice ─────────────────────────────────────── */}
      {data?.synced_from_meta && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-indigo-500/8 border border-indigo-500/20 text-xs text-indigo-400">
          <RefreshCw className="w-3.5 h-3.5 shrink-0" />
          Live pull from Meta — creatives synced and cached. Future loads will be instant.
        </div>
      )}

      {/* ── Thumbnail backfill in progress ──────────────────────────────────── */}
      {(data?.missing_thumbnails_count ?? 0) > 0 && !loading && (
        <div className="flex items-center justify-between gap-3 px-4 py-3 rounded-xl bg-amber-500/8 border border-amber-500/20 text-xs text-amber-400">
          <div className="flex items-center gap-2">
            <RefreshCw className="w-3.5 h-3.5 shrink-0 animate-spin" />
            <span>
              Fetching thumbnails for {data!.missing_thumbnails_count} creative{data!.missing_thumbnails_count !== 1 ? "s" : ""} in the background.
              Refresh the page in a moment to see them.
            </span>
          </div>
          <button
            onClick={() => fetchAnalysis()}
            className="shrink-0 px-3 py-1 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 font-medium transition-all"
          >
            Refresh now
          </button>
        </div>
      )}

      {/* ── Clickable KPI filter cards ───────────────────────────────────────── */}
      {s && !loading && (
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
          {kpiCards.map(({ key, label, count, color, bg, border, ring }) => {
            const active = filter === key;
            return (
              <button
                key={key}
                onClick={() => setFilter(key)}
                className={`p-3 rounded-2xl border text-left transition-all ${bg} ${border}
                  ${active ? `ring-2 ${ring} scale-[1.02]` : "hover:scale-[1.01] hover:brightness-110"}`}
              >
                <p className="text-[10px] text-slate-600 uppercase tracking-widest mb-1">{label}</p>
                <p className={`text-2xl font-bold ${active ? color : "text-slate-400"}`}>{count}</p>
                {active && <div className={`mt-1 h-0.5 rounded-full ${color.replace("text-", "bg-")}`} />}
              </button>
            );
          })}
        </div>
      )}

      {/* ── Active vs Inactive diff banner ──────────────────────────────────── */}
      {s && s.active_count > 0 && s.inactive_count > 0 && !loading && (
        <div className={`p-4 rounded-2xl border flex items-center justify-between gap-6 flex-wrap
          ${diffPos ? "bg-emerald-500/5 border-emerald-500/15" : diffAbs < 3 ? "bg-white/3 border-white/5" : "bg-amber-500/5 border-amber-500/15"}`}>
          <div className="flex items-center gap-3">
            {diffPos
              ? <TrendingUp className="w-5 h-5 text-emerald-400 shrink-0" />
              : <TrendingDown className="w-5 h-5 text-amber-400 shrink-0" />}
            <div>
              <p className={`text-sm font-medium ${diffPos ? "text-emerald-300" : diffAbs < 3 ? "text-slate-400" : "text-amber-300"}`}>
                {diffAbs < 3
                  ? "Active and inactive creatives perform similarly"
                  : diffPos
                  ? `Active creatives score ${diffAbs.toFixed(0)} pts higher on average`
                  : `Inactive creatives outperform active by ${diffAbs.toFixed(0)} pts`}
              </p>
              <p className="text-xs text-slate-600 mt-0.5">{range.label}</p>
            </div>
          </div>
          <div className="flex items-center gap-6 shrink-0">
            <div className="text-center">
              <p className="text-[10px] text-slate-600 mb-0.5">Active avg</p>
              <p className="text-xl font-bold text-emerald-400">{s.active_avg_score}</p>
            </div>
            <p className="text-sm text-slate-600">{diffPos ? `+${diffAbs.toFixed(0)}` : `−${diffAbs.toFixed(0)}`} pts</p>
            <div className="text-center">
              <p className="text-[10px] text-slate-600 mb-0.5">Inactive avg</p>
              <p className="text-xl font-bold text-slate-400">{s.inactive_avg_score}</p>
            </div>
          </div>
        </div>
      )}

      {/* ── Sort row + weights legend ────────────────────────────────────────── */}
      {data && !loading && sorted.length > 0 && (
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-slate-600">Sort:</span>
            {(["score", "roas", "spend", "ctr", "date"] as SortKey[]).map(sk => (
              <button
                key={sk}
                onClick={() => setSortBy(sk)}
                className={`text-xs px-3 py-1.5 rounded-lg border transition-all ${
                  sortBy === sk
                    ? "bg-indigo-500/20 text-indigo-300 border-indigo-500/30"
                    : "bg-white/3 text-slate-500 border-white/5 hover:text-slate-300"
                }`}
              >
                {sk === "score" ? "Score" : sk === "date" ? "Date Created" : sk.toUpperCase()}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-1.5 flex-wrap">
            {[["ROAS","30%"], ["CTR","20%"], ["CPM↓","15%"], ["Hook/1K","15%"], ["Conv Eff","10%"], ["Spend","10%"]].map(([l, w]) => (
              <span key={l} className="text-[10px] px-1.5 py-0.5 rounded bg-white/3 text-slate-600 border border-white/5">
                {l} <span className="text-slate-500">{w}</span>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* ── Loading / progress ───────────────────────────────────────────────── */}
      {loading && (
        <div className="py-16 flex flex-col items-center gap-5">
          <div className="flex items-center gap-3 text-slate-400">
            <BarChart2 className="w-6 h-6 animate-pulse text-indigo-400" />
            <p className="text-sm font-medium">{loadingStep || "Loading creatives…"}</p>
          </div>

          {/* Animated indeterminate bar */}
          <div className="w-72 h-1 bg-white/5 rounded-full overflow-hidden">
            <div className="h-full w-1/2 rounded-full bg-indigo-500" style={{ animation: "slide 1.4s ease-in-out infinite" }} />
          </div>

          {syncing && (
            <div className="mt-2 space-y-2 text-center">
              {[
                "Connecting to Meta API",
                "Fetching active campaigns & ads",
                "Loading creative thumbnails",
                "Computing performance scores",
                "Running AI analysis",
              ].map((step, i) => {
                const steps = ["Connecting","Fetching","Loading","Computing","Running"];
                const active = steps.some(s => loadingStep.startsWith(s.slice(0, 4)));
                const idx    = steps.findIndex(s => loadingStep.startsWith(s.slice(0, 4)));
                const done   = idx > i;
                const current = idx === i;
                return (
                  <div key={step} className={`flex items-center gap-2 text-xs ${done ? "text-emerald-500" : current ? "text-indigo-300" : "text-slate-700"}`}>
                    <span className="w-3.5 text-center">{done ? "✓" : current ? "›" : "·"}</span>
                    {step}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
      {!loading && !selectedBrand && (
        <div className="py-20 text-center text-slate-600 text-sm">Select a brand to load creative analysis.</div>
      )}
      {!loading && selectedBrand && data && data.creatives.length === 0 && (
        <div className="py-20 text-center text-slate-600 text-sm">
          No creatives with spend found for this brand in the selected date range.
        </div>
      )}
      {!loading && sorted.length === 0 && data && data.creatives.length > 0 && (
        <div className="py-12 text-center text-slate-600 text-sm">No creatives match the current filter.</div>
      )}

      {/* ── Creative cards ───────────────────────────────────────────────────── */}
      {!loading && sorted.length > 0 && (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
          {sorted.map(c => (
            <CreativeCard
              key={c.ad_id}
              c={c}
              brandId={selectedBrand}
              dateFrom={range.from}
              dateTo={range.to}
              onReanalyzed={handleReanalyzed}
            />
          ))}
        </div>
      )}

    </div>
  );
}
