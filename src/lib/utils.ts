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