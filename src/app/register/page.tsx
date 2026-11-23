import type { Metadata } from "next";
import { AuthShell } from "@/components/auth-shell";
import { RegisterForm } from "@/components/register-form";
import { currencyLabel, listCurrencies, listTimeZones } from "@/lib/regional";

export const metadata: Metadata = { title: "Create your booking page" };

export default function RegisterPage() {
  // Lists come from the server so the form renders the same on both sides.
  return (
    <AuthShell>
      <RegisterForm
        timezones={listTimeZones()}
        currencies={listCurrencies().map((code) => ({ value: code, label: currencyLabel(code) }))}
      />
    </AuthShell>
  );
}
