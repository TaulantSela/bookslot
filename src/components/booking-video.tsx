"use client";

import { useEffect, useRef } from "react";

/**
 * A client booking on the real Lakeside Barbers page, on a phone
 * (recorded by scripts/record-demo.mts). Muted and inline so phones autoplay
 * it; paused with controls for people who asked for reduced motion.
 */
export function BookingVideo() {
  const ref = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = ref.current;
    if (video && window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      video.pause();
      video.controls = true;
    }
  }, []);

  return (
    <div className="relative isolate mx-auto w-[260px] shrink-0 sm:w-[280px]">
      <div
        aria-hidden="true"
        className="absolute -inset-10 -z-10 rounded-full bg-[radial-gradient(closest-side,var(--color-brand-200),transparent)] opacity-70"
      />
      <div className="rounded-[2.6rem] border border-zinc-800 bg-zinc-950 p-2.5 shadow-2xl shadow-zinc-900/30">
        <video
          ref={ref}
          autoPlay
          muted
          loop
          playsInline
          preload="metadata"
          poster="/demo/booking-poster.webp"
          width={390}
          height={780}
          aria-label="A client books a haircut and beard trim at Lakeside Barbers on a phone: picks the service, a barber, a day and a time, types their name, phone and email, and confirms."
          className="block h-auto w-full rounded-[2.1rem] bg-white"
        >
          <source src="/demo/booking.webm" type="video/webm" />
          <source src="/demo/booking.mp4" type="video/mp4" />
        </video>
      </div>
    </div>
  );
}
