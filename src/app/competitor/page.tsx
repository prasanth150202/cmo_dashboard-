"use client";
import { Search, TrendingUp, TrendingDown, BarChart } from "lucide-react";

const COMPETITORS = [
  { name: "Mivi", est_spend: "₹12-18L/mo", channels: ["META", "GOOGLE"], strength: "Strong UGC creative", weakness: "Low brand search" },
  { name: "boAt", est_spend: "₹80-120L/mo", channels: ["META", "GOOGLE", "YT"], strength: "Mass reach, high freq", weakness: "High CPA on performance" },
  { name: "Noise", est_spend: "₹25-40L/mo", channels: ["META", "DV360"], strength: "Creator partnerships", weakness: "Weak retargeting" },
];

export default function CompetitorPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-medium text-white">🔍 Competitor Intelligence</h1>
        <p className="text-slate-500 mt-1">Market positioning, estimated spend signals, and strategic gaps</p>
      </div>

      <div className="p-5 bg-amber-500/5 border border-amber-500/20 rounded-2xl flex items-center gap-3">
        <Search className="w-5 h-5 text-amber-400 shrink-0" />
        <p className="text-sm text-amber-200">This module uses Meta Ad Library + third-party signals. Data shown is estimated for intelligence purposes only.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {COMPETITORS.map((c) => (
          <div key={c.name} className="p-6 bg-white/5 border border-white/5 rounded-3xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-medium text-white">{c.name}</h3>
              <div className="flex gap-1">
                {c.channels.map(ch => (
                  <span key={ch} className="text-[9px] font-medium bg-indigo-500/10 text-indigo-400 px-1.5 py-0.5 rounded">{ch}</span>
                ))}
              </div>
            </div>
            <div>
              <p className="text-xs text-slate-500 uppercase font-medium mb-1">Est. Monthly Spend</p>
              <p className="text-2xl font-medium text-white">{c.est_spend}</p>
            </div>
            <div className="space-y-2 pt-3 border-t border-white/5">
              <div className="flex items-start gap-2">
                <TrendingUp className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />
                <p className="text-sm text-slate-300"><span className="text-emerald-400 font-medium">Strength: </span>{c.strength}</p>
              </div>
              <div className="flex items-start gap-2">
                <TrendingDown className="w-4 h-4 text-red-400 mt-0.5 shrink-0" />
                <p className="text-sm text-slate-300"><span className="text-red-400 font-medium">Gap: </span>{c.weakness}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="p-6 bg-indigo-500/5 border border-indigo-500/20 rounded-3xl">
        <div className="flex items-center gap-3 mb-4">
          <BarChart className="w-5 h-5 text-indigo-400" />
          <h2 className="text-lg font-medium text-slate-200">Your Positioning</h2>
        </div>
        <p className="text-sm text-slate-400 leading-relaxed">
          Based on current signals, <span className="text-white font-medium">your brand is competitive on performance ROAS</span> but may have room to increase brand awareness investment. 
          Competitors like boAt are running high-frequency brand campaigns — consider a parallel upper-funnel push to defend branded search volumes.
        </p>
      </div>
    </div>
  );
}
