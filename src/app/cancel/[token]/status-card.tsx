import { Card } from "@/components/ui";

export function CancelStatusCard({
  title,
  children,
}: {
  title: string;
  children?: React.ReactNode;
}) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-zinc-50 px-4">
      <Card className="max-w-md text-center">
        <h1 className="text-xl font-semibold text-zinc-900">{title}</h1>
        {children}
      </Card>
    </main>
  );
}

export function contactShopText(shopName: string, shopPhone: string | null) {
  return shopPhone
    ? `Please call ${shopName} on ${shopPhone}.`
    : `Please contact ${shopName} directly.`;
}
