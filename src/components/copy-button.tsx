"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

/** Copies `value` to the clipboard and briefly confirms it. */
export function CopyButton({ value, className }: { value: string; className?: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard blocked (e.g. insecure origin): the text is still selectable.
    }
  }

  return (
    <button
      type="button"
      onClick={copy}
      className={cn(
        "shrink-0 rounded-md border border-zinc-200 bg-white px-2.5 py-1 text-xs font-medium text-zinc-700 transition hover:border-zinc-300 hover:bg-zinc-50",
        copied && "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-50",
        className,
      )}
    >
      <span aria-live="polite">{copied ? "Copied" : "Copy"}</span>
    </button>
  );
}
