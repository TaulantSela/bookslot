import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.tsx"],
  format: ["esm", "cjs"],
  // tsup 8 always passes `baseUrl` to its .d.ts build, which TypeScript 6.0
  // rejects unless deprecations are ignored (tsup 9 drops it).
  dts: { compilerOptions: { ignoreDeprecations: "6.0" } },
  clean: true,
  target: "es2019",
  tsconfig: "tsconfig.json",
  external: ["react"],
  // The "use client" directive in src/index.tsx is kept in the output, so
  // Next.js server components can import the component directly.
});
