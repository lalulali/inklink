/**
 * Feature: Right-To-Left Layout
 * Purpose: Implements a mind map layout that grows exclusively to the left
 * Dependencies: BaseLayout, TreeNode types, SubtreeUtils
 */

import { BaseLayout } from './base-layout';
import { TreeNode } from '../types/tree-node';
import { Viewport, Position } from '../types/interfaces';

/**
 * Right-to-Left layout implementation
 * All branches grow from right to left
 */
export class RightToLeftLayout extends BaseLayout {
  /**
   * Calculate positions for all nodes in the tree
   */
  calculateLayout(root: TreeNode, viewport: Viewport): Map<string, Position> {
    this.startLayoutPass();
    const positions = new Map<string, Position>();
    
    if (!root) return positions;

    // Step 1: Place root at the center of the viewport
    const rootX = viewport.width / 2;
    const rootY = viewport.height / 2;
    positions.set(root.id, { x: rootX, y: rootY });

    // Step 2: Lay out all children growing to the left (-levelSpacing)
    this.layoutHorizontalSubtree(
      root.children, 
      positions, 
      rootX, 
      rootY, 
      -this.levelSpacing, 
      'left'
    );

    // Step 3: Persistence
    this.updateNodeMetadata(root, positions);

    return positions;
  }
}
