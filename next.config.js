/**
 * Next.js Configuration
 *
 * Purpose: Configure Next.js 16+ with App Router, TypeScript, and optimizations
 * Key Settings:
 * - React strict mode for development warnings
 * - SWC minification for faster builds
 * - Optimized webpack configuration for D3.js and large datasets
 * - Environment variables configuration
 */

/** @type {import('next').NextConfig} */
const nextConfig = {
  /**
   * React Configuration
   * Enable strict mode to catch potential issues during development
   */
  reactStrictMode: true,

  /**
   * Build Optimization
   * Use SWC for faster minification and compilation
   */
  swcMinify: true,

  /**
   * App Router Configuration
   * Explicitly enable App Router (default in Next.js 13+)
   * All routes use src/app directory structure
   */
  appDir: true,

  /**
   * Output Configuration
   * Standalone output for optimized production builds
   * Reduces bundle size and improves deployment
   */
  output: 'standalone',

  /**
   * Image Optimization
   * Configure Next.js Image component for performance
   */
  images: {
    unoptimized: false,
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
  },

  /**
   * Webpack Configuration
   * Optimize for D3.js and large datasets
   */
  webpack: (config, { isServer }) => {
    // Optimize bundle size for D3.js
    config.optimization.minimize = true;

    // Add fallbacks for Node.js modules in browser
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
        crypto: false,
        stream: false,
        util: false,
      };
    }

    // Optimize D3.js module resolution
    config.resolve.alias = {
      ...config.resolve.alias,
      d3: 'd3/dist/d3.min.js',
    };

    return config;
  },

  /**
   * Environment Variables
   * Make environment variables available to the browser
   * NEXT_PUBLIC_ prefix makes them accessible in browser
   */
  env: {
    NEXT_PUBLIC_APP_NAME: 'Markdown to Mind Map Generator',
    NEXT_PUBLIC_APP_VERSION: '0.1.0',
    NEXT_PUBLIC_BUILD_TARGET: 'web',
  },

  /**
   * Experimental Features
   * Enable optimizations for better performance
   */
  experimental: {
    // Optimize package imports for better tree-shaking
    optimizePackageImports: ['d3', '@radix-ui/react-*'],
  },

  /**
   * Compression Configuration
   * Enable gzip compression for production
   */
  compress: true,

  /**
   * Headers Configuration
   * Add security headers for production
   */
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'Permissions-Policy',
            value: 'geolocation=(), microphone=(), camera=()',
          },
        ],
      },
      // Cache static assets for 1 year
      {
        source: '/static/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      // Cache SVG and images for 30 days
      {
        source: '/:path*.(svg|png|jpg|jpeg|gif|webp)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=2592000, must-revalidate',
          },
        ],
      },
    ];
  },

  /**
   * Redirects Configuration
   * Configure URL redirects if needed
   */
  async redirects() {
    return [];
  },

  /**
   * Rewrites Configuration
   * Configure URL rewrites if needed
   */
  async rewrites() {
    return {
      beforeFiles: [],
      afterFiles: [],
      fallback: [],
    };
  },

  /**
   * TypeScript Configuration
   * Enable strict type checking during build
   */
  typescript: {
    tsconfigPath: './tsconfig.json',
    // Fail build on TypeScript errors
    ignoreBuildErrors: false,
  },

  /**
   * ESLint Configuration
   * Run ESLint during build
   */
  eslint: {
    // Fail build on ESLint errors
    ignoreDuringBuilds: false,
  },

  /**
   * Internationalization (i18n)
   * Configure for future multi-language support
   */
  i18n: undefined,

  /**
   * Trailing Slash Configuration
   * Use trailing slashes for consistency
   */
  trailingSlash: false,

  /**
   * Base Path Configuration
   * Set base path for deployment (default: empty for root)
   */
  basePath: '',

  /**
   * Asset Prefix Configuration
   * Configure for CDN deployment (optional)
   */
  assetPrefix: process.env.ASSET_PREFIX || '',
};

module.exports = nextConfig;
