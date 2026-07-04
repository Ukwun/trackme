/** @type {import('next').NextConfig} */
const nextConfig = {
  outputFileTracingRoot: __dirname,
  // Existing legacy lint debt is tracked separately; type checking still runs.
  eslint: { ignoreDuringBuilds: true },
};

module.exports = nextConfig;
