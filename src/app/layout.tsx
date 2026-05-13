import type { Metadata } from 'next';
import { Inter, Source_Code_Pro } from 'next/font/google';
import '@/styles/tokens.css';
import './globals.css';

const mono = Source_Code_Pro({
  variable: '--font-mono',
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
});

const sans = Inter({
  variable: '--font-sans',
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
});

export const metadata: Metadata = {
  title: 'mementree',
  description: 'a quiet field, kept for you.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${mono.variable} ${sans.variable}`}>
      <body>{children}</body>
    </html>
  );
}
