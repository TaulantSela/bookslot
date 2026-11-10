import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // This example lives inside the BookSlot repo; keep Next from treating the
  // parent folder as the project root.
  turbopack: { root: __dirname },
  // Don't write an AGENTS.md into the example.
  agentRules: false,
};

export default nextConfig;
