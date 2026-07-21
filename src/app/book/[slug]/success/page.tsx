import Link from "next/link";
import { Card } from "@/components/ui";

export default async function BookingSuccessPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ appt?: string }>;
}) {
  const { slug } = await params;

  return (
    <main className="flex min-h-screen items-center justify-center bg-zinc-50 px-4">
      <Card className="max-w-md text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-green-100 text-green-700">
          ✓
        </div>
        <h1 className="mt-4 text-2xl font-semibold text-zinc-900">Booked!</h1>
        <p className="mt-2 text-sm text-zinc-600">
          Your appointment is confirmed. If you entered an email, you&apos;ll receive a confirmation shortly.
        </p>
        <Link
          href={`/book/${slug}`}
          className="mt-6 inline-block text-sm text-blue-600 hover:underline"
        >
          Book another appointment
        </Link>
      </Card>
    </main>
  );
}
