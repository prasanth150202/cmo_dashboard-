"use client";
import { useState, useEffect, useRef } from "react";
import { Play, Pause, CheckCircle } from "lucide-react";

const STRATEGIES = {
  a: {
    quad: "QUADRANT A",
    title: "Impulse Zone",
    subtitle: "High CTR / High Conv.",
    diagnosisTitle: "Maximum Efficiency Zone",
    diagnosis:
      "Your creative resonance is perfectly aligned with user intent. Every dollar spent is currently at peak velocity.",
    steps: [
      "Increase budget horizontally across lookalike segments.",
      "Test iterative variations of winning 'hooks' only.",
    ],
  },
  b: {
    quad: "QUADRANT B",
    title: "High Intent",
    subtitle: "Low CTR / High Conv.",
    diagnosisTitle: "Trust Barrier Wall",
    diagnosis:
      "Users want the product but face friction. High conversion rates suggest strong value, but low CTR means the ad 'hook' is weak.",
    steps: [
      "Revamp creative thumbnails and first 3 seconds.",
      "A/B test authority-based social proof in ad copy.",
    ],
  },
  c: {
    quad: "QUADRANT C",
    title: "Dead Space",
    subtitle: "Low CTR / Low Conv.",
    diagnosisTitle: "Strategic Exit Point",
    diagnosis:
      "Market mismatch. Neither the message nor the offer is sticking. High friction and low desire leads to wasted spend.",
    steps: [
      "Pause all active sets immediately.",
      "Re-evaluate product-market fit and landing page UX.",
    ],
  },
  d: {
    quad: "QUADRANT D",
    title: "Click Magnet",
    subtitle: "High CTR / Low Conv.",
    diagnosisTitle: "Engagement Trap",
    diagnosis:
      "Clickbait or high curiosity but low intent. People are clicking, but the landing page isn't closing the deal.",
    steps: [
      "Align ad creative closer to the actual offer.",
      "Implement post-click educational funnels to build intent.",
    ],
  },
} as const;

type QuadKey = keyof typeof STRATEGIES;
const TOUR_ORDER: QuadKey[] = ["a", "b", "d", "c"];

// Orb position per quadrant (top-left corner of each cell = center of orb)
const ORB_POS: Record<QuadKey, { top: string; left: string }> = {
  a: { top: "25%", left: "25%" },
  b: { top: "25%", left: "75%" },
  c: { top: "75%", left: "75%" },
  d: { top: "75%", left: "25%" },
};

export default function StrategyMatrixPage() {
  const [active, setActive] = useState<QuadKey>("a");
  const [autoPlay, setAutoPlay] = useState(true);
  const [tourIdx, setTourIdx] = useState(0);
  const [animating, setAnimating] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const selectQuad = (q: QuadKey, fromAuto = false) => {
    if (!fromAuto) stopTour();
    setAnimating(true);
    setTimeout(() => {
      setActive(q);
      setAnimating(false);
    }, 180);
  };

  const startTour = () => {
    intervalRef.current = setInterval(() => {
      setTourIdx(i => {
        const next = (i + 1) % TOUR_ORDER.length;
        selectQuad(TOUR_ORDER[next], true);
        return next;
      });
    }, 3500);
  };

  const stopTour = () => {
    setAutoPlay(false);
    if (intervalRef.current) clearInterval(intervalRef.current);
  };

  const toggleTour = () => {
    if (autoPlay) {
      stopTour();
    } else {
      setAutoPlay(true);
      startTour();
    }
  };

  useEffect(() => {
    startTour();
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, []); // eslint-disable-line

  const s = STRATEGIES[active];
  const orb = ORB_POS[active];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-medium text-white">Strategy Matrix</h1>
        <p className="text-slate-500 mt-1 text-sm">
          CTR × Conversion quadrant analysis · identify where your ads sit
        </p>
      </div>

      {/* ── Quadrant summary cards (top) ─────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {(["a", "b", "c", "d"] as QuadKey[]).map((key) => {
          const data = STRATEGIES[key];
          return (
            <button
              key={key}
              onClick={() => selectQuad(key)}
              className={`p-4 rounded-2xl border text-left transition-all ${
                active === key
                  ? "border-blue-500/30 bg-blue-500/8 ring-1 ring-blue-500/20"
                  : "border-white/5 bg-white/2 hover:border-white/10"
              }`}
            >
              <p className="text-[9px] uppercase tracking-[0.2em] text-slate-600 mb-1">{data.quad}</p>
              <p className={`text-sm font-bold ${active === key ? "text-white" : "text-slate-400"}`}>{data.title}</p>
              <p className="text-[9px] text-slate-600 mt-0.5">{data.subtitle}</p>
            </button>
          );
        })}
      </div>

      <div className="grid lg:grid-cols-2 gap-8 xl:gap-16 items-start">

        {/* ── Left: quadrant grid ───────────────────────────────────────────── */}
        <div className="relative">
          {/* Y-axis label */}
          <div className="absolute -top-8 left-1/2 -translate-x-1/2 flex flex-col items-center text-[10px] uppercase tracking-[0.3em] text-slate-600">
            <span className="mb-1">Motivation</span>
            <span className="text-xs">↑</span>
          </div>
          {/* X-axis label */}
          <div className="absolute top-1/2 -right-4 lg:-right-10 -translate-y-1/2 flex items-center gap-1 text-[10px] uppercase tracking-[0.3em] text-slate-600"
            style={{ writingMode: "vertical-lr", transform: "translateY(-50%) rotate(180deg)" }}>
            <span>Purchase Difficulty</span>
            <span className="text-xs">↑</span>
          </div>

          {/* Grid */}
          <div className="relative aspect-square w-full max-w-[520px] mx-auto border border-white/8 bg-slate-900/40 rounded-xl overflow-hidden">
            {/* Dividers */}
            <div className="absolute inset-0 pointer-events-none">
              <div className="absolute top-1/2 left-0 right-0 h-px bg-white/8" />
              <div className="absolute left-1/2 top-0 bottom-0 w-px bg-white/8" />
            </div>

            {/* Orb */}
            <div
              className="absolute w-7 h-7 -translate-x-1/2 -translate-y-1/2 z-20 pointer-events-none transition-all duration-700 ease-in-out"
              style={{ top: orb.top, left: orb.left }}
            >
              <div className="w-full h-full rounded-full bg-blue-500 shadow-[0_0_18px_rgba(59,130,246,0.8)] flex items-center justify-center">
                <div className="w-2 h-2 bg-white rounded-full animate-ping" />
              </div>
            </div>

            {/* Quadrants */}
            {(["a", "b", "d", "c"] as QuadKey[]).map((q) => {
              const isActive = active === q;
              const qd = STRATEGIES[q];
              return (
                <button
                  key={q}
                  onClick={() => selectQuad(q)}
                  className={`absolute flex flex-col p-4 sm:p-6 text-left transition-all duration-300
                    ${q === "a" ? "top-0 left-0 w-1/2 h-1/2" : ""}
                    ${q === "b" ? "top-0 right-0 w-1/2 h-1/2" : ""}
                    ${q === "d" ? "bottom-0 left-0 w-1/2 h-1/2" : ""}
                    ${q === "c" ? "bottom-0 right-0 w-1/2 h-1/2" : ""}
                    ${isActive ? "bg-blue-500/8" : "hover:bg-white/3"}
                  `}
                >
                  <span className={`text-[9px] sm:text-[10px] font-bold tracking-[0.2em] transition-colors ${isActive ? "text-blue-400" : "text-white/20"}`}>
                    {qd.quad}
                  </span>
                  <div className="mt-auto">
                    <div className={`text-sm sm:text-base lg:text-lg font-bold mb-0.5 transition-colors ${isActive ? "text-white" : "text-slate-400"}`}>
                      {qd.title}
                    </div>
                    <div className="text-[9px] uppercase tracking-widest text-slate-600">
                      {qd.subtitle}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Axis labels */}
          <div className="flex justify-between mt-3 px-2 text-[10px] uppercase tracking-[0.2em] text-slate-700">
            <span>Difficult</span>
            <span>Easy</span>
          </div>
        </div>

        {/* ── Right: dynamic insight panel ─────────────────────────────────── */}
        <div className="rounded-2xl border border-white/8 bg-slate-900/50 p-6 sm:p-8 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-48 h-48 bg-blue-500/8 blur-3xl -mr-16 -mt-16 pointer-events-none" />

          <p className="text-[10px] uppercase tracking-[0.4em] text-blue-400 mb-6">Dynamic Insights</p>

          <div
            className={`space-y-6 transition-all duration-200 ${animating ? "opacity-0 translate-y-1" : "opacity-100 translate-y-0"}`}
          >
            {/* Diagnosis */}
            <div>
              <p className="text-[10px] font-bold text-slate-600 mb-2 tracking-[0.3em]">DIAGNOSIS</p>
              <h3 className="text-xl sm:text-2xl font-bold text-white mb-2">{s.diagnosisTitle}</h3>
              <p className="text-slate-400 text-sm leading-relaxed">{s.diagnosis}</p>
            </div>

            {/* Strategy */}
            <div>
              <p className="text-[10px] font-bold text-slate-600 mb-3 tracking-[0.3em]">OPTIMIZATION STRATEGY</p>
              <ul className="space-y-3">
                {s.steps.map((step, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <CheckCircle className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
                    <span className="text-slate-300 text-sm">{step}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Footer: auto-tour toggle */}
          <div className="mt-8 pt-6 border-t border-white/5 flex items-center justify-between">
            <div className={`flex items-center gap-2 text-[10px] uppercase tracking-widest transition-opacity ${autoPlay ? "text-white/30 opacity-100" : "opacity-0"}`}>
              <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
              Auto-Touring Matrix
            </div>
            <button
              onClick={toggleTour}
              className="flex items-center gap-1.5 text-[10px] uppercase tracking-widest text-slate-500 hover:text-white transition-colors"
            >
              {autoPlay
                ? <><Pause className="w-3 h-3" /> Pause Tour</>
                : <><Play className="w-3 h-3" /> Resume Tour</>}
            </button>
          </div>
        </div>
      </div>

    </div>
  );
}
