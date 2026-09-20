import type { Metadata } from 'next';
import localFont from 'next/font/local';
import './globals.css';
const sans = localFont({ src: '../../public/fonts/sans.woff2', variable: '--font-sans', display: 'swap', weight: '300 800' });
const serif = localFont({ src: '../../public/fonts/serif.woff2', variable: '--font-serif', display: 'swap', weight: '300 800' });
export const metadata: Metadata = { title: 'Claude Console · Interface Preview', description: 'A local interface prototype built with Next.js and React.' };
export default function RootLayout({ children }: Readonly<{children: React.ReactNode}>) {
  return <html lang="en" className={`${sans.variable} ${serif.variable}`}><body>{children}</body></html>;
}

