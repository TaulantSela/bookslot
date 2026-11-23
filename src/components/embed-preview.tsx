"use client";

import { useEffect, useRef, useState } from "react";

/**
 * The embed in an iframe that grows with its content, using the `resize`
 * messages the widget sends on every plan (src/components/booking-widget.tsx).
 */
export function EmbedPreview({ src, initialHeight = 760 }: { src: string; initialHeight?: number }) {
  const ref = useRef<HTMLIFrameElement>(null);
  const [height, setHeight] = useState(initialHeight);

  useEffect(() => {
    function onMessage(event: MessageEvent) {
      if (event.source !== ref.current?.contentWindow) return;
      const data = event.data;
      if (!data || data.source !== "bookslot" || data.type !== "resize") return;
      if (typeof data.height === "number" && data.height > 0) {
        setHeight(Math.ceil(data.height));
      }
    }
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, []);

  return (
    <iframe
      ref={ref}
      src={src}
      style={{ height }}
      className="w-full max-w-md rounded-2xl border border-zinc-200 transition-[height]"
      title="Booking widget preview"
    />
  );
}
