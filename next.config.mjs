/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // sweph / swisseph are native addons (.node). They must stay outside the
  // bundle or the server build will try to parse the binary. This covers both
  // Turbopack (the Next 16 default) and webpack.
  serverExternalPackages: ['sweph', 'swisseph'],
};

export default nextConfig;
