/**
 * Feature: Base Layout Implementation
 * Purpose: Provides shared logic for all mind map layout algorithms (Memoization, Metadata updates, Bounding Box calculation)
 * Dependencies: LayoutAlgorithm interface, TreeNode types, SubtreeUtils, LayoutConfig
 */

import { LayoutAlgorithm } from './layout-interface';
import { TreeNode } from '../types/tree-node';
import { Viewport, Position, BoundingBox } from '../types/interfaces';
import { countLeafNodes } from './subtree-utils';
import { LAYOUT_CONFIG } from './layout-config';

/**
 * Abstract class embodying the common functionality of all layout strategies
 */
export abstract class BaseLayout implements LayoutAlgorithm {
  protected nodeSpacing: number;
  protected levelSpacing: number;
  
  // Memoization cache to avoid redundant recursive leaf counts during a single layout pass
  private leafCountCache: Map<string, number> = new Map();

  constructor(config?: { nodeSpacing?: number; levelSpacing?: number }) {
    this.nodeSpacing = config?.nodeSpacing ?? LAYOUT_CONFIG.SIBLING_SPACING;
    this.levelSpacing = config?.levelSpacing ?? LAYOUT_CONFIG.LEVEL_SPACING;
  }

  /**
   * Must be implemented by concrete layout strategies
   */
  abstract calculateLayout(root: TreeNode, viewport: Viewport): Map<string, Position>;

  /**
   * Helper to get memoized leaf count for a node
   * Ensures O(n) performance during layout passes
   */
  protected getMemoizedLeafCount(node: TreeNode): number {
    if (this.leafCountCache.has(node.id)) {
      return this.leafCountCache.get(node.id)!;
    }
    
    const count = countLeafNodes(node);
    this.leafCountCache.set(node.id, count);
    return count;
  }

  /**
   * Resets the calculation state at the beginning of a layout pass
   */
  protected startLayoutPass(): void {
    this.leafCountCache.clear();
  }

  /**
   * Recursively updates the metadata x/y of each node to match calculated positions
   */
  protected updateNodeMetadata(node: TreeNode, positions: Map<string, Position>): void {
    const pos = positions.get(node.id);
    if (pos) {
      node.metadata.x = pos.x;
      node.metadata.y = pos.y;
    }

    if (node.children) {
      for (const child of node.children) {
        this.updateNodeMetadata(child, positions);
      }
    }
  }

  /**
   * Calculates the global bounding box of the tree using the current node metadata
   * @param root - Root of the tree
   */
  public getBounds(root: TreeNode): BoundingBox {
    if (!root) return { minX: 0, minY: 0, maxX: 0, maxY: 0 };
    
    let minX = root.metadata.x;
    let maxX = root.metadata.x;
    let minY = root.metadata.y;
    let maxY = root.metadata.y;

    const traverse = (node: TreeNode) => {
      const halfW = (node.metadata.width || LAYOUT_CONFIG.DEFAULT_NODE_WIDTH) / 2;
      const halfH = (node.metadata.height || LAYOUT_CONFIG.DEFAULT_NODE_HEIGHT) / 2;

      minX = Math.min(minX, node.metadata.x - halfW);
      maxX = Math.max(maxX, node.metadata.x + halfW);
      minY = Math.min(minY, node.metadata.y - halfH);
      maxY = Math.max(maxY, node.metadata.y + halfH);

      if (node.children && !node.collapsed) {
        for (const child of node.children) {
          traverse(child);
        }
      }
    };

    traverse(root);

    return { minX, minY, maxX, maxY };
  }

  /**
   * Universal implementation for horizontal mind map growth (L-R or R-L)
   * Positions a list of sibling nodes and their subtrees
   * Used by Two-Sided, Left-to-Right, and Right-to-Left strategies
   */
  protected layoutHorizontalSubtree(
    nodes: TreeNode[],
    positions: Map<string, Position>,
    parentX: number,
    parentY: number,
    xOffset: number,
    side: 'left' | 'right'
  ): void {
    if (!nodes || nodes.length === 0) return;

    // Calculate total height required based on subtree leaf node counts
    const totalLeafNodes = nodes.reduce((sum, node) => sum + this.getMemoizedLeafCount(node), 0);
    const totalHeight = (totalLeafNodes - 1) * this.nodeSpacing;
    
    // Starting Y to center the sibling group against the parent's Y coordinate
    let currentY = parentY - totalHeight / 2;
    const currentX = parentX + xOffset;

    for (const node of nodes) {
      const nodeLeafCount = this.getMemoizedLeafCount(node);
      const branchHeight = (nodeLeafCount - 1) * this.nodeSpacing;
      
      const nodeY = currentY + branchHeight / 2;
      positions.set(node.id, { x: currentX, y: nodeY });

      // Recursively layout children deeper into the tree
      if (node.children && node.children.length > 0 && !node.collapsed) {
        this.layoutHorizontalSubtree(node.children, positions, currentX, nodeY, xOffset, side);
      }

      currentY += branchHeight + this.nodeSpacing;
    }
  }

  /**
   * Universal implementation for vertical mind map growth (T-B or B-T)
   * Positions a list of sibling nodes and their subtrees horizontally
   * Used by Top-to-Bottom and Bottom-to-Top strategies
   */
  protected layoutVerticalSubtree(
    nodes: TreeNode[],
    positions: Map<string, Position>,
    parentX: number,
    parentY: number,
    yOffset: number,
    direction: 'top' | 'bottom'
  ): void {
    if (!nodes || nodes.length === 0) return;

    // Calculate total width required based on subtree leaf node counts
    const totalLeafNodes = nodes.reduce((sum, node) => sum + this.getMemoizedLeafCount(node), 0);
    const totalWidth = (totalLeafNodes - 1) * this.nodeSpacing;
    
    // Starting X to center the sibling group against the parent's X coordinate
    let currentX = parentX - totalWidth / 2;
    const currentY = parentY + yOffset;

    for (const node of nodes) {
      const nodeLeafCount = this.getMemoizedLeafCount(node);
      const branchWidth = (nodeLeafCount - 1) * this.nodeSpacing;
      
      const nodeX = currentX + branchWidth / 2;
      positions.set(node.id, { x: nodeX, y: currentY });

      // Recursively layout children deeper into the tree
      if (node.children && node.children.length > 0 && !node.collapsed) {
        this.layoutVerticalSubtree(node.children, positions, nodeX, currentY, yOffset, direction);
      }

      currentX += branchWidth + this.nodeSpacing;
    }
  }
}
