"use client";

import { startTransition, useActionState, useRef, useState } from "react";
import { createApiKeyAction, type ApiKeyState } from "@/lib/developer-actions";
import { Button, Input, Label } from "@/components/ui";

/** Creates an API key and shows it once, with a copy button. */
export function NewApiKeyForm() {
  const [state, dispatch, pending] = useActionState<ApiKeyState, FormData>(createApiKeyAction, {});
  const [copied, setCopied] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <div className="mt-4 space-y-3">
      <form
        ref={formRef}
        className="flex flex-wrap items-end gap-3"
        onSubmit={(event) => {
          event.preventDefault();
          const formData = new FormData(event.currentTarget);
          setCopied(false);
          startTransition(() => dispatch(formData));
          formRef.current?.reset();
        }}
      >
        <div className="w-full max-w-xs">
          <Label htmlFor="api-key-name">Name</Label>
          <Input id="api-key-name" name="name" placeholder="Website backend" maxLength={60} />
        </div>
        <Button type="submit" disabled={pending}>
          {pending ? "Creating…" : "Create key"}
        </Button>
      </form>

      {state.error && (
        <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {state.error}
        </p>
      )}
      {state.key && (
        <div role="status" className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
          <p>{state.success}</p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <code className="break-all rounded bg-white px-2 py-1 text-xs text-zinc-900">{state.key}</code>
            <Button
              type="button"
              variant="secondary"
              className="px-2 py-1 text-xs"
              onClick={() => {
                void navigator.clipboard?.writeText(state.key!).then(() => setCopied(true));
              }}
            >
              {copied ? "Copied" : "Copy"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
