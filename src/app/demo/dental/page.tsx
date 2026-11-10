import type { Metadata } from "next";
import {
  ClinicSite,
  examplePatient,
} from "../../../../examples/nextjs-pro/app/clinic-site";

export const metadata: Metadata = {
  title: "Bright Smile Dental · BookSlot demo",
  description: "A Next.js clinic website using the BookSlot widget on the Pro plan.",
};

// The exact site from examples/nextjs-pro, served by BookSlot itself.
export default function DentalDemoPage() {
  return <ClinicSite patient={examplePatient} bookslotUrl="" />;
}
