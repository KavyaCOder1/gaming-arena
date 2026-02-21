import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        // Allow the pacman static files to be served in an iframe on the same origin
        source: "/pacman/:path*",
        headers: [
          // Allow same-origin iframe embedding
          { key: "X-Frame-Options",              value: "SAMEORIGIN" },
          // Permissive CSP just for the pacman assets so the game scripts run freely
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
              "font-src 'self' https://fonts.gstatic.com data:",
              "img-src 'self' data: blob:",
              "media-src 'self' blob: data:",
              "connect-src 'self'",
            ].join("; "),
          },
        ],
      },
      {
        // Next.js app pages — keep default strict headers but allow same-origin frames
        source: "/((?!pacman).*)",
        headers: [
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
        ],
      },
    ];
  },
};

export default nextConfig;
