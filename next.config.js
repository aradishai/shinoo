/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: ['media.api-sports.io', 'flagcdn.com', 'upload.wikimedia.org'],
  },
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.externals = [...(config.externals || []), 'better-sqlite3']
    }
    return config
  },
}

module.exports = nextConfig
