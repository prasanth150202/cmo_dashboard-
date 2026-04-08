"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, Brain, BarChart2, Palette,
  Search, Settings, FileText, DollarSign, Zap, Tag
} from "lucide-react";

const NAV = [
  { href: "/", icon: LayoutDashboard, label: "Overview" },
  { href: "/brands", icon: Tag, label: "Brand Manager" },
  { href: "/ai-suggestions", icon: Brain, label: "Rule Engine" },
  { href: "/analytics", icon: BarChart2, label: "Analytics" },
  { href: "/creative", icon: Palette, label: "Creative" },
  { href: "/competitor", icon: Search, label: "Competitor" },
  { href: "/budget", icon: DollarSign, label: "Budget Pace" },
  { href: "/reports", icon: FileText, label: "Reports" },
  { href: "/config", icon: Settings, label: "Config" },
];

export default function Sidebar() {
  const path = usePathname();
  return (
    <aside className="fixed left-0 top-0 h-full w-64 bg-card/80 border-r border-border backdrop-blur-xl z-50 flex flex-col shadow-sm">
      {/* Logo */}
      <div className="p-6 border-b border-border">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-primary rounded-xl flex items-center justify-center shadow-md shadow-primary/20">
            <Zap className="text-primary-foreground fill-current w-4 h-4" />
          </div>
          <div>
            <p className="text-sm font-medium text-foreground tracking-tight">CMO Dashboard</p>
            <p className="text-[10px] text-primary font-medium uppercase tracking-widest">Script Bot v5.0</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 p-4 space-y-0.5 overflow-y-auto">
        {NAV.map(({ href, icon: Icon, label }) => {
          const active = path === href;
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all group ${
                active
                  ? "bg-primary/10 text-primary border border-primary/20"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              }`}
            >
              <Icon className={`w-4 h-4 shrink-0 ${active ? "text-primary" : "text-muted-foreground group-hover:text-foreground"}`} />
              {label}
              {active && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-primary shrink-0" />}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-border">
        <div className="px-4 py-3 bg-emerald-500/10 border border-emerald-500/10 dark:border-emerald-500/20 rounded-xl">
          <p className="text-[10px] font-medium text-emerald-600 dark:text-emerald-400 uppercase tracking-widest mb-0.5">Engine Status</p>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-500 dark:bg-emerald-400 animate-pulse" />
            <p className="text-xs text-emerald-700 dark:text-emerald-300 font-medium">Active · 9 Modules</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
