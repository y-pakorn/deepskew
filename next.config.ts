import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // three.js ships untranspiled ESM that Turbopack/Next needs to process.
  transpilePackages: ["three"],
};

export default nextConfig;
