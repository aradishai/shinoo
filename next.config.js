/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'media.api-sports.io' },
      { protocol: 'https', hostname: 'flagcdn.com' },
      { protocol: 'https', hostname: 'upload.wikimedia.org' },
    ],
  },
  async headers() {
    return [
      {
        source: '/:file(.*\\.(?:png|jpg|jpeg|webp|avif|svg|ico|gif))',
        headers: [{ key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }],
      },
    ]
  },
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.externals = [...(config.externals || []), 'better-sqlite3']
    }
    return config
  },
}

module.exports = nextConfig
