/** @type {import('next').NextConfig} */
const apiOrigin = process.env.NEXT_PUBLIC_API_BASE_URL || "http://127.0.0.1:4000";
const apiBase = apiOrigin.endsWith("/api") ? apiOrigin : `${apiOrigin}/api`;

const nextConfig = {
  transpilePackages: ["@lending/shared"],
  async rewrites() {
    return [
      {
        source: "/backend/:path*",
        destination: `${apiBase}/:path*`
      }
    ];
  }
};

export default nextConfig;
