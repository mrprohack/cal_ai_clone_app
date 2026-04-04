/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  trailingSlash: true,
  // Disable server-side features not compatible with static export
  eslint: { ignoreDuringBuilds: true },
  typescript: { ignoreBuildErrors: true },
  images: {
    unoptimized: true, // required for static export
    remotePatterns: [
      { protocol: "https", hostname: "*.convex.cloud" },
      { protocol: "https", hostname: "ui-avatars.com" },
    ],
  },
  // Note: rewrites() is incompatible with output:'export' — removed.
  // API calls go to /api/*.php which Apache handles via .htaccess.
};

module.exports = nextConfig;
