const path = require('path');

/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },
  // Disable all optimizations
  swcMinify: false,
  compiler: {
    removeConsole: false,
  },
  webpack: (config, { dev }) => {
    if (!dev) {
      config.optimization.minimize = false;
    }
    
    // Add alias resolution for @ symbol
    config.resolve.alias = {
      ...config.resolve.alias,
      '@': path.resolve(__dirname),
    };
    
    return config;
  },
}

module.exports = nextConfig
