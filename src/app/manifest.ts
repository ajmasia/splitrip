import type { MetadataRoute } from 'next'

/**
 * What a home screen needs to treat this as an application rather than a bookmark.
 *
 * `display: 'standalone'` is what drops the address bar. The colours are the paper of the light
 * palette rather than the brand green: they paint the window chrome and the launch screen, and a
 * green frame around a page that is not green reads as a mistake rather than as branding. Android
 * reads them; iOS takes its own route through the `apple-mobile-web-app-*` meta tags.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: '/',
    name: 'Splitrip',
    short_name: 'Splitrip',
    description: 'Shared travel expenses, settled in seconds.',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    background_color: '#edefec',
    theme_color: '#edefec',
    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      {
        // Filled to the edges, because a launcher crops this one to its own shape.
        src: '/icon-maskable-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
  }
}
