/**
 * Feature: Color Management
 * Purpose: Manages mind map theme colors, branch inheritance, and accessibility compliance
 * Requirement Traceability: 
 * - Req 3: Branch color differentiation
 * - Design Ref: Color assignment algorithm (Inheritance)
 */

import { TreeNode } from '../types/tree-node';

/**
 * Utility for assigning colors to branches and ensuring accessibility
 */
export class ColorManager {
  // Task 9.1: Curated premium color palette
  private static readonly PALETTE = [
    '#6366f1', // Indigo 500
    '#8b5cf6', // Violet 500
    '#f43f5e', // Rose 500
    '#f59e0b', // Amber 500
    '#10b981', // Emerald 500
    '#0ea5e9', // Sky 500
    '#ec4899', // Pink 500
    '#f97316', // Orange 500
    '#14b8a6', // Teal 500
    '#64748b', // Slate 500
  ];

  // Mapping from light mode shades (500) to darker mode shades (700 hex)
  private static readonly DARK_SHADES: Record<string, string> = {
    '#6366f1': '#4338ca', // Indigo 700
    '#8b5cf6': '#6d28d9', // Violet 700
    '#f43f5e': '#be123c', // Rose 700
    '#f59e0b': '#b45309', // Amber 700
    '#10b981': '#047857', // Emerald 700
    '#0ea5e9': '#0369a1', // Sky 700
    '#ec4899': '#be185d', // Pink 700
    '#f97316': '#c2410c', // Orange 700
    '#14b8a6': '#0f766e', // Teal 700
    '#64748b': '#334155', // Slate 700
  };

  /**
   * Adapts a color for the current theme by returning a slightly lighter or more vibrant shade in dark mode.
   */
  public static getThemeShade(color: string, isDarkMode: boolean): string {
    if (!isDarkMode) return color;
    return this.DARK_SHADES[color.toLowerCase()] || color;
  }

  /**
   * Task 9.2: Assign colors following user rules:
   * - Root (Depth 0) is monochrome (handled by renderer default or current node color)
   * - 2nd level branches (Depth 1) and below get distinct primary colors
   */
  public static assignBranchColors(root: TreeNode): void {
    // Explicitly set root to monochrome (empty string uses theme default)
    root.color = '';

    if (!root.children || root.children.length === 0) return;

    // Each child of root is the start of a major branch
    root.children.forEach((child, index) => {
      const branchColor = this.PALETTE[index % this.PALETTE.length];
      this.applyColorRecursively(child, branchColor);
    });
  }

  /**
   * Recursively applies the branch color to all descendants
   * Task 9.3: Color inheritance
   */
  private static applyColorRecursively(node: TreeNode, color: string): void {
    node.color = color;
    if (node.children) {
      node.children.forEach(child => this.applyColorRecursively(child, color));
    }
  }

  /**
   * Task 9.4: WCAG AA contrast check (Target 4.5:1)
   * Calculates the contrast ratio between two colors
   */
  public static getContrastRatio(hex1: string, hex2: string): number {
    const l1 = this.getRelativeLuminance(hex1);
    const l2 = this.getRelativeLuminance(hex2);
    
    const lighter = Math.max(l1, l2);
    const darker = Math.min(l1, l2);
    
    return (lighter + 0.05) / (darker + 0.05);
  }

  /**
   * Helper to calculate relative luminance of a color
   */
  private static getRelativeLuminance(hex: string): number {
    const cleanHex = hex.replace('#', '');
    const r = parseInt(cleanHex.substring(0, 2), 16) / 255;
    const g = parseInt(cleanHex.substring(2, 4), 16) / 255;
    const b = parseInt(cleanHex.substring(4, 6), 16) / 255;

    const f = (val: number) => {
      return val <= 0.03928 ? val / 12.92 : Math.pow((val + 0.055) / 1.055, 2.4);
    };

    return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
  }

  /**
   * Task 9.5: Checks if a color meets AA contrast against a background
   * Useful for ensuring text readability on colored branches or icons
   */
  public static isAccessible(fg: string, bg: string, ratio = 4.5): boolean {
    return this.getContrastRatio(fg, bg) >= ratio;
  }
}
