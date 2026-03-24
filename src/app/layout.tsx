/**
 * Root Layout Component
 * 
 * Purpose: Provides the root HTML structure and global styling for the application
 * Key Features:
 * - Tailwind CSS global styles
 * - Metadata configuration
 * - Font loading
 * - Provider setup (future: theme provider, state provider)
 * 
 * Dependencies: Next.js App Router, Tailwind CSS, React
 */

import type { Metadata } from 'next';
import './globals.css';
import { Geist } from "next/font/google";
import { cn } from "@/lib/utils";

const geist = Geist({subsets:['latin'],variable:'--font-sans'});

/**
 * Metadata for the application
 * Used by Next.js for SEO and browser metadata
 */
export const metadata: Metadata = {
  title: 'Markdown to Mind Map Generator',
  description: 'Convert markdown documents into interactive mind maps with professional features',
  viewport: 'width=device-width, initial-scale=1',
  icons: {
    icon: '/favicon.ico',
  },
};

/**
 * Root Layout Component
 * 
 * @returns HTML structure with global styles and providers
 */
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}): React.ReactElement {
  return (
    <html lang="en" suppressHydrationWarning className={cn("font-sans", geist.variable)}>
      <head>
        {/* Preconnect to external resources for performance */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body className="bg-white text-gray-900 antialiased">
        {/* Main application content */}
        {children}

        {/* Toast notifications container (for shadcn/ui Toast) */}
        <div id="toast-container" />
      </body>
    </html>
  );
}
