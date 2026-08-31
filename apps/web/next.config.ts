import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@theta/ui", "@theta/mocks"],
};

export default nextConfig;
