import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: [
    "@reown/appkit",
    "@reown/appkit-adapter-wagmi",
    "@reown/appkit/networks",
  ],
  experimental: {
    esmExternals: "loose",
  },
};

export default nextConfig;
