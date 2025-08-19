import type {Metadata} from 'next';
import './globals.css';
import { Toaster } from "@/components/ui/toaster"
import { EscapeHandler } from '@/components/escape-handler';

export const metadata: Metadata = {
  title: 'InventoMax',
  description: 'Your Complete Inventory Management Solution',
  manifest: '/manifest.json',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;700&display=swap" rel="stylesheet" />
        <link rel="apple-touch-icon" href="/icons/icon-192x192.png" />
        <script>{`
          if ('serviceWorker' in navigator) {
            window.addEventListener('load', () => {
              navigator.serviceWorker.register('/sw.js')
                .then(registration => {
                  console.log('Service Worker registered:', registration);
                })
                .catch(registrationError => {
                  console.log('Service Worker registration failed:', registrationError);
                });
            });
          }
        `}</script>
      </head>
      <body className="font-body antialiased">
        <EscapeHandler />
        <main>{children}</main>
        <Toaster />
      </body>
    </html>
  );
}
