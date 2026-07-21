import { confirmCancelAction } from "@/lib/actions";
import { Button, Card } from "@/components/ui";

export default async function CancelPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  async function confirm() {
    "use server";
    await confirmCancelAction(token);
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-zinc-50 px-4">
      <Card className="max-w-md text-center">
        <h1 className="text-xl font-semibold text-zinc-900">Cancel appointment?</h1>
        <p className="mt-2 text-sm text-zinc-600">
          This will free up your time slot. You can book again anytime.
        </p>
        <form action={confirm} className="mt-6">
          <Button type="submit" variant="danger">
            Yes, cancel appointment
          </Button>
        </form>
      </Card>
    </main>
  );
}
