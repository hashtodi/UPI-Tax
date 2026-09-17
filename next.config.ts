import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The OG card route reads Geist TTFs off disk at request time. Without this
  // the font files are not traced into the serverless bundle.
  outputFileTracingIncludes: {
    "/api/card": ["./src/fonts/**"],
  },
};

export default nextConfig;
