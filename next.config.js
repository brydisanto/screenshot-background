/** @type {import('next').NextConfig} */
const nextConfig = {
  basePath: "/framery",
  async redirects() {
    return [
      // Bare Vercel URL → /framery so the project still loads at the canonical path
      { source: "/", destination: "/framery", permanent: false, basePath: false },
    ];
  },
};

module.exports = nextConfig;
