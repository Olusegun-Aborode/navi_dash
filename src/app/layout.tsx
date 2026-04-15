import type { Metadata } from 'next';
import { JetBrains_Mono } from 'next/font/google';
import { Providers } from '@datumlabs/dashboard-kit';
import './globals.css';

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
});

export const metadata: Metadata = {
  title: 'NAVI Lending Terminal — Datum Labs',
  description: 'Real-time NAVI Protocol lending analytics on Sui',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        suppressHydrationWarning
        className={`${jetbrainsMono.variable} font-mono antialiased scanlines min-h-screen`}
      >
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
