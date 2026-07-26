import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [new URL('https://*.zoom.us/**')],
  },
};

export default nextConfig;
