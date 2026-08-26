import './globals.css';
import type { Metadata, Viewport } from 'next';
import UtilityOrientationKeyboard from '@/components/UtilityOrientationKeyboard';

export const metadata: Metadata = { title: 'MTG Practice Table', description: 'Mobile-first Commander practice companion' };
export const viewport: Viewport = { width: 'device-width', initialScale: 1, viewportFit: 'cover', themeColor: '#111315' };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}<UtilityOrientationKeyboard /></body></html>;
}
