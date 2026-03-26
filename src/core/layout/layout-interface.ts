/**
 * Feature: Layout Algorithm Interface
 * Purpose: Defines the abstract interface for pluggable layout strategies
 * Dependencies: TreeNode from core/types/tree-node, Viewport/Position/BoundingBox from core/types/interfaces
 */

import { TreeNode } from '../types/tree-node';
import { Viewport, Position, BoundingBox } from '../types/interfaces';

/**
 * Abstract interface for layout algorithms
 * Enables pluggable layout strategies (e.g., TwoSided, L-R, etc.)
 */
export interface LayoutAlgorithm {
  /**
   * Calculate positions for all nodes in the tree
   * @param root - Root node of the tree
   * @param viewport - Current viewport dimensions for centering/initial placement
   * @returns Map of node IDs to calculated positions (x, y)
   */
  calculateLayout(
    root: TreeNode,
    viewport: Viewport
  ): Map<string, Position>;

  /**
   * Get the bounding box of the entire layout
   * Used for "fit to screen" calculations and minimap rendering
   * @param root - Root node of the tree
   * @returns Bounding box with min/max X/Y coordinates
   */
  getBounds(root: TreeNode): BoundingBox;
}
