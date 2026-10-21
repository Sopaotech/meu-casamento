import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  poweredByHeader: false,
  // Keep the private source copy out of production traces.
  outputFileTracingExcludes: { '/*': ['./.local-media/c008-landing/**/*'] },
  // Allow one 5 MiB image plus multipart form overhead.
  experimental: { serverActions: { bodySizeLimit: '5.1mb' } },
};

export default nextConfig;
