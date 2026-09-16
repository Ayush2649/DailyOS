/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: ["lh3.googleusercontent.com", "firebasestorage.googleapis.com"],
  },
  experimental: {
    serverComponentsExternalPackages: ["firebase-admin", "web-push"],
  },
};

export default nextConfig;
