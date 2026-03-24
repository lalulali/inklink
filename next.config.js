/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  // Enable App Router
  experimental: {
    // App Router is now stable in Next.js 14+
  },
  // Optimize for D3.js and large datasets
  webpack: (config) => {
    // Handle d3 module resolution
    config.resolve.alias = {
      ...config.resolve.alias,
    };
    return config;
  },
};

module.exports = nextConfig;