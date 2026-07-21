import { confirmCancelAction } from "@/lib/actions";
import { Card } from "@/components/ui";

export default async function CancelConfirmPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const result = await confirmCancelAction(token);

  return (
    <main className="flex min-h-screen items-center justify-center bg-zinc-50 px-4">
      <Card className="max-w-md text-center">
        {"error" in result && result.error ? (
          <>
            <h1 className="text-xl font-semibold text-zinc-900">Not found</h1>
            <p className="mt-2 text-sm text-zinc-600">{result.error}</p>
          </>
        ) : (
          <>
            <h1 className="text-xl font-semibold text-zinc-900">Appointment cancelled</h1>
            <p className="mt-2 text-sm text-zinc-600">Your appointment has been cancelled.</p>
          </>
        )}
      </Card>
    </main>
  );
}
