/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  trailingSlash: true,
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "*.convex.cloud" },
      { protocol: "https", hostname: "ui-avatars.com" },
    ],
  },
  async rewrites() {
    return [
      {
        source: '/api/:path*.php',
        destination: 'http://127.0.0.1:8000/api/:path*.php', // Point to local PHP server over SSH Tunnel
      },
    ]
  },
};

module.exports = nextConfig;
