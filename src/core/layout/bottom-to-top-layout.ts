/**
 * Feature: Bottom-To-Top Layout
 * Purpose: Implements a mind map layout that grows vertically upwards
 * Dependencies: BaseLayout, TreeNode types, SubtreeUtils
 */

import { BaseLayout } from './base-layout';
import { TreeNode } from '../types/tree-node';
import { Viewport, Position } from '../types/interfaces';

/**
 * Bottom-to-Top layout implementation
 * All branches grow from bottom to top
 */
export class BottomToTopLayout extends BaseLayout {
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

    // Step 2: Lay out all children growing to the top (-levelSpacing)
    this.layoutVerticalSubtree(
      root.children, 
      positions, 
      rootX, 
      rootY, 
      -this.levelSpacing, 
      'top'
    );

    // Step 3: Persistence
    this.updateNodeMetadata(root, positions);

    return positions;
  }
}
