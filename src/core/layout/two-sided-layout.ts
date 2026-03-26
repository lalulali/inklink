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
    
    if (!root) return positions;

    // Step 1: Calculate subtree sizes to determine balancing
    const sizes = calculateSubtreeSizes(root);
    
    // Step 2: Partition root's children into left and right groups
    const { left, right } = partitionChildren(root.children, sizes);

    // Step 3: Place root at the center of the viewport
    const rootX = viewport.width / 2;
    const rootY = viewport.height / 2;
    positions.set(root.id, { x: rootX, y: rootY });

    // Calculate root width for symmetric spacing (approximate if not measured)
    // In a real pass, this would be retrieved from metadata
    const rootWidth = root.metadata.width || 100;

    // Step 4: Recursively layout each side
    // Children should be spaced equally from the root's edges
    const leftX = rootX - rootWidth / 2 - this.levelSpacing;
    const rightX = rootX + rootWidth / 2 + this.levelSpacing;

    this.layoutHorizontalSubtree(left, positions, leftX, rootY, -this.levelSpacing, 'left');
    this.layoutHorizontalSubtree(right, positions, rightX, rootY, this.levelSpacing, 'right');

    // Step 5: Update metadata on nodes directly
    this.updateNodeMetadata(root, positions);

    return positions;
  }
}
