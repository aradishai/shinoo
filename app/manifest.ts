import { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'SHINOO!',
    short_name: 'SHINU',
    description: 'תחרות ניחושי מונדיאל עם חברים',
    start_url: '/',
    display: 'standalone',
    background_color: '#0a0a0a',
    theme_color: '#00C853',
  }
}
