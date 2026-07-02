import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'http://127.0.0.1:3001/api/:path*',
      },
      {
        source: '/api-docs/:path*',
        destination: 'http://127.0.0.1:3001/api-docs/:path*',
      },
      {
        source: '/api-docs',
        destination: 'http://127.0.0.1:3001/api-docs',
      }
    ];
  },
};

export default nextConfig;
