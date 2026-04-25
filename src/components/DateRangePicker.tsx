"use client";
import { useState, useRef, useEffect, useCallback } from "react";
import { Calendar, ChevronDown } from "lucide-react";

export type DateRange = {
  from: string;   // YYYY-MM-DD
  to: string;     // YYYY-MM-DD
  label: string;
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmt(d: Date) {
  return d.toISOString().slice(0, 10);
}
function today() { return fmt(new Date()); }
function daysAgo(n: number) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return fmt(d);
}
function startOfMonth() {
  const d = new Date();
  return fmt(new Date(d.getFullYear(), d.getMonth(), 1));
}
function startOfLastMonth() {
  const d = new Date();
  return fmt(new Date(d.getFullYear(), d.getMonth() - 1, 1));
}
function endOfLastMonth() {
  const d = new Date();
  return fmt(new Date(d.getFullYear(), d.getMonth(), 0));
}

export const PRESETS = [
  { label: "Today",        from: () => today(),            to: () => today() },
  { label: "Yesterday",    from: () => daysAgo(1),         to: () => daysAgo(1) },
  { label: "Last 7 Days",  from: () => daysAgo(6),         to: () => today() },
  { label: "Last 14 Days", from: () => daysAgo(13),        to: () => today() },
  { label: "Last 30 Days", from: () => daysAgo(29),        to: () => today() },
  { label: "Last 90 Days", from: () => daysAgo(89),        to: () => today() },
  { label: "This Month",   from: () => startOfMonth(),     to: () => today() },
  { label: "Last Month",   from: () => startOfLastMonth(), to: () => endOfLastMonth() },
];

/** Returns a default "Last 7 Days" range */
export function defaultRange(): DateRange {
  return { from: daysAgo(6), to: today(), label: "Last 7 Days" };
}

const LS_KEY = "cmo_date_range";

/**
 * Global persistent date range hook.
 * Reads from localStorage on mount so the same range is shared across all pages
 * and survives refresh. Write once on any page — all pages see it.
 *
 * Returns [range, setRange, hydrated] where hydrated=true once localStorage has
 * been read. Use hydrated to gate API calls so they don't fire with the default
 * range before the stored range has been applied.
 */
export function useDateRange(): [DateRange, (r: DateRange) => void, boolean] {
  const [range, setRangeState] = useState<DateRange>(defaultRange);
  const [hydrated, setHydrated] = useState(false);

  // Hydrate from localStorage after mount (avoids SSR mismatch)
  useEffect(() => {
    try {
      const stored = localStorage.getItem(LS_KEY);
      if (stored) {
        const p = JSON.parse(stored) as DateRange;
        if (p.from && p.to && p.label) setRangeState(p);
      }
    } catch {}
    setHydrated(true);
  }, []);

  const setRange = useCallback((r: DateRange) => {
    setRangeState(r);
    try { localStorage.setItem(LS_KEY, JSON.stringify(r)); } catch {}
  }, []);

  return [range, setRange, hydrated];
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function DateRangePicker({
  value,
  onChange,
}: {
  value: DateRange;
  onChange: (range: DateRange) => void;
}) {
  const [open, setOpen] = useState(false);
  const [showCustom, setShowCustom] = useState(false);
  const [customFrom, setCustomFrom] = useState(value.from);
  const [customTo, setCustomTo] = useState(value.to);
  const ref = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const applyPreset = (preset: (typeof PRESETS)[0]) => {
    const from = preset.from();
    const to = preset.to();
    onChange({ from, to, label: preset.label });
    setCustomFrom(from);
    setCustomTo(to);
    setShowCustom(false);
    setOpen(false);
  };

  const applyCustom = () => {
    if (!customFrom || !customTo || customFrom > customTo) return;
    onChange({
      from: customFrom,
      to: customTo,
      label: `${customFrom} → ${customTo}`,
    });
    setOpen(false);
  };

  const isCustomActive = !PRESETS.find((p) => p.label === value.label);

  return (
    <div ref={ref} className="relative">
      {/* Trigger button */}
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2.5 px-4 py-2.5 bg-card border border-border rounded-xl hover:bg-muted transition-all text-sm font-medium text-foreground select-none shadow-sm"
      >
        <Calendar className="w-4 h-4 text-primary shrink-0" />
        <span className="max-w-[200px] truncate">{value.label}</span>
        <ChevronDown
          className={`w-3.5 h-3.5 text-muted-foreground transition-transform shrink-0 ${open ? "rotate-180" : ""}`}
        />
      </button>

      {/* Dropdown panel */}
      {open && (
        <div className="absolute top-full mt-2 right-0 z-50 w-72 bg-card border border-border rounded-2xl shadow-2xl overflow-hidden">
          {/* Preset list */}
          <div className="p-2 space-y-0.5">
            {PRESETS.map((p) => {
              const active = value.label === p.label;
              return (
                <button
                  key={p.label}
                  onClick={() => applyPreset(p)}
                  className={`w-full flex items-center justify-between px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
                    active
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  }`}
                >
                  <span>{p.label}</span>
                  {active && (
                    <span className="text-[10px] font-mono text-primary/70 shrink-0 ml-2">
                      {value.from} → {value.to}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Custom range section */}
          <div className="border-t border-border">
            <button
              onClick={() => setShowCustom((s) => !s)}
              className={`w-full flex items-center justify-between px-5 py-3 text-sm font-medium transition-all ${
                showCustom || isCustomActive
                  ? "text-primary bg-primary/5"
                  : "text-muted-foreground hover:bg-muted"
              }`}
            >
              <span className="flex items-center gap-2">
                Custom Range
                {isCustomActive && (
                  <span className="w-1.5 h-1.5 rounded-full bg-primary inline-block" />
                )}
              </span>
              <ChevronDown
                className={`w-3.5 h-3.5 transition-transform ${showCustom ? "rotate-180" : ""}`}
              />
            </button>

            {showCustom && (
               <div className="px-4 pb-4 space-y-3">
                 <div className="grid grid-cols-2 gap-2">
                   <div>
                     <label className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground mb-1.5 block">
                       From
                     </label>
                     <input
                       type="date"
                       value={customFrom}
                       max={customTo || today()}
                       onChange={(e) => setCustomFrom(e.target.value)}
                       className="w-full px-3 py-2 bg-background border border-border rounded-xl text-foreground text-xs font-mono focus:outline-none focus:border-primary [color-scheme:dark] dark:[color-scheme:dark]"
                     />
                   </div>
                   <div>
                     <label className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground mb-1.5 block">
                       To
                     </label>
                     <input
                       type="date"
                       value={customTo}
                       min={customFrom}
                       max={today()}
                       onChange={(e) => setCustomTo(e.target.value)}
                       className="w-full px-3 py-2 bg-background border border-border rounded-xl text-foreground text-xs font-mono focus:outline-none focus:border-primary [color-scheme:dark] dark:[color-scheme:dark]"
                     />
                   </div>
                 </div>

                 {customFrom && customTo && customFrom > customTo && (
                   <p className="text-[11px] text-destructive font-medium">
                     "From" must be before "To"
                   </p>
                 )}

                 <button
                   onClick={applyCustom}
                   disabled={!customFrom || !customTo || customFrom > customTo}
                   className="w-full py-2.5 bg-primary rounded-xl text-primary-foreground text-xs font-medium uppercase tracking-widest hover:bg-primary-hover transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                 >
                   Apply Range
                 </button>
               </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
