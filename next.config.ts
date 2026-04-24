
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // ✅ Fix for Leaflet "Map container is already initialized." in dev (StrictMode double-mount)
  reactStrictMode: false,

  output: "standalone",

  typescript: {
    ignoreBuildErrors: true,
  },

  eslint: {
    ignoreDuringBuilds: true,
  },

  experimental: {
    serverActions: {
      bodySizeLimit: "20mb", // increase if needed (ex: "6mb")
    },
  },

  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "placehold.co",
        port: "",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "images.unsplash.com",
        port: "",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "picsum.photos",
        port: "",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "storage.googleapis.com",
        port: "",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "firebasestorage.googleapis.com",
        port: "",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "encrypted-tbn0.gstatic.com",
        port: "",
        pathname: "/**",
      },
    ],
  },
  async headers() {
    return [
      {
        // Apply these headers to all routes in your application.
        source: '/:path*',
        headers: [
          {
            key: 'Cache-Control',
            // This is a common strategy for balancing freshness and performance.
            // s-maxage=1: CDNs cache for 1 second.
            // stale-while-revalidate=2592000: CDN can serve stale content for 30 days while revalidating.
            value: 'public, s-maxage=1, stale-while-revalidate=2592000',
          },
        ],
      },
      {
        // More aggressive caching for static assets.
        source: '/_next/static/(.*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
    ];
  },
};

export default nextConfig;
