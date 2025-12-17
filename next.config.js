/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
        port: '',
        pathname: '/**',
      },
    ],
  },
  // Empty turbopack config to silence the warning
  turbopack: {},
  productionBrowserSourceMaps: false,
  compiler: {
    removeConsole: false,
  },
  experimental: {
    optimizeCss: false,
  },
}

module.exports = nextConfig