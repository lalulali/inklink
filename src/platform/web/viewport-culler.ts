/**
 * Feature: Viewport Culling System
 * Purpose: Determines which nodes are visible in the current viewport to optimize rendering
 * Dependencies: core types, BoundingBox
 */

import { TreeNode, Position, Transform, BoundingBox } from '@/core/types';

/**
 * Viewport Culler
 * Implements lazy rendering by identifying visible nodes with a buffer
 */
export class ViewportCuller {
  private readonly buffer = 100; // Buffer in pixels to avoid pop-in

  /**
   * Determine which nodes are visible in the current viewport
   * @param root - Root of the tree
   * @param positions - Map of node positions
   * @param transform - Current pan/zoom transform
   * @param viewportWidth - Width of the SVG container
   * @param viewportHeight - Height of the SVG container
   * @returns Set of visible node IDs
   */
  public getVisibleNodes(
    root: TreeNode,
    positions: Map<string, Position>,
    transform: Transform,
    viewportWidth: number,
    viewportHeight: number
  ): Set<string> {
    const visibleSet = new Set<string>();
    
    // Calculate viewport bounds in world coordinates
    // screenX = worldX * scale + x -> worldX = (screenX - x) / scale
    const worldBounds: BoundingBox = {
      minX: (-this.buffer - transform.x) / transform.scale,
      minY: (-this.buffer - transform.y) / transform.scale,
      maxX: (viewportWidth + this.buffer - transform.x) / transform.scale,
      maxY: (viewportHeight + this.buffer - transform.y) / transform.scale,
    };

    const traverse = (node: TreeNode) => {
      const pos = positions.get(node.id);
      if (!pos) return;

      const nodeBox: BoundingBox = {
        minX: pos.x,
        minY: pos.y - (node.metadata.height / 2),
        maxX: pos.x + node.metadata.width,
        maxY: pos.y + (node.metadata.height / 2),
      };

      if (this.intersects(worldBounds, nodeBox)) {
        visibleSet.add(node.id);
      }

      // If node is collapsed, don't traverse children
      if (!node.collapsed) {
        node.children.forEach(traverse);
      }
    };

    traverse(root);
    return visibleSet;
  }

  /**
   * Check if two bounding boxes intersect
   */
  private intersects(a: BoundingBox, b: BoundingBox): boolean {
    return (
      a.minX <= b.maxX &&
      a.maxX >= b.minX &&
      a.minY <= b.maxY &&
      a.maxY >= b.minY
    );
  }
}
