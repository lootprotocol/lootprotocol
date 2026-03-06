import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
import { AuthProvider } from '@/components/auth/auth-provider';
import { Header } from '@/components/layout/header';
import { Footer } from '@/components/layout/footer';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://lootprotocol.dev';

export const metadata: Metadata = {
  title: {
    default: 'Loot Protocol — AI Extension Marketplace',
    template: '%s — Loot Protocol',
  },
  description: 'Discover, publish, and install AI agent extensions for Claude Code and compatible agents.',
  metadataBase: new URL(baseUrl),
  openGraph: {
    title: 'Loot Protocol — AI Extension Marketplace',
    description: 'Discover, publish, and install AI agent extensions for Claude Code and compatible agents.',
    url: baseUrl,
    siteName: 'Loot Protocol',
    type: 'website',
    locale: 'en_US',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Loot Protocol — AI Extension Marketplace',
    description: 'Discover, publish, and install AI agent extensions for Claude Code and compatible agents.',
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <AuthProvider>
          <Header />
          <main className="min-h-screen">{children}</main>
          <Footer />
        </AuthProvider>
      </body>
    </html>
  );
}
