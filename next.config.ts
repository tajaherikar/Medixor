import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Standalone output for Electron bundling
  output: 'standalone',
  
  // Optimize images for desktop
  images: {
    unoptimized: true,
  },
  
  // Allow access from Electron
  allowedDevOrigins: ['192.168.43.96'],
};

export default nextConfig;
