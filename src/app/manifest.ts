import { MetadataRoute } from 'next'
 
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'InventoMax',
    short_name: 'InventoMax',
    description: 'Your Complete Inventory Management Solution',
    start_url: '/',
    display: 'standalone',
    background_color: '#F0FFF0',
    theme_color: '#90EE90',
    icons: [
      {
        src: '/icons/icon-192x192.png',
        sizes: '192x192',
        type: 'image/png',
      },
      {
        src: '/icons/icon-512x512.png',
        sizes: '512x512',
        type: 'image/png',
      },
    ],
  }
}