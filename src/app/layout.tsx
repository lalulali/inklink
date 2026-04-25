import type { Metadata, Viewport } from 'next';
import Script from "next/script";
import './globals.css';

/**
 * Feature: Root Layout
 * Purpose: Provides the root layout for the Next.js application with Tailwind CSS
 * Dependencies: globals.css for Tailwind directives
 */
import { ThemeProvider } from '@/components/theme-provider';
import { WebPlatformProvider } from '@/platform/web/web-platform-context';
import { ErrorBoundary } from '@/components/error-boundary';

export const metadata: Metadata = {
  title: "InkLink | Minimalist Mind Mapping",
  description: "Transform markdown into beautiful, interactive mind maps with professional precision.",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    title: "InkLink",
    statusBarStyle: "default",
    capable: true,
  },
  icons: {
    icon: "/favicon.png",
    apple: "/favicon.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#1e293b",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body suppressHydrationWarning>
        <Script
          src="https://www.googletagmanager.com/gtag/js?id=G-4CC7T1YRXC"
          strategy="afterInteractive"
        />
        <Script id="google-analytics" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());

            gtag('config', 'G-4CC7T1YRXC');
          `}
        </Script>
        <ErrorBoundary>
          <WebPlatformProvider>
            <ThemeProvider
              attribute="class"
              defaultTheme="system"
              enableSystem
              disableTransitionOnChange
            >
              {children}
            </ThemeProvider>
          </WebPlatformProvider>
        </ErrorBoundary>
      </body>
    </html>
  );
}