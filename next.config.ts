import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* Code splitting and bundle optimization */
  productionBrowserSourceMaps: false, // Disable source maps in production to reduce bundle size
  
  /* Turbopack automatically handles minification and modern browser targeting */
};

export default nextConfig;
