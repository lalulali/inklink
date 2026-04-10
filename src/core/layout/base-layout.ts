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
import { 
  wrapText, 
  getNoteBlockFontWeight, 
  getNoteBlockFontSize, 
  getNoteBlockLineHeight,
  measureRichTextWidth
} from '../utils/text-rendering';
import { imageDimensionStore } from '../utils/image-store';

/**
 * Abstract class embodying the common functionality of all layout strategies
 */
export abstract class BaseLayout implements LayoutAlgorithm {
  protected nodeSpacing: number;
  protected levelSpacing: number;
  
  // Memoization cache to avoid redundant recursive leaf counts during a single layout pass
  private leafCountCache: Map<string, number> = new Map();

  // Shared canvas context — created once, reused for all text measurements in all layout calls
  private static sharedMeasureCtx: CanvasRenderingContext2D | null = null;

  protected static getSharedMeasureCtx(): CanvasRenderingContext2D | null {
    if (!BaseLayout.sharedMeasureCtx && typeof document !== 'undefined') {
      const canvas = document.createElement('canvas');
      BaseLayout.sharedMeasureCtx = canvas.getContext('2d');
    }
    return BaseLayout.sharedMeasureCtx;
  }

  constructor(config?: { nodeSpacing?: number; levelSpacing?: number }) {
    this.nodeSpacing = config?.nodeSpacing ?? LAYOUT_CONFIG.SIBLING_SPACING;
    this.levelSpacing = config?.levelSpacing ?? LAYOUT_CONFIG.LEVEL_SPACING;
  }

  /**
   * Helper to accurately measure node width identically to the renderer
   */
  protected getNodeWidth(node: TreeNode): number {
    const scale = LAYOUT_CONFIG.BASE_SCALE;
    const depth = node.depth || 0;
    const fontSize = getNoteBlockFontSize(depth);
    const fontWeight = getNoteBlockFontWeight(depth);
    
    // Check for hard-coded root max width constraint
    const maxWidthLimit = depth === 0 ? LAYOUT_CONFIG.ROOT_MAX_WIDTH : Infinity;
    
    // Use the shared context — avoids creating a new canvas element per call
    const ctx = BaseLayout.getSharedMeasureCtx();

    const measureFn = (txt: string, font: string) => {
      if (ctx) {
        ctx.font = font;
        return ctx.measureText(txt).width;
      }
      return txt.length * (fontSize * 0.6);
    };

    const displayContent = node.metadata.displayContent ?? node.content ?? '';
    const cleanContent = displayContent
      .replace(/\[(codeblock|quoteblock|image|tableblock):\d+\]/gi, '')
      .trim();

    const displayLines = wrapText(cleanContent, maxWidthLimit - (24 * scale), fontSize, fontWeight, measureFn);
    let totalMaxWidth = 0;
    displayLines.forEach(line => {
      totalMaxWidth = Math.max(totalMaxWidth, measureRichTextWidth(line, fontSize, fontWeight, measureFn));
    });
    
    const hasText = cleanContent.length > 0;
    const paddingX = 24 * scale; // padding.x * 2 (12 * 0.75 * 2 = 18)
    let finalWidth = (hasText ? totalMaxWidth : 0) + paddingX;
    finalWidth = Math.min(finalWidth, maxWidthLimit);

    // Account for images in width
    if (node.metadata.image) {
      const image = node.metadata.image;
      const imgConfig = LAYOUT_CONFIG.IMAGE;
      
      // Try to get actual dimensions from store
      let thumbW = 0;
      const cached = imageDimensionStore.getDimensions(image.url);
      const w = cached?.width || image.width || 0;
      const h = cached?.height || image.height || 0;

      if (w > 0 && h > 0) {
        const ratioW = imgConfig.MAX_WIDTH / w;
        const ratioH = imgConfig.MAX_HEIGHT / h;
        const imgScale = (w > imgConfig.MAX_WIDTH || h > imgConfig.MAX_HEIGHT) ? Math.min(ratioW, ratioH) : 1;
        thumbW = w * imgScale;
      } else {
        // Fallback matching renderer exactly
        const isActuallyLoading = imageDimensionStore.isLoading(image.url);
        thumbW = isActuallyLoading ? 40 : 0;
      }

      if (thumbW > 0) {
        finalWidth = Math.max(finalWidth, thumbW + paddingX);
      }
    }

    // Account for all expanded note blocks in width
    const NB = LAYOUT_CONFIG.NOTE_BLOCK;
    const codeBlocks = node.metadata.codeBlocks || [];
    const quoteBlocks = node.metadata.quoteBlocks || [];
    const tableBlocks = node.metadata.tableBlocks || [];
    
    const allNoteBlocks = [
      ...codeBlocks.map(b => ({ ...b, type: 'code' })),
      ...quoteBlocks.map(b => ({ ...b, type: 'quote' })),
      ...tableBlocks.map(b => ({ ...b, type: 'table' }))
    ];

    if (allNoteBlocks.length > 0) {
      let maxBlockWidth = 180 * 0.75; // Baseline width for pills
      allNoteBlocks.forEach(block => {
        if (!block.expanded) return;

        if (block.type === 'table') {
          const table = block as any;
          const colCount = Math.max(table.headers?.length || 0, ...(table.rows?.map((r: any) => r.length) || [0]));
          if (colCount > 0) {
            const colWidths = new Array(colCount).fill(0);
            table.headers?.forEach((h: any, i: number) => {
              if (ctx) ctx.font = `${NB.TABLE_LINE_HEIGHT}px Inter, sans-serif`;
              const w = ctx ? ctx.measureText(h).width : h.length * NB.TABLE_LINE_HEIGHT * 0.6;
              colWidths[i] = Math.max(colWidths[i], w + NB.TABLE_CELL_HPADDING * 2);
            });
            table.rows?.forEach((row: any) => {
              row.forEach((cell: any, i: number) => {
                const w = ctx ? ctx.measureText(cell).width : cell.length * NB.TABLE_LINE_HEIGHT * 0.6;
                colWidths[i] = Math.max(colWidths[i], w + NB.TABLE_CELL_HPADDING * 2);
              });
            });
            const maxIndividualColWidth = Math.max(...colWidths);
            const tableWidth = maxIndividualColWidth * colCount;
            if (tableWidth > maxBlockWidth) maxBlockWidth = tableWidth;
          }
        } else {
          // Code/Quote width
          const contentStr = block.type === 'code' ? (block as any).code : (block as any).text;
          const lines = (contentStr || '').split('\n');
          const font = block.type === 'quote' ? `${NB.QUOTE_LINE_HEIGHT}px Inter, sans-serif` : `${NB.CODE_LINE_HEIGHT}px ${NB.MONO_FONT.replace(/'/g, "")}`;
          
          if (ctx) ctx.font = font;
          lines.forEach((line: string) => {
            const lw = ctx ? ctx.measureText(line).width : line.length * (block.type === 'quote' ? NB.QUOTE_LINE_HEIGHT : NB.CODE_LINE_HEIGHT) * 0.6;
            const totalLw = lw + (block.type === 'quote' ? NB.QUOTE_BORDER_WIDTH + 16 : 16);
            if (totalLw > maxBlockWidth) maxBlockWidth = totalLw;
          });
        }
      });
      
      finalWidth = Math.max(finalWidth, maxBlockWidth + paddingX);
    }

    return finalWidth;
  }

  /**
   * Helper to accurately measure node height identically to the renderer
   */
  protected getNodeHeight(node: TreeNode): number {
    const scale = LAYOUT_CONFIG.BASE_SCALE;
    const depth = node.depth || 0;
    const fontSize = getNoteBlockFontSize(depth);
    const fontWeight = getNoteBlockFontWeight(depth);
    const lineHeight = getNoteBlockLineHeight(depth);
    
    // Use the shared context — avoids creating a new canvas element per call
    const ctx = BaseLayout.getSharedMeasureCtx();

    const measureFn = (txt: string, font: string) => {
      if (ctx) {
        ctx.font = font;
        return ctx.measureText(txt).width;
      }
      return txt.length * (fontSize * 0.6);
    };

    const maxWidthLimit = depth === 0 ? LAYOUT_CONFIG.ROOT_MAX_WIDTH : Infinity;
    const content = node.metadata.displayContent ?? node.content ?? '';
    const cleanContent = content.replace(/\[(codeblock|quoteblock|image|tableblock):\d+\]/gi, '').trim();
    
    const displayLines = wrapText(cleanContent, maxWidthLimit - (24 * scale), fontSize, fontWeight, measureFn);
    const lineCount = displayLines.length;

    let totalHeight = (lineCount * lineHeight) + (24 * scale); // padding.y * 2 (12 * 0.75 * 2 = 18)

    // Account for images in height
    if (node.metadata.image) {
      const image = node.metadata.image;
      const imgConfig = LAYOUT_CONFIG.IMAGE;
      
      let thumbH = 0;
      const cached = imageDimensionStore.getDimensions(image.url);
      const w = cached?.width || image.width || 0;
      const h = cached?.height || image.height || 0;

      if (w > 0 && h > 0) {
        const ratioW = imgConfig.MAX_WIDTH / w;
        const ratioH = imgConfig.MAX_HEIGHT / h;
        const imgScale = (w > imgConfig.MAX_WIDTH || h > imgConfig.MAX_HEIGHT) ? Math.min(ratioW, ratioH) : 1;
        thumbH = h * imgScale;
      } else {
        const isActuallyLoading = imageDimensionStore.isLoading(image.url);
        thumbH = isActuallyLoading ? 30 : 0;
      }

      if (thumbH > 0) {
        totalHeight += thumbH;
        if (cleanContent.length > 0) {
          totalHeight += imgConfig.PADDING;
        }
      }
    }

    // Account for Note Blocks (Code/Quote/Table)
    const NB = LAYOUT_CONFIG.NOTE_BLOCK;
    const codeBlocks = node.metadata.codeBlocks || [];
    const quoteBlocks = node.metadata.quoteBlocks || [];
    const tableBlocks = node.metadata.tableBlocks || [];
    
    if (codeBlocks.length > 0 || quoteBlocks.length > 0 || tableBlocks.length > 0) {
      const allBlocks = [
        ...codeBlocks.map(b => ({ ...b, type: 'code' })),
        ...quoteBlocks.map(b => ({ ...b, type: 'quote' })),
        ...tableBlocks.map(b => ({ ...b, type: 'table' }))
      ];
      
      const hasText = displayLines.length > 0;
      allBlocks.forEach((block, idx) => {
        if (hasText || idx > 0) {
          totalHeight += NB.PILL_GAP;
        }
        if (block.expanded) {
          if (block.type === 'table') {
            const table = block as any;
            const headerRows = table.headers?.length ? 1 : 0;
            const totalRows = (table.rows?.length || 0) + headerRows;
            totalHeight += NB.TABLE_HEADER_HEIGHT + (totalRows * NB.TABLE_ROW_HEIGHT) + (NB.TABLE_V_PADDING * 2);
          } else {
            const blockLinesContent = (block.type === 'code' ? (block as any).code : (block as any).text) || '';
            const blockLineCount = blockLinesContent.split('\n').length;
            const vPad = block.type === 'code' ? NB.CODE_V_PADDING : NB.QUOTE_V_PADDING;
            const lineHValue = block.type === 'code' ? NB.CODE_LINE_HEIGHT : NB.QUOTE_LINE_HEIGHT;
            totalHeight += NB.CODE_HEADER_HEIGHT + vPad + (blockLineCount * lineHValue) + vPad;
          }
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
