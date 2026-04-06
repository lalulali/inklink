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
    '#4f46e5', // Indigo 600
    '#7c3aed', // Violet 600
    '#e11d48', // Rose 600
    '#d97706', // Amber 600
    '#059669', // Emerald 600
    '#0284c7', // Sky 600
    '#db2777', // Pink 600
    '#ea580c', // Orange 600
    '#0d9488', // Teal 600
    '#475569', // Slate 600
  ];

  // Mapping from light mode shades (600) to dark mode shades (also 600 as requested)
  private static readonly DARK_SHADES: Record<string, string> = {
    '#4f46e5': '#4f46e5', // Indigo 600
    '#7c3aed': '#7c3aed', // Violet 600
    '#e11d48': '#e11d48', // Rose 600
    '#d97706': '#d97706', // Amber 600
    '#059669': '#059669', // Emerald 600
    '#0284c7': '#0284c7', // Sky 600
    '#db2777': '#db2777', // Pink 600
    '#ea580c': '#ea580c', // Orange 600
    '#0d9488': '#0d9488', // Teal 600
    '#475569': '#475569', // Slate 600
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
  /** Small cache: bg hex -> computed complementary link color */
  private static readonly linkColorCache = new Map<string, string>();

  /**
   * Returns a complementary link color for a given node background hex.
   * Shifts hue by 180° in HSL space and boosts lightness for legibility on dark fills.
   * Results are cached so hex→color is only computed once per unique background.
   */
  public static getLinkColor(bgHex: string): string {
    const cacheKey = `v2_${bgHex}`;
    if (this.linkColorCache.has(cacheKey)) return this.linkColorCache.get(cacheKey)!;

    const clean = bgHex.replace('#', '');
    const r = parseInt(clean.substring(0, 2), 16) / 255;
    const g = parseInt(clean.substring(2, 4), 16) / 255;
    const b = parseInt(clean.substring(4, 6), 16) / 255;

    // RGB → HSL
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const l = (max + min) / 2;
    let h = 0;
    let s = 0;
    if (max !== min) {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      switch (max) {
        case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
        case g: h = ((b - r) / d + 2) / 6; break;
        case b: h = ((r - g) / d + 4) / 6; break;
      }
    }

    // Default solarized blue for neutral/gray backgrounds (low saturation)
    if (s < 0.1) {
      const solarBlue = '#3b82f6';
      this.linkColorCache.set(cacheKey, solarBlue);
      return solarBlue;
    }

    // Solarized/Monochromatic: keep the same hue but significantly bump lightness for "Neon" pop
    // Saturated nodes (Pink/Purple) hover around L=0.5, so we use a high threshold (0.7)
    const compH = h;
    const compS = 1.0;   // Max saturation for vibrancy
    const compL = l < 0.7 ? 0.88 : 0.25; // Force bright links for everything except light backgrounds

    // HSL → hex
    const hslToRgb = (p: number, q: number, t: number) => {
      let tt = t;
      if (tt < 0) tt += 1;
      if (tt > 1) tt -= 1;
      if (tt < 1 / 6) return p + (q - p) * 6 * tt;
      if (tt < 1 / 2) return q;
      if (tt < 2 / 3) return p + (q - p) * (2 / 3 - tt) * 6;
      return p;
    };
    const q2 = compL < 0.5 ? compL * (1 + compS) : compL + compS - compL * compS;
    const p2 = 2 * compL - q2;
    const toHex = (x: number) => Math.round(x * 255).toString(16).padStart(2, '0');
    const hex = `#${toHex(hslToRgb(p2, q2, compH + 1 / 3))}${toHex(hslToRgb(p2, q2, compH))}${toHex(hslToRgb(p2, q2, compH - 1 / 3))}`;

    this.linkColorCache.set(cacheKey, hex);
    return hex;
  }
}
