import type { NextConfig } from 'next';

const nextConfig: NextConfig = process.env.VITALCKM_AZURE_BUILD === '1'
  ? { output: 'export' }
  : {};

export default nextConfig;
