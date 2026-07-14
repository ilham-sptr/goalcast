/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: { serverComponentsExternalPackages: ['@injectivelabs/sdk-ts'] }
};
module.exports = nextConfig;
