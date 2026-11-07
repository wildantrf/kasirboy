import type { NextConfig } from 'next';
const config: NextConfig = { serverExternalPackages: ['node:sqlite'], devIndicators: false, allowedDevOrigins: ['192.168.1.7'] };
export default config;
