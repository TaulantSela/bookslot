import { BookingSection } from "./booking-section";
import type { BookSlotCustomer } from "./bookslot-widget";
import styles from "./clinic.module.css";

// Stands in for the signed-in user. In a real app it comes from your auth session.
export const examplePatient = {
  name: "Arta Selmani",
  email: "arta.selmani@example.com",
  phone: "070 123 456",
};

/**
 * The whole clinic website. Rendered by this example's page and, unchanged,
 * by BookSlot's own /demo/dental page.
 */
export function ClinicSite({
  patient,
  bookslotUrl,
}: {
  patient: BookSlotCustomer & { name: string };
  /** Where BookSlot runs. An empty string means this same site. */
  bookslotUrl: string;
}) {
  return (
    <div className={styles.site}>
      <header className={styles.topbar}>
        <span className={styles.logo}>
          <span className={styles.logoMark}>B</span> Buzëqeshja Dental
        </span>
        <nav className={styles.nav}>
          <a href="#book">Book</a>
          <a href="#team">Team</a>
          <a href="#contact">Contact</a>
        </nav>
        <span className={styles.account}>Signed in as {patient.name}</span>
      </header>

      <section className={styles.hero}>
        <h1>Gentle, modern dentistry in Struga</h1>
        <p>Check-ups, whitening and family care. Book online in under a minute.</p>
      </section>

      <BookingSection patient={patient} bookslotUrl={bookslotUrl} />

      <footer id="contact" className={styles.footer}>
        Buzëqeshja Dental Clinic · Struga · +389 70 333 444
      </footer>
    </div>
  );
}
