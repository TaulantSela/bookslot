import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getSession, requireUserShop } from "@/lib/auth";

// Shared by the dashboard's server actions. Deliberately not a "use server"
// module: these helpers must not be callable from the browser on their own.

export type ActionState = {
  error?: string;
  success?: string;
};

/** The signed-in owner's shop; sends anyone else to the login page. */
export async function requireOwnerShop() {
  const session = await getSession();
  if (!session) redirect("/login");
  return requireUserShop(session.userId);
}

// Dashboard pages read straight from the database, so every dashboard
// mutation refreshes them; otherwise the UI keeps showing the old values.
export function refreshDashboard() {
  revalidatePath("/dashboard", "layout");
}

/** First validation message of a failed zod parse, for showing in a form. */
export function firstIssue(error: { issues: { message: string }[] }, fallback: string) {
  const message = error.issues[0]?.message;
  return message && !message.startsWith("Invalid") && !message.startsWith("Too")
    ? message
    : fallback;
}
