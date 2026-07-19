/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: [
    "@injectivelabs/sdk-ts",
    "@injectivelabs/networks",
    "@injectivelabs/utils",
    "@injectivelabs/core-proto-ts-v2"
  ]
};
module.exports = nextConfig;
