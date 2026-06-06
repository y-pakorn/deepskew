import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // three.js ships untranspiled ESM that Turbopack/Next needs to process.
  transpilePackages: ["three"],
  // sharp is a native module (used to JPEG-compress the OG cards); keep it
  // external so the server build does not try to bundle its .node binaries.
  serverExternalPackages: ["sharp"],
  // The OG/Twitter image routes read vendored fonts from src/lib/og/fonts at
  // runtime; keep them in the serverless trace for every route.
  outputFileTracingIncludes: {
    "/**": ["./src/lib/og/fonts/*.ttf"],
  },
};

export default nextConfig;
