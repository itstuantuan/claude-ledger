import type { NextConfig } from 'next';
if (process.env.NODE_ENV === 'production' && process.env.NEXT_PUBLIC_API_MODE === 'mock' && process.env.ALLOW_LOCAL_MOCK_BUILD !== 'true') {
  throw new Error('Mock is disabled in production. Use real API mode, or explicitly allow a localhost-only preview.');
}
const config: NextConfig = { devIndicators: false, turbopack: { root: process.cwd() }, outputFileTracingRoot: process.cwd() };
export default config;
