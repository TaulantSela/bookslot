"use client";

import Link from "next/link";
import { useActionState } from "react";
import { registerAction, type ActionState } from "@/lib/actions";
import { Button, Card, Input, Label } from "@/components/ui";

export function RegisterForm() {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(
    registerAction,
    {},
  );

  return (
    <Card className="w-full max-w-md">
      <h1 className="text-2xl font-semibold text-zinc-900">Start free</h1>
      <p className="mt-1 text-sm text-zinc-600">
        Create your booking page in under 2 minutes
      </p>

      <form action={formAction} className="mt-6 space-y-4">
        <div>
          <Label htmlFor="name">Your name</Label>
          <Input id="name" name="name" required />
        </div>
        <div>
          <Label htmlFor="shopName">Business name</Label>
          <Input id="shopName" name="shopName" placeholder="Ana Beauty Salon" required />
        </div>
        <div>
          <Label htmlFor="email">Email</Label>
          <Input id="email" name="email" type="email" required />
        </div>
        <div>
          <Label htmlFor="password">Password</Label>
          <Input id="password" name="password" type="password" minLength={8} required />
        </div>
        {state.error && (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
            {state.error}
          </p>
        )}
        <Button type="submit" className="w-full" disabled={pending}>
          {pending ? "Creating…" : "Create account"}
        </Button>
      </form>

      <p className="mt-4 text-center text-sm text-zinc-600">
        Already have an account?{" "}
        <Link href="/login" className="text-blue-600 hover:underline">
          Log in
        </Link>
      </p>
    </Card>
  );
}
