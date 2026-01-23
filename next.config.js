// next.config.js
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
    return config;
  },
}

module.exports = nextConfig