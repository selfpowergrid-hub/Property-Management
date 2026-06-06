/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Workspace packages are shipped as TypeScript source; transpile them here.
  transpilePackages: ["@nyumba360/shared", "@nyumba360/supabase"],
  // Keep react-pdf (native font/stream deps) out of the bundler so the receipt
  // route handlers run it directly in the Node runtime.
  experimental: {
    serverComponentsExternalPackages: ["@react-pdf/renderer"],
  },
  // Production hardening (PRD §9 security). Applied to every response.
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
