import type { NextConfig } from "next";

// Run from the repo root with `npm run example:pro`. The example uses the
// main repo's dependencies, so BookSlot's /demo/dental page (which renders
// this same site) and the example share one copy of React. The script uses
// webpack: Turbopack rooted at the repo would also pick up BookSlot's
// src/proxy.ts.
const nextConfig: NextConfig = {
  // Don't write an AGENTS.md into the example.
  agentRules: false,
};

export default nextConfig;
