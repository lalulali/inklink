/**
 * Feature: Two-Sided Layout Algorithm
 * Purpose: Implements a balanced mind map layout that grows in both directions from the root
 * Dependencies: BaseLayout, TreeNode types, SubtreeUtils, LayoutConfig
 */

import { BaseLayout } from './base-layout';
import { TreeNode } from '../types/tree-node';
import { Viewport, Position } from '../types/interfaces';
import { 
  calculateSubtreeSizes, 
  partitionChildren
} from './subtree-utils';

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

    // Step 2: Partition children based on subtree heights for optimal balancing
    // We avoid greedy leaf-count which fails to account for multi-line nodes
    const childrenWithHeights = root.children.map(child => ({
      node: child,
      height: this.getSubtreeHeight(child)
    }));

    // Sort by height descending for optimal greedy packing
    childrenWithHeights.sort((a, b) => b.height - a.height);

    const left: TreeNode[] = [];
    const right: TreeNode[] = [];
    let leftHeight = 0;
    let rightHeight = 0;

    for (const item of childrenWithHeights) {
      if (rightHeight <= leftHeight) {
        right.push(item.node);
        rightHeight += item.height + this.nodeSpacing;
      } else {
        left.push(item.node);
        leftHeight += item.height + this.nodeSpacing;
      }
    }

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
