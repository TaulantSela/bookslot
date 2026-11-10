import { BookingSection } from "./booking-section";

// In a real app this comes from your auth session.
const patient = {
  name: "Ana Petrovska",
  email: "ana.petrovska@example.com",
  phone: "070 123 456",
};

export default function Home() {
  return (
    <>
      <header className="topbar">
        <span className="logo">
          <span className="logo-mark">S</span> Smile Dental
        </span>
        <nav>
          <a href="#book">Book</a>
          <a href="#team">Team</a>
          <a href="#contact">Contact</a>
        </nav>
        <span className="account">Signed in as {patient.name}</span>
      </header>

      <section className="hero">
        <h1>Gentle, modern dentistry in Struga</h1>
        <p>Check-ups, whitening and family care. Book online in under a minute.</p>
      </section>

      <BookingSection patient={patient} />

      <footer id="contact">Smile Dental Clinic · Struga · +389 70 333 444</footer>
    </>
  );
}
