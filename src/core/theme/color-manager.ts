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
  // Task 9.1: Predefined harmonious color palette
  private static readonly PALETTE = [
    '#2563eb', // Blue
    '#dc2626', // Red
    '#16a34a', // Green
    '#d97706', // Amber
    '#7c3aed', // Violet
    '#db2777', // Pink
    '#0891b2', // Cyan
    '#ea580c', // Orange
    '#4f46e5', // Indigo
    '#059669', // Emerald
  ];

  /**
   * Task 9.2 / 9.3: Assign colors starting from root children
   * Each primary branch gets a unique color, which descendants inherit
   */
  public static assignBranchColors(root: TreeNode): void {
    if (!root.children || root.children.length === 0) return;

    root.children.forEach((child, index) => {
      // Assign color from palette to top-level branches
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
