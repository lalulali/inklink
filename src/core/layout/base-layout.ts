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
   * Helper to accurately measure text width identically to the renderer
   */
  /**
   * Helper to accurately measure text width identically to the renderer
   */
  /**
   * Helper to accurately measure text width identically to the renderer
   */
  protected getNodeWidth(node: TreeNode): number {
    const scale = LAYOUT_CONFIG.BASE_SCALE;
    const depth = node.depth || 0;
    const fontSize = (depth === 0 ? 22 : depth === 1 ? 17 : depth === 2 ? 14 : 12) * scale;
    const fontWeight = depth === 0 ? '700' : depth === 1 ? '600' : '500';
    
    // Check for hard-coded root max width constraint
    const maxWidthLimit = depth === 0 ? LAYOUT_CONFIG.ROOT_MAX_WIDTH : Infinity;
    
    // Exact synchronization with d3-renderer dimensions
    let textWidth = (node.content?.length || 0) * (fontSize * 0.6);
    if (typeof document !== 'undefined') {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (ctx) {
        const lines = (node.content || '').split('\n');
        let totalMaxWidth = 0;
        lines.forEach(line => {
          // Strip all inline markdown including links/images to measure only visible labels
          const cleanLine = line.replace(/!?\[(.*?)\].*?\)/g, '$1')
                               .replace(/(\*\*\*|\*\*|\*|~~)/g, '');
          ctx.font = `${fontWeight} ${fontSize}px Inter, sans-serif`;
          
          const lineWidth = ctx.measureText(cleanLine).width;
          
          // If we are at the root and exceed the limit, we'll wrap (heuristic)
          if (depth === 0 && lineWidth > maxWidthLimit - (24 * scale)) {
             totalMaxWidth = Math.max(totalMaxWidth, maxWidthLimit - (24 * scale));
          } else {
             totalMaxWidth = Math.max(totalMaxWidth, lineWidth);
          }
        });
        textWidth = totalMaxWidth;
      }
    }
    
    const res = textWidth + (24 * scale); // padding.x * 2 (12 * 0.75 * 2 = 18)
    return Math.min(res, maxWidthLimit);
  }

  /**
   * Helper to accurately measure node height identically to the renderer
   */
  protected getNodeHeight(node: TreeNode): number {
    const scale = LAYOUT_CONFIG.BASE_SCALE;
    const depth = node.depth || 0;
    const fontSize = (depth === 0 ? 22 : depth === 1 ? 17 : depth === 2 ? 14 : 12) * scale;
    const lineHeight = Math.round(fontSize * 1.25);
    
    const content = node.metadata.displayContent ?? node.content ?? '';
    let rawLines = content.split('\n');
    let lineCount = 0;
    // Filter out lines that are purely placeholders (handled separately) or truly empty
    const displayLines = rawLines.filter(rawLine => {
      const line = rawLine.replace(/\[(codeblock|quoteblock):\d+\]/g, '').trim();
      // Only skip if it was a placeholder line. If it was a natural blank line, keep it.
      if (!line && rawLine.match(/\[(codeblock|quoteblock):\d+\]/)) return false;
      return true;
    });

    if (depth === 0 && typeof document !== 'undefined') {
       const canvas = document.createElement('canvas');
       const ctx = canvas.getContext('2d');
       if (ctx) {
         const maxWidthLimit = LAYOUT_CONFIG.ROOT_MAX_WIDTH - (24 * scale);
         const fontWeight = '700';
         ctx.font = `${fontWeight} ${fontSize}px Inter, sans-serif`;

         displayLines.forEach(line => {
           // We already filtered placeholders, but we should also strip inline markdown for measurement
           const words = line.replace(/(\*\*\*|\*\*|\*|~~)/g, '').split(' ');
           let currentLine = '';
           words.forEach(word => {
             const testLine = currentLine ? `${currentLine} ${word}` : word;
             const width = ctx.measureText(testLine).width;
             if (width > maxWidthLimit && currentLine) {
               lineCount += 1;
               currentLine = word;
             } else {
               currentLine = testLine;
             }
           });
           if (currentLine) lineCount += 1;
         });
       } else {
         lineCount = displayLines.length;
       }
    } else {
       lineCount = displayLines.length;
    }

    let totalHeight = (lineCount * lineHeight) + (16 * scale);

    // Account for Note Blocks (Code/Quote)
    const NB = LAYOUT_CONFIG.NOTE_BLOCK;
    const codeBlocks = node.metadata.codeBlocks || [];
    const quoteBlocks = node.metadata.quoteBlocks || [];
    
    if (codeBlocks.length > 0 || quoteBlocks.length > 0) {
      const allBlocks = [
        ...codeBlocks.map(b => ({ ...b, type: 'code' })),
        ...quoteBlocks.map(b => ({ ...b, type: 'quote' }))
      ];
      
      allBlocks.forEach(block => {
        totalHeight += NB.PILL_GAP;
        if (block.expanded) {
          const blockLines = (block.type === 'code' ? (block as any).code : (block as any).text) || '';
          const blockLineCount = blockLines.split('\n').length;
          const vPad = block.type === 'code' ? NB.CODE_V_PADDING : NB.QUOTE_V_PADDING;
          const lineH = block.type === 'code' ? NB.CODE_LINE_HEIGHT : NB.QUOTE_LINE_HEIGHT;
          // Both now have the same header height
          totalHeight += NB.CODE_HEADER_HEIGHT + vPad + (blockLineCount * lineH) + vPad;
        } else {
          totalHeight += NB.PILL_HEIGHT;
        }
      });
    }

    return totalHeight;
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
   * 
   * Uses edge-alignment (left-aligned for right side, right-aligned for left side)
   * which matches professional mind map layouts and creates consistent gaps.
   */
  protected layoutHorizontalSubtree(
    nodes: TreeNode[],
    positions: Map<string, Position>,
    parentBoundaryX: number, // The x-coordinate where the level's inner boundary starts
    parentY: number,
    levelSpacing: number, // Signed gap between levels
    side: 'left' | 'right'
  ): void {
    if (!nodes || nodes.length === 0) return;

    // Calculate heights of each branch
    const branchHeights = nodes.map(node => this.getSubtreeHeight(node));
    const totalBranchesHeight = branchHeights.reduce((sum, h) => sum + h, 0);
    const totalGroupHeight = totalBranchesHeight + (nodes.length - 1) * this.nodeSpacing;
    
    // Start Y so the block is centered vertically around parentY
    let currentBoundaryY = parentY - totalGroupHeight / 2;

    for (let i = 0; i < nodes.length; i++) {
      const node = nodes[i];
      const branchHeight = branchHeights[i];
      const nodeWidth = this.getNodeWidth(node);
      
      // Node's pivot Y is the vertical center of its branch space
      const nodeY = currentBoundaryY + branchHeight / 2;
      
      // Node's pivot X IS the parentBoundaryX (connection point from parent)
      // This ensures siblings align perfectly in a straight vertical line
      const nodeX = parentBoundaryX;
      positions.set(node.id, { x: nodeX, y: nodeY });

      if (node.children && node.children.length > 0 && !node.collapsed) {
        // Prepare recursion for the next level
        // nextBoundaryX is the outer edge of THIS level's node + levelSpacing
        const dir = side === 'right' ? 1 : -1;
        const nextBoundaryX = nodeX + (dir * (nodeWidth + Math.abs(levelSpacing)));
        this.layoutHorizontalSubtree(node.children, positions, nextBoundaryX, nodeY, levelSpacing, side);
      }

      // Advance boundary Y for the next sibling
      currentBoundaryY += branchHeight + this.nodeSpacing;
    }
  }

  /**
   * Calculates the total vertical height of a subtree recursively
   */
  protected getSubtreeHeight(node: TreeNode): number {
    const nodeHeight = this.getNodeHeight(node);
    if (!node.children || node.children.length === 0 || node.collapsed) {
      return nodeHeight;
    }
    
    let childrenHeight = 0;
    for (const child of node.children) {
      childrenHeight += this.getSubtreeHeight(child);
    }
    // Add nodeSpacing between each child subtree
    childrenHeight += (node.children.length - 1) * this.nodeSpacing;
    
    return Math.max(nodeHeight, childrenHeight);
  }

  /**
   * Universal implementation for vertical mind map growth (T-B or B-T)
   * Positions a list of sibling nodes and their subtrees horizontally.
   * Uses precise edge-to-edge node widths to prevent horizontal overlap.
   */
  protected layoutVerticalSubtree(
    nodes: TreeNode[],
    positions: Map<string, Position>,
    parentX: number,
    parentY: number,
    yOffset: number,  // positive = down, negative = up
    direction: 'top' | 'bottom'
  ): void {
    if (!nodes || nodes.length === 0) return;

    const currentY = parentY + yOffset;

    // A helper to calculate the total horizontal width of a subtree recursively
    const getSubtreeWidth = (node: TreeNode): number => {
      const nodeWidth = this.getNodeWidth(node);
      if (!node.children || node.children.length === 0 || node.collapsed) {
        return nodeWidth;
      }
      let childrenWidth = 0;
      for (const child of node.children) {
        childrenWidth += getSubtreeWidth(child);
      }
      // Add nodeSpacing between each child subtree
      childrenWidth += (node.children.length - 1) * this.nodeSpacing;
      return Math.max(nodeWidth, childrenWidth);
    };

    // Calculate width of each branch and total width of all branches
    const branchWidths = nodes.map(getSubtreeWidth);
    const totalBranchesWidth = branchWidths.reduce((sum, w) => sum + w, 0);
    const totalGroupWidth = totalBranchesWidth + (nodes.length - 1) * this.nodeSpacing;

    // Start X so the entire block is centered exactly around parentX
    let currentBoundaryX = parentX - totalGroupWidth / 2;

    for (let i = 0; i < nodes.length; i++) {
      const node = nodes[i];
      const branchWidth = branchWidths[i];
      
      // Node's pivot X is the exact center of its allocated branch space
      const nodeX = currentBoundaryX + branchWidth / 2;
      positions.set(node.id, { x: nodeX, y: currentY });

      if (node.children && node.children.length > 0 && !node.collapsed) {
        const nodeHeight = this.getNodeHeight(node);
        const childYOffset = yOffset > 0 ? nodeHeight + this.levelSpacing : -nodeHeight - this.levelSpacing;
        this.layoutVerticalSubtree(node.children, positions, nodeX, currentY, childYOffset, direction);
      }

      // Advance boundary X by the allocated branch width + spacing
      currentBoundaryX += branchWidth + this.nodeSpacing;
    }
  }
}
