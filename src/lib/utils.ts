import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Feature: Utility Functions
 * Purpose: Provides utility functions for className merging
 * Dependencies: clsx, tailwind-merge
 */

/**
 * Merges class names with tailwind-merge for proper conflict resolution
 * @param inputs - Class value inputs to merge
 * @returns Merged class string
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

/**
 * Normalizes a URL to ensure it has a protocol if it's an external link
 * @param url - URL to normalize
 * @returns Normalized URL
 */
export function normalizeUrl(url: string | null): string {
  if (!url) return "#";
  
  // Check if it already has a protocol or is a local/special path
  if (/^([a-z0-9+.-]+):/i.test(url) || url.startsWith("/") || url.startsWith("#") || url.startsWith("./") || url.startsWith("../")) {
    return url;
  }
  
  // Default to https for external-looking links without protocol
  return `https://${url}`;
}

/**
 * Returns the platform-appropriate modifier key name
 * @returns 'Cmd' for Mac, 'Ctrl' for others
 */
export function getModKey(): string {
  if (typeof navigator === 'undefined') return 'Ctrl';
  const platform = (navigator as any).userAgentData?.platform || navigator.platform || 'unknown';
  return /Mac|iPhone|iPod|iPad/i.test(platform) ? 'Cmd' : 'Ctrl';
}