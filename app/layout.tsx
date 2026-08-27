import './globals.css';
import type { Metadata, Viewport } from 'next';
import SharedTableHud from '@/components/SharedTableHud';
import UtilitySwipeAssist from '@/components/UtilitySwipeAssist';

export const metadata: Metadata = {
  title: 'MTG Practice Table',
  description: 'Mobile-first Commander practice companion',
  manifest: '/manifest.webmanifest',
  appleWebApp: {
    capable: true,
    title: 'MTG Table',
    statusBarStyle: 'black-translucent',
  },
  icons: {
    icon: '/icon.svg',
    apple: '/icon.svg',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
  themeColor: '#090b0d',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}<SharedTableHud /><UtilitySwipeAssist /></body></html>;
}
