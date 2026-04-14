/** @type {import('next').NextConfig} */
const nextConfig = {
  // sharp ships a prebuilt native binary — keep it out of the Turbopack
  // server bundle so it's `require`'d at runtime instead.
  serverExternalPackages: ["sharp"],
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "hfse.edu.sg",
        pathname: "/wp-content/uploads/**",
      },
      {
        protocol: "https",
        hostname: "enrol.hfse.edu.sg",
        pathname: "/assets/**",
      },
    ],
  },
};

module.exports = nextConfig;
