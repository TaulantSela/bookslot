"use client";

import { useActionState, useState } from "react";
import { saveEmbedDomainsAction, type ActionState } from "@/lib/actions";
import { Button, Label, Textarea } from "@/components/ui";

export function EmbedDomainsForm({ domains }: { domains: string[] }) {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(
    saveEmbedDomainsAction,
    {},
  );
  // Controlled so a rejected save keeps what the owner typed (React resets
  // uncontrolled fields after every form action).
  const [value, setValue] = useState(domains.join("\n"));

  return (
    <form action={formAction} className="mt-4 space-y-3">
      <div>
        <Label htmlFor="domains">Allowed websites (one per line)</Label>
        <Textarea
          id="domains"
          name="domains"
          rows={3}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={"example.com\n*.example.com"}
        />
        <p className="mt-1.5 text-xs text-zinc-500">
          Leave empty to allow any website. Use *.example.com to include
          subdomains.
        </p>
      </div>
      {state.error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {state.error}
        </p>
      )}
      {state.success && (
        <p className="rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700">
          {state.success}
        </p>
      )}
      <Button type="submit" disabled={pending}>
        {pending ? "Saving…" : "Save websites"}
      </Button>
    </form>
  );
}
