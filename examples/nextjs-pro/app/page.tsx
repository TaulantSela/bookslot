import { ClinicSite, examplePatient } from "./clinic-site";

export default function Home() {
  return (
    <ClinicSite
      patient={examplePatient}
      bookslotUrl={process.env.NEXT_PUBLIC_BOOKSLOT_URL ?? "http://localhost:3000"}
    />
  );
}
