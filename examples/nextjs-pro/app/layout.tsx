import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Buzëqeshja Dental · Struga",
  description: "BookSlot example: Next.js site on the Pro plan",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
