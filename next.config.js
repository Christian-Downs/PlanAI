const withPWA = require("next-pwa")({
  dest: "public",
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === "development",
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  serverExternalPackages: ["cheerio", "node-ical"],
  experimental: {
    instrumentationHook: false,
  },
  // Disable tracing in development
  trailingSlash: false,
  generateEtags: false,
};

module.exports = withPWA(nextConfig);
