"use client";
import { useState } from "react";
import { Settings, Save, Shield, Zap, Bell, Key, CheckCircle } from "lucide-react";

export default function ConfigPage() {
  const [saved, setSaved] = useState(false);
  const [config, setConfig] = useState({
    targetRoas: "3.0",
    maxBudgetChangePct: "30",
    cooldownHours: "24",
    emergencyStop: false,
    aiNarratives: true,
    emailAlerts: false,
    slackWebhook: "",
    channel: "META",
  });

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  const Section = ({ title, icon: Icon, children }: any) => (
    <div className="p-6 bg-white/5 border border-white/5 rounded-3xl space-y-5">
      <div className="flex items-center gap-3 pb-4 border-b border-white/5">
        <div className="p-2 bg-indigo-500/10 rounded-xl border border-indigo-500/10">
          <Icon className="w-4 h-4 text-indigo-400" />
        </div>
        <h2 className="font-medium text-slate-200">{title}</h2>
      </div>
      {children}
    </div>
  );

  const Field = ({ label, desc, children }: any) => (
    <div className="flex items-start justify-between gap-8">
      <div>
        <p className="font-medium text-slate-200 text-sm">{label}</p>
        <p className="text-xs text-slate-500 mt-0.5">{desc}</p>
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );

  const Toggle = ({ value, onChange }: any) => (
    <button onClick={() => onChange(!value)}
      className={`w-12 h-6 rounded-full transition-all relative ${value ? "bg-indigo-500" : "bg-white/10"}`}>
      <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${value ? "left-7" : "left-1"}`} />
    </button>
  );

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-medium text-white">⚙️ Controls & Config</h1>
          <p className="text-slate-500 mt-1">Rule engine thresholds, guardrails, and notification settings</p>
        </div>
        <button onClick={handleSave}
          className="flex items-center gap-2 px-6 py-3 bg-indigo-500 text-white rounded-2xl font-medium text-sm hover:bg-indigo-600 transition-all shadow-lg shadow-indigo-500/20">
          {saved ? <><CheckCircle className="w-4 h-4" /> Saved!</> : <><Save className="w-4 h-4" /> Save Config</>}
        </button>
      </div>

      {/* Emergency Stop */}
      <div className={`p-5 rounded-2xl border flex items-center justify-between ${config.emergencyStop ? "bg-red-500/10 border-red-500/30" : "bg-white/5 border-white/5"}`}>
        <div className="flex items-center gap-4">
          <Shield className={`w-6 h-6 ${config.emergencyStop ? "text-red-400" : "text-slate-500"}`} />
          <div>
            <p className="font-medium text-slate-200">🚨 Emergency Stop</p>
            <p className="text-xs text-slate-500">{config.emergencyStop ? "ALL rule executions are halted." : "Normal operation — rules are executing."}</p>
          </div>
        </div>
        <Toggle value={config.emergencyStop} onChange={(v: boolean) => setConfig({ ...config, emergencyStop: v })} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Section title="Rule Engine Thresholds" icon={Zap}>
          <Field label="Target ROAS" desc="Minimum ROAS before scale-up triggers (META-B01)">
            <input type="number" value={config.targetRoas}
              onChange={e => setConfig({ ...config, targetRoas: e.target.value })}
              className="w-24 px-3 py-2 bg-black/30 border border-white/10 rounded-xl text-white text-sm font-medium text-right focus:outline-none focus:border-indigo-500" />
          </Field>
          <Field label="Max Budget Change %" desc="Hard cap on budget changes per cycle (Guardrail #01)">
            <input type="number" value={config.maxBudgetChangePct}
              onChange={e => setConfig({ ...config, maxBudgetChangePct: e.target.value })}
              className="w-24 px-3 py-2 bg-black/30 border border-white/10 rounded-xl text-white text-sm font-medium text-right focus:outline-none focus:border-indigo-500" />
          </Field>
          <Field label="Cooldown Period (hrs)" desc="Hours to wait before re-actioning same entity (Guardrail #02)">
            <input type="number" value={config.cooldownHours}
              onChange={e => setConfig({ ...config, cooldownHours: e.target.value })}
              className="w-24 px-3 py-2 bg-black/30 border border-white/10 rounded-xl text-white text-sm font-medium text-right focus:outline-none focus:border-indigo-500" />
          </Field>
        </Section>

        <Section title="Features" icon={Settings}>
          <Field label="AI Narratives" desc="Gemini-powered reasoning for every suggestion">
            <Toggle value={config.aiNarratives} onChange={(v: boolean) => setConfig({ ...config, aiNarratives: v })} />
          </Field>
          <Field label="Email Alerts" desc="Send digest emails on P1 fire alarms">
            <Toggle value={config.emailAlerts} onChange={(v: boolean) => setConfig({ ...config, emailAlerts: v })} />
          </Field>
          <Field label="Primary Channel" desc="Default channel for the Overview dashboard">
            <select value={config.channel} onChange={e => setConfig({ ...config, channel: e.target.value })}
              className="px-3 py-2 bg-black/30 border border-white/10 rounded-xl text-white text-sm font-medium focus:outline-none focus:border-indigo-500">
              <option>META</option><option>GOOGLE</option><option>ALL</option>
            </select>
          </Field>
        </Section>

        <Section title="API Keys" icon={Key}>
          <div className="space-y-3">
            {[
              { label: "Supabase URL", placeholder: "https://xxx.supabase.co", type: "text" },
              { label: "Meta System Token", placeholder: "EAAWu5vc...", type: "password" },
              { label: "Gemini API Key", placeholder: "AIza...", type: "password" },
            ].map(({ label, placeholder, type }) => (
              <div key={label}>
                <p className="text-xs font-medium text-slate-500 mb-1.5 uppercase tracking-wider">{label}</p>
                <input type={type} placeholder={placeholder}
                  className="w-full px-3 py-2.5 bg-black/30 border border-white/10 rounded-xl text-white text-sm font-mono focus:outline-none focus:border-indigo-500 placeholder-slate-700" />
              </div>
            ))}
          </div>
          <p className="text-[10px] text-slate-600">⚠️ Editing here is UI only. Update your actual .env file for persistent changes.</p>
        </Section>

        <Section title="Notifications" icon={Bell}>
          <Field label="Slack Webhook" desc="Receive P1 alerts and weekly digests in Slack">
            <input type="url" placeholder="https://hooks.slack.com/..." value={config.slackWebhook}
              onChange={e => setConfig({ ...config, slackWebhook: e.target.value })}
              className="w-64 px-3 py-2 bg-black/30 border border-white/10 rounded-xl text-white text-sm font-mono focus:outline-none focus:border-indigo-500 placeholder-slate-700" />
          </Field>
        </Section>
      </div>
    </div>
  );
}
