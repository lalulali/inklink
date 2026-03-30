import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'InkLink | Minimalist Mind Mapping',
    short_name: 'InkLink',
    description: 'Beautiful, professional mind mapping directly from your markdown documents.',
    start_url: '/',
    display: 'standalone',
    background_color: '#0f172a', // deep slate/black
    theme_color: '#1e293b',      // deep slate
    icons: [
      {
        src: '/favicon.png',
        sizes: 'any',
        type: 'image/png',
      },
      {
        src: '/favicon.png', 
        sizes: '192x192',
        type: 'image/png',
        purpose: 'maskable',
      },
      {
        src: '/favicon.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
  };
}
