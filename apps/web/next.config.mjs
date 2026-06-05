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
};

export default nextConfig;
