import type { NextConfig } from "next";

const backendUrl = process.env.BACKEND_URL || 'http://backend:3001';

const nextConfig: NextConfig = {
  trailingSlash: true,
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: `${backendUrl}/api/:path*`,
      },
      {
        source: '/api-docs/:path*',
        destination: `${backendUrl}/api-docs/:path*`,
      },
      {
        source: '/api-docs',
        destination: `${backendUrl}/api-docs`,
      }
    ];
  },
};

export default nextConfig;
