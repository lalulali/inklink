import type { Metadata } from 'next';
import './globals.css';

/**
 * Feature: Root Layout
 * Purpose: Provides the root layout for the Next.js application with Tailwind CSS
 * Dependencies: globals.css for Tailwind directives
 */
export const metadata: Metadata = {
  title: 'Markdown to Mind Map Generator',
  description: 'Transform markdown documents into interactive mind maps',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}