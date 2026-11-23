"use client";

import { useId, useState } from "react";
import { cn } from "@/lib/utils";

export type CodeTab = { label: string; file: string; code: string };

/** A dark code window with tabs, for the landing page's embed examples. */
export function CodeTabs({ tabs }: { tabs: CodeTab[] }) {
  const [active, setActive] = useState(0);
  const id = useId();
  const tab = tabs[active];

  return (
    <div className="overflow-hidden rounded-2xl border border-white/10 bg-zinc-950 shadow-2xl shadow-brand-950/40">
      <div className="flex items-center gap-4 border-b border-white/10 px-4">
        <div className="flex gap-1.5" aria-hidden="true">
          <span className="size-2.5 rounded-full bg-white/15" />
          <span className="size-2.5 rounded-full bg-white/15" />
          <span className="size-2.5 rounded-full bg-white/15" />
        </div>
        <div role="tablist" aria-label="Embed options" className="flex">
          {tabs.map((t, index) => (
            <button
              key={t.label}
              type="button"
              role="tab"
              id={`${id}-tab-${index}`}
              aria-selected={index === active}
              aria-controls={`${id}-panel`}
              onClick={() => setActive(index)}
              className={cn(
                "-mb-px border-b-2 px-3 py-3 text-sm transition",
                index === active
                  ? "border-brand-400 text-white"
                  : "border-transparent text-zinc-400 hover:text-zinc-200",
              )}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>
      <div
        role="tabpanel"
        id={`${id}-panel`}
        aria-labelledby={`${id}-tab-${active}`}
        className="relative"
      >
        <p className="px-5 pt-4 font-mono text-xs text-zinc-500">{tab.file}</p>
        <pre className="overflow-x-auto px-5 pt-2 pb-6 font-mono text-[13px] leading-relaxed text-zinc-100">
          <code>{tab.code}</code>
        </pre>
      </div>
    </div>
  );
}
