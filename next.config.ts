import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ['zod'],
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  webpack: (config, { isServer }) => {
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
    };
    
    // Add comprehensive aliases for zod imports
    config.resolve.alias = {
      ...config.resolve.alias,
      'zod/v3': 'zod',
      'zod/v3/external': 'zod/external',
      'zod/v3/types': 'zod/types',
      'zod/v3/helpers': 'zod/helpers',
      'zod/v3/lib': 'zod/lib',
    };
    
    // Handle module resolution for zod-to-json-schema
    config.module.rules.push({
      test: /node_modules\/@ai-sdk\/ui-utils\/node_modules\/zod-to-json-schema\/dist\/esm\/.*\.js$/,
      resolve: {
        alias: {
          'zod/v3': 'zod',
        },
      },
    });
    
    return config;
  },
  // Production optimizations
  poweredByHeader: false,
  compress: true,
  generateEtags: true,
  // Security headers
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
        ],
      },
    ];
  },
};

export default nextConfig;
