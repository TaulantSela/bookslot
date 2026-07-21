"use client";

import Link from "next/link";
import { useActionState } from "react";
import { loginAction, type ActionState } from "@/lib/actions";
import { Button, Card, Input, Label } from "@/components/ui";

export function LoginForm() {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(
    loginAction,
    {},
  );

  return (
    <Card className="w-full max-w-md">
      <h1 className="text-2xl font-semibold text-zinc-900">Log in</h1>
      <p className="mt-1 text-sm text-zinc-600">Manage your booking widget</p>

      <form action={formAction} className="mt-6 space-y-4">
        <div>
          <Label htmlFor="email">Email</Label>
          <Input id="email" name="email" type="email" required />
        </div>
        <div>
          <Label htmlFor="password">Password</Label>
          <Input id="password" name="password" type="password" required />
        </div>
        {state.error && (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
            {state.error}
          </p>
        )}
        <Button type="submit" className="w-full" disabled={pending}>
          {pending ? "Logging in…" : "Log in"}
        </Button>
      </form>

      <p className="mt-4 text-center text-sm text-zinc-600">
        No account?{" "}
        <Link href="/register" className="text-blue-600 hover:underline">
          Start free
        </Link>
      </p>
    </Card>
  );
}
