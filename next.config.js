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
  webpack: (config, { dev, isServer }) => {
    if (!dev) {
      config.optimization.minimize = false;
    }

    // Add alias resolution for @ symbol
    config.resolve.alias = {
      ...config.resolve.alias,
      '@': path.resolve(__dirname),
    };

    // Neon's driver uses `ws`, which has optional native bindings
    // (bufferutil, utf-8-validate). Webpack bundling them breaks the
    // native binary and causes "bufferUtil.mask is not a function".
    // Leave them as plain require() calls at runtime instead.
    if (isServer) {
      config.externals.push("bufferutil", "utf-8-validate");
    }

    return config;
  },

  experimental: {
    serverComponentsExternalPackages: ["embedded-postgres"],
  },
}

module.exports = nextConfig