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
  webpack: (config, { dev, isServer }) => {
    // Disable CSS minification in production
    if (!dev && !isServer) {
      config.optimization.minimizer = config.optimization.minimizer.filter(
        (minimizer) => {
          // Remove CSS minimizer
          return !minimizer.constructor.name.includes('CssMinimizerPlugin');
        }
      );
    }
    return config;
  },
}

module.exports = nextConfig