"use client";

import { useState } from "react";

// A mailto link alone fails for anyone whose browser hands mailto: to a mail
// account they can't use here (a work Outlook, no mail app set up), so the
// address is always visible and copyable too.
export function UpgradeContact({ email, shopSlug }: { email: string; shopSlug: string }) {
  const [copy, setCopy] = useState<"idle" | "copied" | "failed">("idle");
  const subject = encodeURIComponent(`BookSlot Pro for ${shopSlug}`);

  async function copyAddress() {
    try {
      await navigator.clipboard.writeText(email);
      setCopy("copied");
    } catch {
      setCopy("failed");
    }
  }

  return (
    <div className="mt-4 text-sm text-zinc-600">
      <p>
        Want the Pro options? Email{" "}
        <a href={`mailto:${email}?subject=${subject}`} className="font-medium text-blue-600 hover:underline">
          {email}
        </a>{" "}
        <button
          type="button"
          onClick={copyAddress}
          className="rounded-md border border-zinc-300 px-2 py-0.5 text-xs text-zinc-700 hover:bg-zinc-50"
        >
          {copy === "copied" ? "Copied" : "Copy"}
        </button>{" "}
        and mention your shop, <span className="font-mono text-zinc-800">{shopSlug}</span>.
      </p>
      {copy === "failed" && (
        <p className="mt-1 text-xs text-zinc-500">Couldn’t copy automatically. Select the address above instead.</p>
      )}
    </div>
  );
}
