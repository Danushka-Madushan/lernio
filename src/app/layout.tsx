import type { Metadata } from "next";
import "./globals.css";
import { headers } from 'next/headers';
import { isRTL, Toast } from '@heroui/react';
import { ClientProviders } from './provider';
import { Inter } from 'next/font/google'
 
const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
})

export const metadata: Metadata = {
  title: "Lernio",
  description: "Secure, closed-ecosystem educational video hosting for tuition classes.",
  icons: {
    icon: '/icon.svg'
  }
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const acceptLanguage = (await headers()).get('accept-language');
  const lang = acceptLanguage?.split(/[,;]/)[0] || 'en-US';

  return (
    <html lang={lang} dir={isRTL(lang) ? 'rtl' : 'ltr'}  className={inter.className}>
      
      <body className="min-h-full flex flex-col bg-surface-muted">
        <ClientProviders lang={lang}>
          <Toast.Provider />
          {children}
        </ClientProviders>
      </body>
    </html>
  );
}
