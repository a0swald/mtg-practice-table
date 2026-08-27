import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'MTG Practice Table',
    short_name: 'MTG Table',
    description: 'Mobile-first Commander practice companion',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    background_color: '#090b0d',
    theme_color: '#090b0d',
    orientation: 'any',
    icons: [
      {
        src: '/icon.svg',
        sizes: 'any',
        type: 'image/svg+xml',
        purpose: 'any maskable',
      },
    ],
  };
}
