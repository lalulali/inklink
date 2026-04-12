/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Turbopack is default in Next 16
  turbopack: {
    root: '.',
  },
  // Required for Docker standalone deployment
  output: 'standalone',
};

module.exports = nextConfig;