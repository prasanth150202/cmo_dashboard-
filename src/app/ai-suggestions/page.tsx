"use client";
import { useEffect, useState } from "react";
import axios from "axios";
import { Brain, TrendingUp, TrendingDown, AlertCircle, CheckCircle, Clock, Zap } from "lucide-react";
import { motion } from "framer-motion";

const API = "http://localhost:8000/api/v1";

export default function AISuggestionsPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axios.get(`${API}/dashboard/summary`).then(r => { setData(r.data); setLoading(false); });
  }, []);

  const suggestions = data?.suggestions || [];
  const pending = suggestions.filter((s: any) => !s.status || s.status === "PENDING");
  const emergency = suggestions.filter((s: any) => s.type === "EMERGENCY_STOP");

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-medium text-white">🤖 AI Suggestions Engine</h1>
        <p className="text-slate-500 mt-1">Autonomous decisions powered by Rule Engine v5.0 + Gemini</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: "Total Suggestions", value: suggestions.length, color: "indigo" },
          { label: "Pending Review", value: pending.length, color: "amber" },
          { label: "Emergency Stops", value: emergency.length, color: "red" },
          { label: "Engine Confidence", value: "87%", color: "emerald" },
        ].map(({ label, value, color }) => (
          <div key={label} className={`p-5 bg-${color}-500/5 border border-${color}-500/10 rounded-2xl`}>
            <p className="text-xs font-medium text-slate-500 uppercase tracking-widest mb-2">{label}</p>
            <p className={`text-3xl font-medium text-${color}-400`}>{loading ? "..." : value}</p>
          </div>
        ))}
      </div>

      {/* Suggestions List */}
      <div className="space-y-3">
        {loading ? (
          <div className="py-20 text-center text-slate-500">Loading engine output...</div>
        ) : suggestions.length === 0 ? (
          <div className="py-20 text-center text-slate-500 border border-dashed border-white/5 rounded-3xl">
            <Brain className="w-12 h-12 mx-auto mb-4 opacity-10" />
            <p>No suggestions firing. All campaigns within threshold.</p>
          </div>
        ) : (
          suggestions.map((s: any, i: number) => (
            <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}>
              <SuggestionRow suggestion={s} />
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
}

function SuggestionRow({ suggestion: s }: { suggestion: any }) {
  const [approved, setApproved] = useState(false);
  const isEmergency = s.type === "EMERGENCY_STOP";
  const isUp = s.direction === "UP";

  return (
    <div className={`p-6 rounded-2xl border flex items-center justify-between gap-6 ${
      approved ? "bg-emerald-500/10 border-emerald-500/20" :
      isEmergency ? "bg-red-500/5 border-red-500/20" : "bg-white/5 border-white/5"
    }`}>
      <div className="flex items-center gap-5 flex-1">
        <div className={`w-11 h-11 rounded-xl flex items-center justify-center border ${
          isEmergency ? "bg-red-500/10 border-red-500/20" : "bg-indigo-500/10 border-indigo-500/10"
        }`}>
          {isEmergency ? <AlertCircle className="text-red-400 w-5 h-5" /> :
           isUp ? <TrendingUp className="text-indigo-400 w-5 h-5" /> :
           <TrendingDown className="text-amber-400 w-5 h-5" />}
        </div>
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-medium bg-white/10 px-1.5 py-0.5 rounded text-slate-400 uppercase">{s.rule_id}</span>
            <span className="text-[10px] text-indigo-400 font-medium">{s.priority}</span>
          </div>
          <p className="font-medium text-slate-200">{s.entity_name}</p>
          <p className="text-xs text-slate-500 mt-0.5 italic">"{s.reason}"</p>
        </div>
      </div>
      <div className="flex items-center gap-3 shrink-0">
        <span className={`text-xs font-medium px-3 py-1 rounded-full ${
          isUp ? "bg-indigo-500/10 text-indigo-400" : "bg-red-500/10 text-red-400"
        }`}>{s.type} {s.magnitude}%</span>
        {approved ? (
          <div className="flex items-center gap-2 text-emerald-400 text-sm font-medium">
            <CheckCircle className="w-4 h-4" /> Approved
          </div>
        ) : (
          <>
            <button onClick={() => setApproved(true)} className={`px-5 py-2 rounded-xl text-xs font-medium transition-all ${
              isEmergency ? "bg-red-500 text-white hover:bg-red-600" : "bg-white text-black hover:bg-indigo-400 hover:text-white"
            }`}>
              {isEmergency ? "KILL NOW" : "Approve"}
            </button>
            <button className="px-4 py-2 border border-white/10 rounded-xl text-xs font-medium text-slate-400 hover:bg-white/5">
              Reject
            </button>
          </>
        )}
      </div>
    </div>
  );
}
