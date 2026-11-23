import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const title = "BookSlot — Booking page and widget for any business";
const description =
  "Let clients book appointments online. A booking page, embeddable widget, reminders and schedule management for any business that sells its time.";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"),
  // Pages set a short title ("Log in") and get " · BookSlot" appended.
  title: { default: title, template: "%s · BookSlot" },
  description,
  openGraph: { title, description, siteName: "BookSlot", type: "website" },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full`}>
      <body className="min-h-full bg-zinc-50 font-sans text-zinc-900 antialiased">
        {children}
      </body>
    </html>
  );
}
