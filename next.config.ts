import type { NextConfig } from "next";

const nextConfig: any = {
  output: 'standalone',
  typescript: {
    ignoreBuildErrors: true,
  },
  serverActions: {
    bodySizeLimit: '10mb',
  },
};

export default nextConfig;
