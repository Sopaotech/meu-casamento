import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  poweredByHeader: false,
  // Allow one 5 MiB image plus multipart form overhead.
  experimental: { serverActions: { bodySizeLimit: '5.1mb' } },
};

export default nextConfig;
