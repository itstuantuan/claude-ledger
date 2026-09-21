import type { Metadata } from 'next';
import localFont from 'next/font/local';
import './globals.css';
import './store.css';
import { Providers } from './providers';
const sans = localFont({ src: '../../public/fonts/sans.woff2', variable: '--font-sans', display: 'swap', weight: '300 800' });
const serif = localFont({ src: '../../public/fonts/serif.woff2', variable: '--font-serif', display: 'swap', weight: '300 800' });
export const metadata: Metadata = { title: { default: 'Ledger Console', template: '%s · Ledger Console' }, description: '油漆与建材门店经营管理工作空间' };
export default function RootLayout({ children }: Readonly<{children: React.ReactNode}>) {
  return <html lang="zh-CN" className={`${sans.variable} ${serif.variable}`}><body><Providers>{children}</Providers></body></html>;
}
