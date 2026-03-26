/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Turbopack is default in Next 16
  turbopack: {
    root: '.',
  },
};

module.exports = nextConfig;