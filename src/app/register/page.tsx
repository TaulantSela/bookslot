import { RegisterForm } from "@/components/register-form";
import { currencyLabel, listCurrencies, listTimeZones } from "@/lib/regional";

export default function RegisterPage() {
  // Lists come from the server so the form renders the same on both sides.
  return (
    <main className="flex min-h-screen items-center justify-center bg-zinc-50 px-4 py-10">
      <RegisterForm
        timezones={listTimeZones()}
        currencies={listCurrencies().map((code) => ({ value: code, label: currencyLabel(code) }))}
      />
    </main>
  );
}
