import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // /demo/barbershop reads this file at request time.
  outputFileTracingIncludes: {
    "/demo/barbershop": ["./examples/html-free/index.html"],
  },
  async headers() {
    return [
      {
        // Everything except the embed refuses to be framed (stops clickjacking
        // on the dashboard). The embed's own policy is set in src/proxy.ts.
        source: "/((?!embed/).*)",
        headers: [
          { key: "Content-Security-Policy", value: "frame-ancestors 'none'" },
          { key: "X-Frame-Options", value: "DENY" },
        ],
      },
    ];
  },
};

export default nextConfig;
