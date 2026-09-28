import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["pg", "unpdf", "mammoth"],
  // Rubric, JDs and schema are read from disk at runtime
  outputFileTracingIncludes: { "/**": ["./data/**", "./db/**"] },
};

export default nextConfig;
