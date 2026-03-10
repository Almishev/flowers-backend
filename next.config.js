/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'travel-agency-toni.s3.amazonaws.com',
      },
      {
        protocol: 'https',
        hostname: 'travel-agency-toni.s3.eu-central-1.amazonaws.com',
      },
      {
        protocol: 'https',
        hostname: '**.s3.amazonaws.com',
      },
      {
        protocol: 'https',
        hostname: '**.s3.*.amazonaws.com',
      },
    ],
  },
  // Важно: Позволява на Sharp да работи правилно в Vercel (Linux)
  // Sharp е native модул и трябва да се третира като external package
  experimental: {
    serverComponentsExternalPackages: ['sharp'],
  },
  // Включва Sharp в output tracing за Vercel
  outputFileTracingIncludes: {
    '/api/upload': ['./node_modules/sharp/**/*'],
  },
  // Увеличаваме лимита за API routes (в MB)
  // Забележка: Vercel все още има ограничение от 4.5MB за request body
  // За по-големи файлове трябва да се използва streaming или presigned URLs
}

module.exports = nextConfig
