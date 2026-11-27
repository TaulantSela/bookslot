import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.tsx"],
  format: ["esm", "cjs"],
  dts: true,
  clean: true,
  target: "es2019",
  tsconfig: "tsconfig.json",
  external: ["react"],
  // The "use client" directive in src/index.tsx is kept in the output, so
  // Next.js server components can import the component directly.
});
