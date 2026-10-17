import type { Metadata } from 'next';
import { Geist } from 'next/font/google';
import { ShopFrame } from '@/components/ShopFrame';
import { SiteFooter } from '@/components/SiteFooter';
import { SiteHeader } from '@/components/SiteHeader';
import './globals.css';

const geist = Geist({ subsets: ['latin'], variable: '--font-brand' });

export const metadata: Metadata = {
  title: { default: 'Trama', template: '%s · Trama' },
  description: 'Tienda de ropa casual y de vestir para hombre y mujer.',
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es" className={geist.variable}>
      <body className="flex min-h-dvh flex-col bg-bg font-sans text-fg antialiased">
        <a
          href="#contenido"
          className="sr-only rounded-control bg-accent px-4 py-3 text-accent-fg focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-10"
        >
          Saltar al contenido
        </a>
        <ShopFrame header={<SiteHeader />} footer={<SiteFooter />}>
          {children}
        </ShopFrame>
      </body>
    </html>
  );
}
