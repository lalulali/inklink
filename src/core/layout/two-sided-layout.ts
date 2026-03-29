/**
 * Feature: Two-Sided Layout Algorithm
 * Purpose: Implements a balanced mind map layout that grows in both directions from the root
 * Dependencies: BaseLayout, TreeNode types, SubtreeUtils, LayoutConfig
 */

import { BaseLayout } from './base-layout';
import { TreeNode } from '../types/tree-node';
import { Viewport, Position } from '../types/interfaces';

/**
 * Two-sided balanced layout implementation
 * Distributes child branches evenly between left and right sides to minimize total height
 */
export class TwoSidedLayout extends BaseLayout {
  /**
   * Calculate positions for all nodes in the tree
   */
  calculateLayout(root: TreeNode, viewport: Viewport): Map<string, Position> {
    this.startLayoutPass();
    const positions = new Map<string, Position>();
    
    if (!root || !root.children) return positions;

    // Step 1: Place root at the center
    const rootX = 0;
    const rootY = 0;
    positions.set(root.id, { x: rootX, y: rootY });

    const rootWidth = this.getNodeWidth(root);

    // Step 2: Set side anchors based on index to ensure visual stability
    // We avoid dynamic re-balancing (sorting by height) which causes nodes to "jump" sides.
    const left: TreeNode[] = [];
    const right: TreeNode[] = [];

    root.children.forEach((child, index) => {
      // Split branches based on index % 2. 
      // This is the most stable deterministic layout: 
      // - Child 0, 2, 4... stay on the Right
      // - Child 1, 3, 5... stay on the Left
      if (index % 2 === 0) {
        right.push(child);
      } else {
        left.push(child);
      }
    });

    // Step 3: Recursively layout each side
    // Boundaries are at rootWidth/2 + levelSpacing from the root center
    const leftBoundaryX = rootX - rootWidth / 2 - Math.abs(this.levelSpacing);
    const rightBoundaryX = rootX + rootWidth / 2 + Math.abs(this.levelSpacing);

    this.layoutHorizontalSubtree(left, positions, leftBoundaryX, rootY, -this.levelSpacing, 'left');
    this.layoutHorizontalSubtree(right, positions, rightBoundaryX, rootY, this.levelSpacing, 'right');

    // Step 4: Update metadata on nodes directly
    this.updateNodeMetadata(root, positions);

    return positions;
  }
}
