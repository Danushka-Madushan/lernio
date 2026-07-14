import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Lernio - EWisdom Institute",
  description: "Secure, closed-ecosystem educational video hosting for tuition classes.",
  icons: {
    icon: '/favicon.svg'
  }
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-surface-muted">
        {children}
      </body>
    </html>
  );
}
