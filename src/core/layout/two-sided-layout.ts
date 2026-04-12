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
    let leftTotalHeight = 0;
    let rightTotalHeight = 0;

    // Distribute level 1 nodes greedily while strictly balancing the count of nodes on each side.
    // Constraint: Level 1 node count must be balanced; total nodes on the Right side can 
    // be at most 1 more than the Left side (for odd counts).
    root.children.forEach((child) => {
      const height = this.getSubtreeHeight(child);
      const countDiff = right.length - left.length;

      if (countDiff === 0) {
        // Equal counts: add to the side with less cumulative subtree height.
        // We favor the RIGHT side for ties to ensure it takes the 'extra' node for odd counts.
        if (rightTotalHeight <= leftTotalHeight) {
          right.push(child);
          rightTotalHeight += height + this.nodeSpacing;
        } else {
          left.push(child);
          leftTotalHeight += height + this.nodeSpacing;
        }
      } else if (countDiff > 0) {
        // Right side has more nodes: must add to the Left to keep the counts balanced.
        left.push(child);
        leftTotalHeight += height + this.nodeSpacing;
      } else {
        // Left side has more nodes: must add to the Right to keep the counts balanced.
        right.push(child);
        rightTotalHeight += height + this.nodeSpacing;
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
