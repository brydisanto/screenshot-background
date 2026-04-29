/** @type {import('next').NextConfig} */
const BASE_PATH = "/framery";

const nextConfig = {
  basePath: BASE_PATH,
  env: {
    NEXT_PUBLIC_BASE_PATH: BASE_PATH,
  },
  async redirects() {
    return [
      // Bare Vercel URL → /framery so the project still loads at the canonical path
      { source: "/", destination: "/framery", permanent: false, basePath: false },
    ];
  },
};

module.exports = nextConfig;
