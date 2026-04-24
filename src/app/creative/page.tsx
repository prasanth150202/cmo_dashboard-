"use client";
import { useEffect, useState, useCallback } from "react";
import axios from "axios";
import {
  RefreshCw, Star, Minus, XCircle, ChevronDown,
  TrendingUp, TrendingDown, Activity, BarChart2,
  Image as ImageIcon, Video, Layers, Link2, Zap,
} from "lucide-react";
import DateRangePicker, { useDateRange } from "@/components/DateRangePicker";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

const fmtShort = (v: number) =>
  v >= 1_00_00_000 ? `₹${(v / 1_00_00_000).toFixed(1)}Cr`
  : v >= 1_00_000  ? `₹${(v / 1_00_000).toFixed(1)}L`
  : v >= 1_000     ? `₹${(v / 1_000).toFixed(0)}K`
  : `₹${Math.round(v)}`;

const fmtNum = (v: number) => Math.round(v).toLocaleString("en-IN");

// ── Types ─────────────────────────────────────────────────────────────────────

type Metrics = {
  spend: number; revenue: number; roas: number;
  ctr: number; cpm: number; hook_rate: number;
  conversions: number; impressions: number;
  clicks: number; atc: number; checkout: number;
};

type Creative = {
  ad_id: string; ad_name: string; ad_status: string;
  campaign_id: string; campaign_status: string;
  is_active: boolean; active_priority: boolean;
  creative_type: string;
  thumbnail_url: string; image_url: string;
  ad_title: string; ad_body: string;
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
  date_from: string; date_to: string; brand_id: string;
};

type Brand = { id: string; name: string; color: string; };

type FilterKey = "ALL" | "ACTIVE" | "INACTIVE" | "GOOD" | "AVERAGE" | "BAD";
type SortKey   = "score" | "roas" | "spend" | "ctr";


// ── Sub-components ────────────────────────────────────────────────────────────

function CreativeTypeIcon({ type }: { type: string }) {
  const t = type.toUpperCase();
  if (t === "VIDEO")    return <Video   className="w-5 h-5 text-violet-400" />;
  if (t === "CAROUSEL") return <Layers  className="w-5 h-5 text-blue-400" />;
  if (t === "LINK")     return <Link2   className="w-5 h-5 text-cyan-400" />;
  return <ImageIcon className="w-5 h-5 text-slate-400" />;
}

function CategoryBadge({ cat }: { cat: string }) {
  if (cat === "GOOD")
    return (
      <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/20">
        <Star className="w-3 h-3" /> Good
      </span>
    );
  if (cat === "BAD")
    return (
      <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-0.5 rounded-full bg-red-500/15 text-red-400 border border-red-500/20">
        <XCircle className="w-3 h-3" /> Bad
      </span>
    );
  return (
    <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-0.5 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/20">
      <Minus className="w-3 h-3" /> Average
    </span>
  );
}

function StatusPill({ active, priority }: { active: boolean; priority: boolean }) {
  if (priority)
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-indigo-500/15 text-indigo-400 border border-indigo-500/20">
        <Zap className="w-3 h-3" /> Active ★
      </span>
    );
  if (active)
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
        <Activity className="w-3 h-3" /> Active
      </span>
    );
  return (
    <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-slate-500/10 text-slate-500 border border-slate-700">
      Inactive
    </span>
  );
}

function ScoreBar({
  label, score, color, sublabel,
}: { label: string; score: number; color: string; sublabel?: string }) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-xs text-slate-500 w-28 shrink-0">{label}</span>
      <div className="flex-1 h-1.5 bg-white/5 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-700 ${color}`}
          style={{ width: `${Math.min(score, 100)}%` }}
        />
      </div>
      <span className={`text-sm font-semibold tabular-nums w-8 text-right ${color.replace("bg-", "text-")}`}>
        {Math.round(score)}
      </span>
      {sublabel && <span className="text-xs text-slate-600 w-20">{sublabel}</span>}
    </div>
  );
}

function Thumbnail({ url, type }: { url: string; type: string }) {
  const [err, setErr] = useState(false);
  if (url && !err) {
    return (
      <img
        src={url}
        alt=""
        onError={() => setErr(true)}
        className="w-full h-full object-cover"
      />
    );
  }
  return (
    <div className="w-full h-full flex items-center justify-center bg-white/3">
      <CreativeTypeIcon type={type} />
    </div>
  );
}

function GapIndicator({ gap, perfScore, aiScore }: { gap: number; perfScore: number; aiScore: number }) {
  if (gap < 5) return <span className="text-xs text-emerald-500 font-medium">Aligned ✓</span>;
  if (perfScore > aiScore)
    return <span className="text-xs text-amber-400 font-medium">P +{gap.toFixed(0)} pts</span>;
  return <span className="text-xs text-violet-400 font-medium">AI +{gap.toFixed(0)} pts</span>;
}

function MetricBox({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="flex flex-col items-center min-w-0">
      <span className="text-xs text-slate-600 uppercase tracking-wider mb-0.5">{label}</span>
      <span className="text-sm font-semibold text-slate-200 tabular-nums">{value}</span>
      {sub && <span className="text-[10px] text-slate-600">{sub}</span>}
    </div>
  );
}


// ── Creative card ─────────────────────────────────────────────────────────────

function CreativeCard({
  creative, brandId, dateFrom, dateTo, onReanalyzed,
}: {
  creative: Creative;
  brandId: string;
  dateFrom: string;
  dateTo: string;
  onReanalyzed: () => void;
}) {
  const [reanalyzing, setReanalyzing] = useState(false);
  const m = creative.metrics;

  const handleReanalyze = useCallback(async () => {
    setReanalyzing(true);
    try {
      await axios.post(
        `${API}/creative/reanalyze/${creative.ad_id}`,
        null,
        { params: { brand_id: brandId, date_from: dateFrom, date_to: dateTo } },
      );
      onReanalyzed();
    } catch {
      // silently fall through; the parent refresh will show current data
    } finally {
      setReanalyzing(false);
    }
  }, [creative.ad_id, brandId, dateFrom, dateTo, onReanalyzed]);

  const rankColor =
    creative.rank === 1 ? "text-amber-400 border-amber-500/40 bg-amber-500/10"
    : creative.rank === 2 ? "text-slate-300 border-slate-500/30 bg-slate-500/8"
    : creative.rank === 3 ? "text-orange-400 border-orange-500/30 bg-orange-500/8"
    : "text-slate-500 border-slate-700 bg-white/3";

  const cardBorder =
    creative.category === "GOOD"    ? "border-emerald-500/15"
    : creative.category === "BAD"  ? "border-red-500/15"
    : "border-white/5";

  return (
    <div className={`rounded-2xl border bg-slate-900/60 overflow-hidden ${cardBorder}`}>
      <div className="flex gap-0">
        {/* Thumbnail column */}
        <div className="relative w-36 shrink-0 bg-black/30">
          <Thumbnail url={creative.thumbnail_url || creative.image_url} type={creative.creative_type} />
          {/* Rank badge */}
          <div className={`absolute top-2 left-2 w-7 h-7 rounded-lg border text-xs font-bold flex items-center justify-center ${rankColor}`}>
            {creative.rank}
          </div>
          {/* Campaign status dot */}
          {creative.campaign_status === "ACTIVE" && (
            <div className="absolute bottom-2 left-2 w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_4px_rgba(52,211,153,0.8)]" />
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0 p-4 space-y-3">
          {/* Row 1: name + badges */}
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="font-semibold text-slate-100 truncate leading-tight">{creative.ad_name}</p>
              <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                <span className="text-xs text-slate-600">
                  {creative.creative_type || "UNKNOWN"}
                </span>
                {creative.campaign_id && (
                  <span className="text-xs text-slate-700">
                    · Campaign: <span className={creative.campaign_status === "ACTIVE" ? "text-emerald-600" : "text-slate-600"}>
                      {creative.campaign_status}
                    </span>
                  </span>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <CategoryBadge cat={creative.category} />
              <StatusPill active={creative.is_active} priority={creative.active_priority} />
            </div>
          </div>

          {/* Row 2: Score bars */}
          <div className="space-y-1.5 py-1 border-t border-white/5">
            <ScoreBar
              label="Performance Score"
              score={creative.performance_score}
              color={
                creative.performance_score >= 65 ? "bg-emerald-500"
                : creative.performance_score >= 35 ? "bg-amber-500"
                : "bg-red-500"
              }
            />
            <div className="flex items-center gap-3">
              <ScoreBar
                label="AI Score"
                score={creative.ai_score}
                color="bg-violet-500"
              />
              <GapIndicator
                gap={creative.score_gap}
                perfScore={creative.performance_score}
                aiScore={creative.ai_score}
              />
            </div>
          </div>

          {/* Row 3: Metrics grid */}
          <div className="flex items-center gap-4 pt-1 border-t border-white/5 flex-wrap">
            <MetricBox label="ROAS"    value={`${m.roas.toFixed(2)}x`} />
            <MetricBox label="CTR"     value={`${m.ctr.toFixed(2)}%`} />
            <MetricBox label="CPM"     value={`₹${Math.round(m.cpm)}`} />
            <MetricBox label="Hook/1K" value={m.hook_rate.toFixed(2)} sub="atc+chk/1k imp" />
            <MetricBox label="Conv"    value={fmtNum(m.conversions)} />
            <MetricBox label="Spend"   value={fmtShort(m.spend)} />
            <MetricBox label="Revenue" value={fmtShort(m.revenue)} />
          </div>

          {/* Row 4: AI reasoning + re-analyze */}
          {creative.ai_reasoning && (
            <div className="flex items-end justify-between gap-4 pt-1 border-t border-white/5">
              <p className="text-xs text-slate-500 italic leading-relaxed">
                AI: "{creative.ai_reasoning}"
              </p>
              <button
                onClick={handleReanalyze}
                disabled={reanalyzing}
                className="shrink-0 flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-slate-200 transition-all disabled:opacity-40"
              >
                <RefreshCw className={`w-3 h-3 ${reanalyzing ? "animate-spin" : ""}`} />
                {reanalyzing ? "Analyzing..." : "Re-analyze"}
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
  const [range, setRange] = useDateRange();

  const [brands, setBrands]             = useState<Brand[]>([]);
  const [selectedBrand, setSelectedBrand] = useState<string>("");
  const [brandOpen, setBrandOpen]       = useState(false);

  const [data, setData]         = useState<AnalysisData | null>(null);
  const [loading, setLoading]   = useState(false);
  const [reanalyzingAll, setReanalyzingAll] = useState(false);

  const [filter, setFilter] = useState<FilterKey>("ALL");
  const [sortBy, setSortBy] = useState<SortKey>("score");

  // Load brands once
  useEffect(() => {
    axios.get(`${API}/brands/`).then(r => {
      const list: Brand[] = r.data || [];
      setBrands(list);
      if (list.length > 0) setSelectedBrand(list[0].id);
    }).catch(() => {});
  }, []);

  const fetchAnalysis = useCallback(async (force = false) => {
    if (!selectedBrand) return;
    setLoading(true);
    try {
      const r = await axios.get(`${API}/creative/analysis`, {
        params: {
          brand_id:       selectedBrand,
          date_from:      range.from,
          date_to:        range.to,
          force_reanalyze: force,
        },
      });
      setData(r.data);
    } catch {
      // leave previous data visible
    } finally {
      setLoading(false);
    }
  }, [selectedBrand, range.from, range.to]);

  // Fetch when brand or date range changes
  useEffect(() => {
    if (selectedBrand) fetchAnalysis();
  }, [selectedBrand, range.from, range.to]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleReanalyzed = useCallback(() => fetchAnalysis(), [fetchAnalysis]);

  const handleReanalyzeAll = async () => {
    if (!selectedBrand) return;
    setReanalyzingAll(true);
    try {
      await axios.post(`${API}/creative/reanalyze-all`, null, {
        params: { brand_id: selectedBrand, date_from: range.from, date_to: range.to },
      });
      await fetchAnalysis(true);
    } finally {
      setReanalyzingAll(false);
    }
  };

  // ── Derived display list ────────────────────────────────────────────────────
  let displayed: Creative[] = data?.creatives ?? [];

  if (filter === "ACTIVE")   displayed = displayed.filter(c => c.is_active);
  if (filter === "INACTIVE") displayed = displayed.filter(c => !c.is_active);
  if (filter === "GOOD")     displayed = displayed.filter(c => c.category === "GOOD");
  if (filter === "AVERAGE")  displayed = displayed.filter(c => c.category === "AVERAGE");
  if (filter === "BAD")      displayed = displayed.filter(c => c.category === "BAD");

  const sorted = [...displayed].sort((a, b) => {
    if (sortBy === "roas")  return b.metrics.roas  - a.metrics.roas;
    if (sortBy === "spend") return b.metrics.spend - a.metrics.spend;
    if (sortBy === "ctr")   return b.metrics.ctr   - a.metrics.ctr;
    return b.performance_score - a.performance_score;
  });

  const s = data?.summary;
  const selectedBrandObj = brands.find(b => b.id === selectedBrand);

  // ── Diff banner config ──────────────────────────────────────────────────────
  const diffPositive = (s?.score_diff ?? 0) > 0;
  const diffAbs = Math.abs(s?.score_diff ?? 0);

  return (
    <div className="space-y-6">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-medium text-white">Creative Analysis</h1>
          <p className="text-slate-500 mt-1 text-sm">
            Performance + AI dual scoring · ranked by composite weighted metrics
          </p>
        </div>
        <div className="flex items-center gap-3">
          <DateRangePicker value={range} onChange={setRange} />
          <button
            onClick={handleReanalyzeAll}
            disabled={reanalyzingAll || loading || !selectedBrand}
            className="flex items-center gap-2 text-xs font-medium px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-all disabled:opacity-40"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${reanalyzingAll ? "animate-spin" : ""}`} />
            {reanalyzingAll ? "Re-analyzing..." : "Re-analyze All"}
          </button>
        </div>
      </div>

      {/* ── Brand selector ─────────────────────────────────────────────────── */}
      <div className="relative inline-block">
        <button
          onClick={() => setBrandOpen(o => !o)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 border border-white/8 hover:bg-white/8 transition text-sm font-medium text-slate-200"
        >
          {selectedBrandObj && (
            <span
              className="w-2.5 h-2.5 rounded-full shrink-0"
              style={{ backgroundColor: selectedBrandObj.color }}
            />
          )}
          {selectedBrandObj?.name ?? "Select brand"}
          <ChevronDown className="w-4 h-4 text-slate-500" />
        </button>
        {brandOpen && (
          <div className="absolute top-full left-0 mt-1 z-50 w-56 bg-slate-900 border border-white/10 rounded-xl shadow-2xl overflow-hidden">
            {brands.map(b => (
              <button
                key={b.id}
                onClick={() => { setSelectedBrand(b.id); setBrandOpen(false); setData(null); }}
                className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm text-left hover:bg-white/5 transition ${b.id === selectedBrand ? "text-white bg-white/5" : "text-slate-400"}`}
              >
                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: b.color }} />
                {b.name}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ── Date range label ────────────────────────────────────────────────── */}
      <p className="text-xs text-slate-600 -mt-4">
        Showing <span className="text-slate-500">{range.label}</span>
        &nbsp;·&nbsp;{range.from} → {range.to}
      </p>

      {/* ── Summary KPI bar ─────────────────────────────────────────────────── */}
      {s && !loading && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {[
            { label: "Good",     value: s.good_count,     color: "text-emerald-400", bg: "bg-emerald-500/5 border-emerald-500/10" },
            { label: "Average",  value: s.average_count,  color: "text-amber-400",   bg: "bg-amber-500/5 border-amber-500/10" },
            { label: "Bad",      value: s.bad_count,      color: "text-red-400",     bg: "bg-red-500/5 border-red-500/10" },
            { label: "Total",    value: s.total,          color: "text-slate-300",   bg: "bg-white/3 border-white/5" },
            { label: "Active",   value: s.active_count,   color: "text-indigo-400",  bg: "bg-indigo-500/5 border-indigo-500/10" },
            { label: "Inactive", value: s.inactive_count, color: "text-slate-500",   bg: "bg-white/3 border-white/5" },
          ].map(({ label, value, color, bg }) => (
            <div key={label} className={`p-4 rounded-2xl border ${bg}`}>
              <p className="text-xs text-slate-600 uppercase tracking-widest mb-1">{label}</p>
              <p className={`text-2xl font-semibold ${color}`}>{value}</p>
            </div>
          ))}
        </div>
      )}

      {/* ── Active vs Inactive diff banner ──────────────────────────────────── */}
      {s && s.active_count > 0 && s.inactive_count > 0 && !loading && (
        <div className={`p-4 rounded-2xl border flex items-center justify-between gap-6 flex-wrap ${
          diffPositive
            ? "bg-emerald-500/5 border-emerald-500/15"
            : diffAbs < 3
            ? "bg-slate-500/5 border-slate-700"
            : "bg-amber-500/5 border-amber-500/15"
        }`}>
          <div className="flex items-center gap-3">
            {diffPositive
              ? <TrendingUp  className="w-5 h-5 text-emerald-400 shrink-0" />
              : <TrendingDown className="w-5 h-5 text-amber-400 shrink-0" />}
            <div>
              <p className={`text-sm font-medium ${diffPositive ? "text-emerald-300" : diffAbs < 3 ? "text-slate-400" : "text-amber-300"}`}>
                {diffAbs < 3
                  ? "Active and inactive creatives perform similarly"
                  : diffPositive
                  ? `Active creatives score ${diffAbs.toFixed(0)} pts higher on average`
                  : `Inactive creatives surprisingly outperform active by ${diffAbs.toFixed(0)} pts`}
              </p>
              <p className="text-xs text-slate-600 mt-0.5">
                Weighted score · {range.label}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-6 shrink-0">
            <div className="text-center">
              <p className="text-xs text-slate-600 mb-0.5">Active avg</p>
              <p className="text-xl font-bold text-emerald-400">{s.active_avg_score}</p>
            </div>
            <div className="text-center text-slate-600">
              <p className="text-sm font-medium">
                {diffPositive ? `+${diffAbs.toFixed(0)}` : `−${diffAbs.toFixed(0)}`} pts
              </p>
            </div>
            <div className="text-center">
              <p className="text-xs text-slate-600 mb-0.5">Inactive avg</p>
              <p className="text-xl font-bold text-slate-400">{s.inactive_avg_score}</p>
            </div>
          </div>
        </div>
      )}

      {/* ── Scoring weights legend ───────────────────────────────────────────── */}
      {data && !loading && data.creatives.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs text-slate-700">Score weights:</span>
          {[
            ["ROAS", "30%"], ["CTR", "20%"], ["CPM↓", "15%"],
            ["Hook/1K", "15%"], ["Conv Eff", "10%"], ["Spend", "10%"],
          ].map(([label, w]) => (
            <span key={label} className="text-xs px-2 py-0.5 rounded-md bg-white/3 text-slate-600 border border-white/5">
              {label} <span className="text-slate-500">{w}</span>
            </span>
          ))}
          <span className="text-xs text-slate-700 ml-2">Lucky-conv penalty applied below ₹5K spend</span>
        </div>
      )}

      {/* ── Filter tabs + sort ───────────────────────────────────────────────── */}
      {data && !loading && (
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-1 p-1 bg-white/3 rounded-xl border border-white/5">
            {(["ALL", "ACTIVE", "INACTIVE", "GOOD", "AVERAGE", "BAD"] as FilterKey[]).map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  filter === f
                    ? "bg-white/10 text-white"
                    : "text-slate-500 hover:text-slate-300"
                }`}
              >
                {f === "ALL" ? `All (${s?.total ?? 0})` : f.charAt(0) + f.slice(1).toLowerCase()}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-600">Sort:</span>
            {(["score", "roas", "spend", "ctr"] as SortKey[]).map(sk => (
              <button
                key={sk}
                onClick={() => setSortBy(sk)}
                className={`text-xs px-3 py-1.5 rounded-lg border transition-all ${
                  sortBy === sk
                    ? "bg-indigo-500/20 text-indigo-300 border-indigo-500/30"
                    : "bg-white/3 text-slate-500 border-white/5 hover:text-slate-300"
                }`}
              >
                {sk === "score" ? "Score" : sk.toUpperCase()}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── Creative cards list ──────────────────────────────────────────────── */}
      {loading && (
        <div className="py-24 flex flex-col items-center gap-3 text-slate-600">
          <BarChart2 className="w-8 h-8 animate-pulse" />
          <p className="text-sm">Scoring creatives…</p>
          <p className="text-xs text-slate-700">First run calls AI — may take a few seconds</p>
        </div>
      )}

      {!loading && !selectedBrand && (
        <div className="py-20 text-center text-slate-600 text-sm">
          Select a brand to load creative analysis.
        </div>
      )}

      {!loading && selectedBrand && data && data.creatives.length === 0 && (
        <div className="py-20 text-center text-slate-600 text-sm">
          No creatives with spend found for this brand in the selected date range.
        </div>
      )}

      {!loading && sorted.length > 0 && (
        <div className="space-y-3">
          {sorted.map(c => (
            <CreativeCard
              key={c.ad_id}
              creative={c}
              brandId={selectedBrand}
              dateFrom={range.from}
              dateTo={range.to}
              onReanalyzed={handleReanalyzed}
            />
          ))}
        </div>
      )}

      {!loading && sorted.length === 0 && data && data.creatives.length > 0 && (
        <div className="py-12 text-center text-slate-600 text-sm">
          No creatives match the current filter.
        </div>
      )}

    </div>
  );
}
