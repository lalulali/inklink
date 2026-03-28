/**
 * Feature: Top-To-Bottom Layout
 * Purpose: Implements a mind map layout that grows vertically downwards
 * Dependencies: BaseLayout, TreeNode types, SubtreeUtils
 */

import { BaseLayout } from './base-layout';
import { TreeNode } from '../types/tree-node';
import { Viewport, Position } from '../types/interfaces';

/**
 * Top-to-Bottom layout implementation
 * All branches grow from top to bottom
 */
export class TopToBottomLayout extends BaseLayout {
  /**
   * Calculate positions for all nodes in the tree
   */
  calculateLayout(root: TreeNode, viewport: Viewport): Map<string, Position> {
    this.startLayoutPass();
    const positions = new Map<string, Position>();
    
    if (!root) return positions;

    // Step 1: Place root at the world origin
    const rootX = 0;
    const rootY = 0;
    positions.set(root.id, { x: rootX, y: rootY });

    // Step 2: Lay out all children growing to the bottom (+levelSpacing)
    const rootHeight = this.getNodeHeight(root);
    const startY = rootY + rootHeight / 2;

    this.layoutVerticalSubtree(
      root.children, 
      positions, 
      rootX, 
      startY, 
      this.levelSpacing, 
      'bottom'
    );

    // Step 3: Persistence
    this.updateNodeMetadata(root, positions);

    return positions;
  }
}
