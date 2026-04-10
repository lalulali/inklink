/**
 * Feature: D3.js Renderer Implementation
 * Purpose: Implements mind map visualization using D3.js
 * Dependencies: D3.js, RendererAdapter interface, core types
 */

import * as d3 from 'd3';
import { RendererAdapter } from '../adapters/renderer-adapter';
import { TreeNode, Position, NodeChange, Transform } from '@/core/types';
import { ViewportCuller } from './viewport-culler';
import { ColorManager, RendererColors } from '@/core/theme/color-manager';
import { LAYOUT_CONFIG } from '@/core/layout/layout-config';
import { imageDimensionStore } from '@/core/utils/image-store';
import { 
  wrapText, 
  getNoteBlockFontSize, 
  getNoteBlockFontWeight, 
  getNoteBlockLineHeight,
  parseMarkdownLine
} from '@/core/utils/text-rendering';

/**
 * Web implementation of RendererAdapter using D3.js
 * Inspired by Markmap but customized for Inklink architecture
 */
export class D3Renderer implements RendererAdapter {
  private container: HTMLElement | null = null;
  private svg: d3.Selection<SVGSVGElement, unknown, null, undefined> | null = null;
  private g: d3.Selection<SVGGElement, unknown, null, undefined> | null = null;
  private zoom: d3.ZoomBehavior<SVGSVGElement, unknown> | null = null;
  private culler = new ViewportCuller();
  private lastRoot: TreeNode | null = null;
  private lastPositions: Map<string, Position> | null = null;
  private highlightIds: Set<string> = new Set();
  private selectedNodeId: string | null = null;
  private isVertical: boolean = false;
  private isDarkMode: boolean = false;
  private measureCtx: CanvasRenderingContext2D | null = null;

  // Measure cache: maps nodeId -> { contentKey, width, height }
  // Avoids re-measuring nodes whose content hasn't changed
  private measureCache: Map<string, { contentKey: string; width: number; height: number }> = new Map();

  public onTransform?: (transform: Transform) => void;

  /**
   * Node configuration
   */
  private readonly config = {
    padding: {
      x: 12 * 0.75, // 9
      y: 12 * 0.75   // 9 (increased to match x)
    },
    margin: {
      x: 40 * 0.75, // 30
      y: 20 * 0.75  // 15
    },
    borderRadius: 6,
    animationDuration: 250,
    staggerDelay: 0,
    highlightColor: RendererColors.action.highlight,
  };

  /**
   * Helper to get font size based on node depth (Heading style)
   */
  private getFontSize(depth: number): number {
    return getNoteBlockFontSize(depth);
  }

  private getFontWeight(depth: number): string {
    return getNoteBlockFontWeight(depth);
  }

  private getLineHeight(depth: number): number {
    return getNoteBlockLineHeight(depth);
  }

  /**
   * Helper to wrap text into lines based on maximum width.
   * This is Markdown-aware to ensure links are treated as atomic units and don't wrap mid-line.
   */
  private wrapText(text: string, maxWidth: number, fontSize: number, fontWeight: string): string[] {
    const measure = (txt: string, font: string) => {
      if (this.measureCtx) {
        this.measureCtx.font = font;
        return this.measureCtx.measureText(txt).width;
      }
      return txt.length * (fontSize * 0.6); // Fallback
    };
    return wrapText(text, maxWidth, fontSize, fontWeight, measure);
  }

  /**
   * Initialize D3 SVG container
   */
  initialize(container: HTMLElement): void {
    this.container = container;

    // Clear existing content
    d3.select(container).selectAll('*').remove();

    this.svg = d3.select(container)
      .append('svg')
      .attr('width', '100%')
      .attr('height', '100%')
      .attr('class', 'inklink-canvas');

    // Create container groups
    this.g = this.svg.append('g').attr('class', 'mindmap-content');
    this.g.append('g').attr('class', 'links-layer');
    this.g.append('g').attr('class', 'nodes-layer');

    // Setup zoom/pan
    this.zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 4])
      .translateExtent([[-5000, -5000], [5000, 5000]])
      .filter((event) => {
        // Only allow panning via drag when no modifier keys are pressed
        return !event.ctrlKey && !event.altKey && !event.metaKey && (event.button === 0 || event.button === 1);
      })
      .on('start', () => {
        this.svg?.style('cursor', 'grabbing');
      })
      .on('zoom', (event) => {
        if (this.g) {
          this.g.attr('transform', event.transform);
        }

        // Sync with React state
        if (this.onTransform) {
          this.onTransform({
            x: event.transform.x,
            y: event.transform.y,
            scale: event.transform.k,
          });
        }
      })
      .on('end', () => {
        this.svg?.style('cursor', 'grab');
      });

    this.svg.call(this.zoom)
      .style('cursor', 'grab')
      // Override default wheel behavior to support custom Pan/Zoom combinations
      .on('wheel.zoom', (event: WheelEvent) => {
        // Prevent default browser scrolling
        event.preventDefault();

        const isZoom = event.ctrlKey || event.altKey || event.metaKey;

        if (isZoom) {
          // Handle Zoom: Alt+Wheel (Mac) or Ctrl+Wheel (Win)
          const delta = -event.deltaY * (event.deltaMode === 1 ? 0.05 : event.deltaMode === 2 ? 1 : 0.002);
          const factor = Math.pow(2, delta);

          // Zoom toward mouse pointer
          const [mx, my] = d3.pointer(event, this.svg?.node());
          if (this.zoom && this.svg) {
            this.zoom.scaleBy(this.svg as any, factor, [mx, my]);
          }
        } else {
          // Handle Pan: Wheel (Vertical) and Shift+Wheel (Horizontal)
          let dx = event.deltaX;
          let dy = event.deltaY;

          // Normalize Shift+Scroll (some browsers don't swap axes automatically)
          if (event.shiftKey && Math.abs(dy) > Math.abs(dx)) {
            dx = dy;
            dy = 0;
          }

          // Scale deltas based on deltaMode (lines/pages to pixels)
          if (event.deltaMode === 1) { // lines
            dx *= 20;
            dy *= 20;
          } else if (event.deltaMode === 2) { // pages
            dx *= 200;
            dy *= 200;
          }

          if (this.zoom && this.svg) {
            this.zoom.translateBy(this.svg as any, -dx, -dy);
          }
        }
      }, { passive: false });

    // Subscribe to image store updates to trigger re-layout when images load
    imageDimensionStore.subscribe(() => {
      if (this.lastRoot) {
        this.nodeUpdateCallback(this.lastRoot.id);
      }
    });
  }

  /**
   * Render the complete tree
   */
  render(root: TreeNode, positions: Map<string, Position>, isDarkMode: boolean = false): void {
    if (!this.g || !this.svg || !root || !positions) {
      if (!root || !positions) this.clear();
      return;
    }
    this.isDarkMode = isDarkMode;

    // Safety check for NaN positions which can break d3 transitions
    for (const pos of positions.values()) {
      if (Number.isNaN(pos.x) || Number.isNaN(pos.y)) {
        console.error('D3Renderer: Invalid positions (NaN) detected', positions);
        this.clear();
        return;
      }
    }

    this.lastRoot = root;
    this.lastPositions = positions;

    // Detect layout orientation from tree structure
    if (root.children.length > 0) {
      const rootPos = positions.get(root.id) || { x: 0, y: 0 };
      let maxDx = 0;

      // Heuristic: In horizontal layouts (L-R, R-L, Two-Sided), 
      // children are placed at a significant horizontal distance (levelSpacing).
      // In vertical layouts (T-B, B-T), children are centered horizontally (dx ≈ 0).
      root.children.forEach(child => {
        const childPos = positions.get(child.id);
        if (childPos) {
          maxDx = Math.max(maxDx, Math.abs(childPos.x - rootPos.x));
        }
      });

      this.isVertical = maxDx < 40; // levelSpacing is typically 80-100, sibling spacing is 40
    }

    // Heuristic measurement for nodes
    const allNodes = this.flattenTree(root);

    // Update zoom translate extent based on actual map bounds with padding
    // This allows the "canvas to grow on the fly" as content is added or expanded.
    if (this.zoom && this.svg) {
      let minX = 0, maxX = 0, minY = 0, maxY = 0;
      allNodes.forEach(node => {
        const pos = positions.get(node.id);
        if (pos) {
          const w = (node as any).metadata?.width || 100;
          const h = (node as any).metadata?.height || 40;
          minX = Math.min(minX, pos.x - w);
          maxX = Math.max(maxX, pos.x + w);
          minY = Math.min(minY, pos.y - h);
          maxY = Math.max(maxY, pos.y + h);
        }
      });

      // Add 2000px padding to the calculated bounds for freedom of movement
      this.zoom.translateExtent([
        [minX - 2000, minY - 2000],
        [maxX + 2000, maxY + 2000]
      ]);
    }


    // Ensure measuring context is available
    if (!this.measureCtx) {
      const canvas = document.createElement('canvas');
      this.measureCtx = canvas.getContext('2d');
    }
    const ctx = this.measureCtx;

    // Measure all nodes (cache skips unchanged nodes)
    allNodes.forEach(node => this.measureNode(node));

    // Viewport culling: only render nodes within the current viewport
    let nodesToRender = allNodes;
    if (this.svg && allNodes.length > 30) {
      const t = d3.zoomTransform(this.svg.node() as SVGSVGElement);
      const bounds = this.getViewportBounds();
      const visibleIds = this.culler.getVisibleNodes(
        root,
        positions,
        { x: t.x, y: t.y, scale: t.k },
        bounds.width,
        bounds.height
      );
      // Always include root and direct children for stability
      nodesToRender = allNodes.filter(n => visibleIds.has(n.id) || n.depth <= 1);
    }

    // Links are visible if target is visible
    const allLinks = this.getLinks(allNodes);
    const linksToRender = allLinks;

    this.renderLinks(linksToRender, positions);
    this.renderNodes(nodesToRender, positions);
  }

  /**
   * Calculates a stable content key for a node to detect measurement cache invalidation.
   */
  private getMeasureContentKey(node: TreeNode): string {
    const display = (node as any).metadata?.displayContent ?? node.content ?? '';
    const imageUrl = node.metadata.image?.url ?? '';
    const codeCount = (node.metadata.codeBlocks ?? []).reduce((s: number, b: any) => s + (b.expanded ? 1 : 0) + b.code.length, 0);
    const quoteCount = (node.metadata.quoteBlocks ?? []).reduce((s: number, b: any) => s + (b.expanded ? 1 : 0) + b.text.length, 0);
    const tableCount = (node.metadata.tableBlocks ?? []).reduce((s: number, b: any) => s + (b.expanded ? 1 : 0), 0);
    // Include image dimension state so the cache is busted once the image loads
    let imageState = 'none';
    if (imageUrl) {
      const dims = imageDimensionStore.getDimensions(imageUrl);
      if (dims) {
        imageState = `${dims.width}x${dims.height}`;
      } else if (imageDimensionStore.isLoading(imageUrl)) {
        imageState = 'loading';
      } else {
        imageState = 'pending';
      }
    }
    return `${node.depth}|${display.length}|${imageUrl}|${imageState}|${codeCount}|${quoteCount}|${tableCount}`;
  }

  /**
   * Calculates the width and height of a node based on its content, images, and note blocks.
   * Results are cached by node ID + content key to avoid redundant re-measurement.
   */
  private measureNode(node: TreeNode): void {
    if (!this.measureCtx) {
      const canvas = document.createElement('canvas');
      this.measureCtx = canvas.getContext('2d');
    }
    const ctx = this.measureCtx;

    // Check measure cache — skip if content hasn't changed
    const contentKey = this.getMeasureContentKey(node);
    const cached = this.measureCache.get(node.id);
    if (cached && cached.contentKey === contentKey) {
      node.metadata.width = cached.width;
      node.metadata.height = cached.height;
      return;
    }

    const depth = node.depth || 0;
    const fontSize = this.getFontSize(depth);
    const fontWeight = this.getFontWeight(depth);
    const lineHeight = this.getLineHeight(depth);
    const rootMaxW = (depth === 0 ? LAYOUT_CONFIG.ROOT_MAX_WIDTH : Infinity) - (this.config.padding.x * 2);

    if (ctx) ctx.font = `${fontWeight} ${fontSize}px Inter, sans-serif`;

    // Use the unified wrapText helper for accurate line count and width
    let displayContent = (node as any).metadata?.displayContent ?? node.content;
    
    // Strip internal placeholders from the rendered text to avoid clutter
    displayContent = displayContent.replace(/\[(codeblock|quoteblock|image|tableblock):\d+\]/gi, '').trim();

    const displayLines = this.wrapText(displayContent, rootMaxW, fontSize, fontWeight);
    let maxWidth = 0;

    displayLines.forEach(line => {
      const segments = parseMarkdownLine(line);
      let lineWidth = 0;
      segments.forEach(seg => {
        if (ctx) {
          const segFontSize = (seg.subscript || seg.superscript) ? fontSize * 0.7 : fontSize;
          const segFontFamily = seg.keyboard ? LAYOUT_CONFIG.NOTE_BLOCK.MONO_FONT : 'Inter, sans-serif';
          ctx.font = `${seg.bold ? 'bold ' : fontWeight} ${seg.italic ? 'italic ' : ''}${segFontSize}px ${segFontFamily}`;
          lineWidth += ctx.measureText(seg.text).width;
        } else {
          const segFontSize = (seg.subscript || seg.superscript) ? fontSize * 0.7 : fontSize;
          lineWidth += seg.text.length * (segFontSize * 0.6);
        }
      });
      maxWidth = Math.max(maxWidth, lineWidth);
    });

    const hasText = displayContent.length > 0;
    node.metadata.width = maxWidth + (this.config.padding.x * 2);
    node.metadata.height = (hasText ? (displayLines.length * lineHeight) : 0) + (this.config.padding.y * 2);

    // Account for images in measurement
    if (node.metadata.image) {
      const image = node.metadata.image;
      const imgConfig = LAYOUT_CONFIG.IMAGE;

      // Try to get dimensions from store
      const dims = imageDimensionStore.getDimensions(image.url);
      if (dims) {
        image.width = dims.width;
        image.height = dims.height;
        image.aspect = dims.aspect;
      }

      // Base dimensions: Use 0 as placeholder if not loaded to allow collapsing/expansion
      const w = image.width || 0;
      const h = image.height || 0;
      
      let scale = 1;
      if (w > 0 && h > 0) {
        const ratioW = imgConfig.MAX_WIDTH / w;
        const ratioH = imgConfig.MAX_HEIGHT / h;

        if (w > imgConfig.MAX_WIDTH || h > imgConfig.MAX_HEIGHT) {
          scale = Math.min(ratioW, ratioH);
        }
        
        image.thumbWidth = w * scale;
        image.thumbHeight = h * scale;
      } else {
        // While loading or if failed, use a small fixed placeholder
        // If the loading set is empty and cache is empty for this URL, it means it failed
        const isActuallyLoading = imageDimensionStore.isLoading(image.url);
        image.thumbWidth = isActuallyLoading ? 40 : 0;
        image.thumbHeight = isActuallyLoading ? 30 : 0;
      }

      // Update node height: Add thumbnail height
      const thumbH = image.thumbHeight ?? 0;
      const thumbW = image.thumbWidth ?? 0;
      node.metadata.height += thumbH;
      // Add gap only if there is text AND image is non-zero
      if (hasText && thumbH > 0) {
        node.metadata.height += imgConfig.PADDING;
      }
      
      // Update node width: max(textWidth, thumbWidth)
      if (thumbW > maxWidth) {
        node.metadata.width = thumbW + (this.config.padding.x * 2);
      }
    }

    // Account for code/quote note blocks in height
    const NB = LAYOUT_CONFIG.NOTE_BLOCK;
    const codeBlocks = node.metadata.codeBlocks || [];
    const quoteBlocks = node.metadata.quoteBlocks || [];
    const tableBlocks = node.metadata.tableBlocks || [];
    const allNoteBlocks: Array<{ expanded: boolean; content: string; isQuote: boolean; isTable: boolean; headers?: string[]; rows?: string[][] }> = [
      ...codeBlocks.map(b => ({ expanded: b.expanded, content: b.code, isQuote: false, isTable: false })),
      ...quoteBlocks.map(b => ({ expanded: b.expanded, content: b.text, isQuote: true, isTable: false })),
      ...tableBlocks.map(b => ({ expanded: b.expanded, content: '', isQuote: false, isTable: true, headers: b.headers, rows: b.rows })),
    ];

    if (allNoteBlocks.length > 0) {
      let maxNoteWidth = 180 * 0.75; // Baseline width for minimum pill display
      allNoteBlocks.forEach((block, idx) => {
        if (hasText || idx > 0) {
          node.metadata.height += NB.PILL_GAP;
        }

        if (!block.expanded) {
          node.metadata.height += NB.PILL_HEIGHT;
        } else if (block.isTable) {
          // Table height
          const headerRows = block.headers?.length ? 1 : 0;
          const totalRows = (block.rows?.length || 0) + headerRows;
          const tableH = NB.TABLE_HEADER_HEIGHT + (totalRows * NB.TABLE_ROW_HEIGHT) + (NB.TABLE_V_PADDING * 2);
          node.metadata.height += tableH;

          // Table width (sum of max column widths)
          const colCount = Math.max(block.headers?.length || 0, ...(block.rows?.map(r => r.length) || [0]));
          if (colCount > 0) {
            const colWidths = new Array(colCount).fill(0);
            if (ctx) ctx.font = `${NB.TABLE_LINE_HEIGHT}px Inter, sans-serif`;

            block.headers?.forEach((h, i) => {
              const w = ctx ? ctx.measureText(h).width : h.length * NB.TABLE_LINE_HEIGHT * 0.6;
              colWidths[i] = Math.max(colWidths[i], w + NB.TABLE_CELL_HPADDING * 2);
            });
            block.rows?.forEach(row => {
              row.forEach((cell, i) => {
                const w = ctx ? ctx.measureText(cell).width : cell.length * NB.TABLE_LINE_HEIGHT * 0.6;
                colWidths[i] = Math.max(colWidths[i], w + NB.TABLE_CELL_HPADDING * 2);
              });
            });
            const maxIndividualColWidth = Math.max(...colWidths);
            const totalTableW = maxIndividualColWidth * colCount;
            if (totalTableW > maxNoteWidth) maxNoteWidth = totalTableW;
          }
        } else {
          // Code/Quote block height
          const lines = (block.content || '').split('\n');

          // Calculate note block lines width
          const fontRef = block.isQuote ? `${NB.QUOTE_LINE_HEIGHT}px Inter, sans-serif` : `${NB.CODE_LINE_HEIGHT}px ${NB.MONO_FONT.replace(/'/g, "")}`;
          if (ctx) ctx.font = fontRef;
          lines.forEach(line => {
            let lineWidth = 0;
            if (ctx) {
              lineWidth = ctx.measureText(line).width + (block.isQuote ? NB.QUOTE_BORDER_WIDTH + 16 : 16);
            } else {
              lineWidth = line.length * ((block.isQuote ? NB.QUOTE_LINE_HEIGHT : NB.CODE_LINE_HEIGHT) * 0.6) + 16;
            }
            if (lineWidth > maxNoteWidth) maxNoteWidth = lineWidth;
          });

          const vPad = block.isQuote ? NB.QUOTE_V_PADDING : NB.CODE_V_PADDING;
          const lineH = block.isQuote ? NB.QUOTE_LINE_HEIGHT : NB.CODE_LINE_HEIGHT;
          const expandedH = NB.CODE_HEADER_HEIGHT + vPad + (lines.length * lineH) + vPad;
          node.metadata.height += expandedH;
        }
      });

      if (maxNoteWidth > maxWidth) {
        maxWidth = maxNoteWidth;
        node.metadata.width = maxWidth + (this.config.padding.x * 2);
      }
    }

    // Store result in cache
    this.measureCache.set(node.id, {
      contentKey,
      width: node.metadata.width,
      height: node.metadata.height,
    });
  }

  /**
   * Update specific nodes
   */
  update(changes: NodeChange[]): void {
    if (this.lastRoot && this.lastPositions) {
      this.render(this.lastRoot, this.lastPositions, this.isDarkMode);
    }
  }

  /**
   * Fast-path: update only stroke visuals for highlight/selection
   * without triggering a full data join re-render.
   */
  private updateNodeVisuals(): void {
    if (!this.g) return;
    this.g.selectAll<SVGRectElement, TreeNode>('rect.node-bg')
      .style('stroke', (d) => {
        if (this.selectedNodeId === d.id) return RendererColors.border.selected;
        if (this.highlightIds.has(d.id)) return this.config.highlightColor;
        if ((d as any).metadata?.codeBlocks?.length > 0 || (d as any).metadata?.quoteBlocks?.length > 0) return 'none';
        if (this.isDarkMode) {
          if (d.depth === 0) return RendererColors.border.rootDark;
          return RendererColors.border.branchDark;
        }
        if (d.depth === 0) return RendererColors.border.rootLight;
        return RendererColors.border.branchLight;
      })
      .attr('stroke-width', (d) => (this.selectedNodeId === d.id || this.highlightIds.has(d.id)) ? 3 : 1.5);
  }

  /**
   * Clear all rendered elements while preserving layer groups
   */
  clear(): void {
    if (this.g) {
      this.g.selectAll('g.nodes-layer *').remove();
      this.g.selectAll('g.links-layer *').remove();
    }
    this.lastRoot = null;
    this.lastPositions = null;
    this.measureCache.clear(); // Invalidate measure cache on full clear
  }

  /**
   * Export to SVG string
   */
  exportToSVG(): string {
    return this.svg?.node()?.outerHTML || '';
  }

  /**
   * Export to PNG using WebExportManager
   */
  async exportToPNG(background: 'transparent' | 'white'): Promise<Blob> {
    if (!this.svg) throw new Error('SVG not initialized');
    const exporter = new (require('./web-export-manager').WebExportManager)();
    return exporter.exportToPNG(this.svg.node() as SVGSVGElement, background);
  }

  /**
   * Focus and center viewport on a specific node
   */
  focusNode(nodeId: string, skipBrowserFocus: boolean = false): void {
    if (!this.svg || !this.zoom || !this.g) return;

    // Find node elements
    const node = this.g.select<SVGGElement>(`g.node[data-id="${nodeId}"]`);
    if (node.empty()) return;

    // Trigger browser focus for accessibility only if requested
    const nodeElement = node.node() as SVGGElement;
    if (nodeElement && !skipBrowserFocus) {
      nodeElement.focus();
    }

    const bounds = this.getViewportBounds();
    const pos = this.lastPositions?.get(nodeId);
    if (!pos || !nodeElement) return;

    // Calculate visual center of the node to handle large/card nodes correctly
    const bbox = nodeElement.getBBox();

    const x = pos.x + bbox.x + bbox.width / 2;
    const y = pos.y + bbox.y + bbox.height / 2;

    this.svg.transition()
      .duration(750)
      .ease(d3.easeCubicOut)
      .call(
        this.zoom.transform,
        d3.zoomIdentity
          .translate(bounds.width / 2, bounds.height / 2)
          .scale(1.5)
          .translate(-x, -y)
      );
  }

  /**
   * Fit the entire mind map into the current viewport
   */
  fitView(padding = 0.2): void {
    if (!this.svg || !this.zoom || !this.lastRoot || !this.lastPositions) return;

    const viewportBounds = this.getViewportBounds();
    if (viewportBounds.width === 0 || viewportBounds.height === 0) return;

    // Calculate map bounds
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;

    const nodes = this.flattenTree(this.lastRoot);
    nodes.forEach(node => {
      const pos = this.lastPositions!.get(node.id);
      if (pos) {
        const w = (node as any).metadata?.width || 0;
        const h = (node as any).metadata?.height || 0;

        // This is a rough estimation of where the bounds are. 
        // Horizontal nodes grow from pivot (x: 0 or -width)
        // Vertical nodes focus on center
        minX = Math.min(minX, pos.x - w);
        maxX = Math.max(maxX, pos.x + w);
        minY = Math.min(minY, pos.y - h);
        maxY = Math.max(maxY, pos.y + h);
      }
    });

    if (!Number.isFinite(minX)) return;

    const contentWidth = maxX - minX;
    const contentHeight = maxY - minY;
    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;

    const scale = (1 - padding) / Math.max(contentWidth / viewportBounds.width, contentHeight / viewportBounds.height);
    const finalScale = Math.max(0.1, Math.min(2.5, scale));

    this.svg.transition()
      .duration(750)
      .ease(d3.easeCubicOut)
      .call(
        this.zoom.transform,
        d3.zoomIdentity
          .translate(viewportBounds.width / 2, viewportBounds.height / 2)
          .scale(finalScale)
          .translate(-centerX, -centerY)
      );
  }

  /**
   * Get viewport bounds
   */
  getViewportBounds(): { width: number; height: number } {
    const rect = this.container?.getBoundingClientRect() || { width: 0, height: 0 };
    return { width: rect.width, height: rect.height };
  }

  /**
   * Set the current transform from external source (e.g., Minimap)
   */
  setTransform(transform: Transform): void {
    if (!this.svg || !this.zoom) return;

    this.svg.call(
      this.zoom.transform,
      d3.zoomIdentity.translate(transform.x, transform.y).scale(transform.scale)
    );
  }

  /**
   * Get the current transform as reported by D3 zoom state
   */
  getTransform(): Transform {
    if (!this.svg) return { x: 0, y: 0, scale: 1 };
    const t = d3.zoomTransform(this.svg.node() as SVGSVGElement);
    return { x: t.x, y: t.y, scale: t.k };
  }

  private nodeClickCallback: (nodeId: string) => void = () => { };
  private nodeDoubleClickCallback: (nodeId: string) => void = () => { };
  private nodeToggleCallback: (nodeId: string) => void = () => { };
  private nodeUpdateCallback: (nodeId: string) => void = () => { };
  private nodeLinkClickCallback: (url: string) => void = () => { };
  private nodeImageClickCallback: (url: string, alt?: string, link?: string) => void = () => { };
  private blockToggleCallback: (nodeId: string) => void = () => { };

  /**
   * Register callback for node click events
   */
  onNodeClick(callback: (nodeId: string) => void): void {
    this.nodeClickCallback = callback;
  }

  /**
   * Register callback for node double click events
   */
  onNodeDoubleClick(callback: (nodeId: string) => void): void {
    this.nodeDoubleClickCallback = callback;
  }

  /**
   * Register callback for node toggle events
   */
  onNodeToggle(callback: (nodeId: string) => void): void;

  onNodeToggle(callback: (nodeId: string) => void): void {
    this.nodeToggleCallback = callback;
  }

  /**
   * Register callback for node update (e.g. content/size change)
   */
  onNodeUpdate(callback: (nodeId: string) => void): void {
    this.nodeUpdateCallback = callback;
  }

  /**
   * Register callback for node link click events
   */
  onNodeLinkClick(callback: (url: string) => void): void {
    this.nodeLinkClickCallback = callback;
  }

  /**
   * Register callback for node image click events (for lightbox)
   */
  onNodeImageClick(callback: (url: string, alt?: string, link?: string) => void): void {
    this.nodeImageClickCallback = callback;
  }

  /**
   * Register callback for block toggle events (expansion of code/quote)
   */
  onBlockToggle(callback: (nodeId: string) => void): void {
    this.blockToggleCallback = callback;
  }

  /**
   * Highlight specified nodes
   */
  highlightNodes(nodeIds: string[]): void {
    this.highlightIds = new Set(nodeIds);
    // Fast path: only update stroke visuals, no full re-render
    if (this.g) {
      this.updateNodeVisuals();
      return;
    }
    if (this.lastRoot && this.lastPositions) {
      this.render(this.lastRoot, this.lastPositions, this.isDarkMode);
    }
  }

  /**
   * Set the selected node for highlighting and focus
   */
  setSelectedNode(nodeId: string | null): void {
    this.selectedNodeId = nodeId;
    // Fast path: only update stroke visuals, no full re-render
    if (this.g) {
      this.updateNodeVisuals();
      return;
    }
    if (this.lastRoot && this.lastPositions) {
      this.render(this.lastRoot, this.lastPositions, this.isDarkMode);
    }
  }

  /**
   * Render nodes using D3 data join
   */
  private renderNodes(nodes: TreeNode[], positions: Map<string, Position>): void {
    if (!this.g) return;
    const thisRenderer = this;
    const layer = this.g.select('g.nodes-layer');

    const nodeGroups = layer.selectAll<SVGGElement, TreeNode>('g.node')
      .data(nodes, (d) => d.id);

    // EXIT: fly to the nearest visible ancestor
    nodeGroups.exit()
      .transition()
      .duration(this.config.animationDuration)
      .ease(d3.easeCubicOut)
      .attr('opacity', 0)
      .attr('transform', (d: any) => {
        const fallbackPos = this.lastPositions?.get(d.id) || { x: 0, y: 0 };

        // Walk up the tree to find the nearest visible ancestor
        let ancestor = d.parent;
        while (ancestor && !positions.has(ancestor.id)) {
          ancestor = ancestor.parent;
        }

        if (ancestor) {
          const parentPos = positions.get(ancestor.id)!;
          return `translate(${parentPos.x}, ${parentPos.y})`;
        }
        return `translate(${fallbackPos.x}, ${fallbackPos.y})`;
      })
      .remove();

    // ENTER
    const enter = nodeGroups.enter()
      .append('g')
      .attr('class', 'node')
      .attr('cursor', 'pointer')
      .attr('opacity', 0)
      .attr('tabindex', -1)
      .style('outline', 'none')
      .attr('role', 'button')
      .attr('aria-label', (d) => `Node: ${d.content}`)
      .attr('transform', (d) => {
        const targetPos = positions.get(d.id) || { x: 0, y: 0 };

        // INSERTION SLOT ANIMATION:
        // When a new node is inserted between existing siblings, it should emerge
        // from the slot being vacated — i.e. the next sibling's OLD position —
        // so the viewer sees it "push out" between the surrounding nodes.
        if (d.parent && this.lastPositions) {
          const siblings = d.parent.children;
          const myIndex = siblings.findIndex((s: any) => s.id === d.id);

          if (myIndex >= 0) {
            // Next sibling = the node that is being displaced downward
            const nextSibling = siblings[myIndex + 1];
            const nextLastPos = nextSibling && this.lastPositions.get(nextSibling.id);
            if (nextLastPos) {
              // Start at the displaced sibling's old slot, on the same X axis as target
              return `translate(${targetPos.x}, ${nextLastPos.y})`;
            }

            // Appended at the end: start from the previous sibling's current position
            const prevSibling = myIndex > 0 ? siblings[myIndex - 1] : null;
            const prevLastPos = prevSibling && this.lastPositions.get(prevSibling.id);
            if (prevLastPos) {
              return `translate(${targetPos.x}, ${prevLastPos.y})`;
            }
          }
        }

        // RECURSIVE FLY-OUT fallback (expand branch / first child):
        // Walk up the tree to find the nearest ancestor that WAS already visible.
        let ancestor = d.parent;
        while (ancestor && !this.lastPositions?.has(ancestor.id)) {
          ancestor = ancestor.parent;
        }

        const startPos = (ancestor && this.lastPositions?.get(ancestor.id)) ||
          (d.parent && positions.get(d.parent.id)) ||
          targetPos;

        return `translate(${startPos.x}, ${startPos.y})`;
      })
      .on('click', (event, d) => {
        event.stopPropagation();
        this.nodeClickCallback(d.id);
      })
      .on('dblclick', (event, d) => {
        event.stopPropagation();
        this.nodeDoubleClickCallback(d.id);
      })
      .on('focus', (_, d) => {
        // When focused via keyboard, trigger selection
        this.nodeClickCallback(d.id);
      });

    // Create unique clip path per node to prevent block text overflows during animation
    const defs = enter.append('defs');
    defs.append('clipPath')
      .attr('id', d => `clip-${d.id}`)
      .append('rect')
      .attr('rx', this.config.borderRadius)
      .attr('ry', this.config.borderRadius);

    enter.append('rect')
      .attr('class', 'node-bg')
      .attr('rx', this.config.borderRadius)
      .attr('ry', this.config.borderRadius)
      .attr('stroke-width', 2);


    enter.append('text')
      .attr('font-family', 'Inter, sans-serif')
      .attr('xml:space', 'preserve');

    enter.append('g')
      .attr('class', 'image-container')
      .append('image');

    // UPDATE with transition — staggered by depth for cascade feel
    const update = enter.merge(nodeGroups);

    update.attr('data-id', (d) => d.id)
      .interrupt() // Prevent queuing jitter
      .transition()
      .duration(this.config.animationDuration)
      .ease(d3.easeCubicOut)
      .delay(0)
      .attr('opacity', 1)
      .attr('transform', (d) => {
        const pos = positions.get(d.id) || { x: 0, y: 0 };
        return `translate(${pos.x}, ${pos.y})`;
      });

    update.select('text')
      .each(function (d) {
        const textElement = d3.select(this);
        const depth = d.depth || 0;
        const fontSize = thisRenderer.getFontSize(depth);
        const fontWeight = thisRenderer.getFontWeight(depth);

        const displayContent = (d as any).metadata?.displayContent ?? d.content;
        const displayLines = thisRenderer.wrapText(
          displayContent,
          depth === 0 ? LAYOUT_CONFIG.ROOT_MAX_WIDTH - (thisRenderer.config.padding.x * 2) : Infinity,
          fontSize,
          fontWeight
        );

        // Calculate the target x (mirrors the logic used for the text element transition)
        const width = (d as any).metadata?.width || 0;
        let x: number;
        if (thisRenderer.isVertical) {
          x = -width / 2 + thisRenderer.config.padding.x;
        } else {
          const pos = positions.get(d.id) || { x: 0, y: 0 };
          const parentPos = d.parent ? (positions.get(d.parent.id) || { x: 0, y: 0 }) : null;
          if (!parentPos) x = -width / 2 + thisRenderer.config.padding.x;
          else if (pos.x < parentPos.x) x = -width + thisRenderer.config.padding.x;
          else x = thisRenderer.config.padding.x;
        }

        // 1. Stable join for multi-line text lines
        const tspanJoin = textElement.selectAll<SVGTSpanElement, string>('tspan.line')
          .data(displayLines, (line, i) => i); // Use index for stability during typing

        tspanJoin.exit().remove();

        const tspanEnter = tspanJoin.enter()
          .append('tspan')
          .attr('class', 'line');

        const tspanUpdate = tspanEnter.merge(tspanJoin);

        // Compute the node background fill for link contrast logic
        const nodeFill = (() => {
          if (thisRenderer.isDarkMode) {
            if (depth === 0) return RendererColors.node.rootFillDark;
            return ColorManager.getThemeShade(d.color, true) || RendererColors.node.branchFallbackDark;
          }
          if (depth === 0) return RendererColors.node.rootFillLight;
          return d.color || RendererColors.node.branchFallbackLight;
        })();

        // 2. Vertical centering offset calculation
        const totalLines = displayLines.length;
        const textH = totalLines * thisRenderer.getLineHeight(depth);
        const height = (d as any).metadata?.height || 0;

        let yOffset = -height / 2 + thisRenderer.config.padding.y;
        const image = d.metadata.image;
        const imgH = (image && (image.thumbHeight ?? 0) > 0) ? (image.thumbHeight ?? 0) : 0;
        const hasText = displayLines.length > 0;
        const imgGap = (imgH > 0 && hasText) ? LAYOUT_CONFIG.IMAGE.PADDING : 0;
        yOffset += imgH + imgGap;
        const textOffset = yOffset + textH / 2;

        const duration = thisRenderer.config.animationDuration;
        textElement.interrupt().transition()
          .duration(duration)
          .ease(d3.easeCubicOut)
          .delay(0)
          .attr('y', textOffset)
          .attr('x', x);

        // Update each line's position instantly to avoid crawling
        // Pre-compute segments once per line to avoid redundant parseMarkdownLine calls
        const lineSegments = new Map<string, ReturnType<typeof parseMarkdownLine>>();
        displayLines.forEach(line => lineSegments.set(line, parseMarkdownLine(line)));

        tspanUpdate.attr('x', (line) => {
          const segments = lineSegments.get(line) ?? [];
          const isCentered = segments.some(s => s.center);
          
          if (isCentered) {
            if (thisRenderer.isVertical) return 0;
            // For horizontal layout, center of the node rect
            const width = (d as any).metadata?.width || 0;
            const parentPos = d.parent ? (positions.get(d.parent.id) || { x: 0, y: 0 }) : null;
            const pos = positions.get(d.id) || { x: 0, y: 0 };
            
            if (!parentPos) return 0;
            if (pos.x < parentPos.x) return -width / 2;
            return width / 2;
          }
          return x;
        })
        .style('text-anchor', (line) => {
          const segments = lineSegments.get(line) ?? [];
          return segments.some(s => s.center) ? 'middle' : null;
        })
        .attr('dy', (line, i) => i === 0 ? `${0.35 - (totalLines - 1) * 0.625}em` : '1.25em');

        // 4. Stable join for rich text segments (bold, italic, links)
        tspanUpdate.each(function (line) {
          const tspan = d3.select<SVGTSpanElement, string>(this);
          // Reuse pre-computed segments — no extra parseMarkdownLine call
          const segments = lineSegments.get(line) ?? parseMarkdownLine(line);
          const isCentered = segments.some(s => s.center);

          const segmentJoin = tspan.selectAll<SVGTSpanElement, any>('tspan.segment')
            .data(segments, (s, i) => `${s.text}-${i}`);

          segmentJoin.exit().remove();

          const segEnter = segmentJoin.enter()
            .append('tspan')
            .attr('class', 'segment');

          const segUpdate = segEnter.merge(segmentJoin);

          segUpdate.text(s => s.text)
            .style('font-weight', s => s.bold ? 'bold' : thisRenderer.getFontWeight(depth))
            .style('font-style', s => s.italic ? 'italic' : 'normal')
            .style('text-decoration', s => (s.underline || s.link) ? 'underline' : (s.strikethrough ? 'line-through' : 'none'))
            .style('font-size', s => (s.subscript || s.superscript) ? `${fontSize * 0.7}px` : `${fontSize}px`)
            .attr('baseline-shift', s => s.subscript ? 'sub' : (s.superscript ? 'super' : 'baseline'))
            .style('fill', s => {
              if (s.link) return ColorManager.getLinkColor(nodeFill);
              if (s.highlight) return RendererColors.inline.highlightText;
              return null;
            })
            .each(function(s) {
              if (s.highlight || s.keyboard) {
                const seg = d3.select(this);
                if (s.highlight) seg.style('fill', RendererColors.inline.highlightFill).style('font-weight', 'bold');
                if (s.keyboard) seg.style('font-family', LAYOUT_CONFIG.NOTE_BLOCK.MONO_FONT).style('fill', thisRenderer.isDarkMode ? RendererColors.inline.kbdDark : RendererColors.inline.kbdLight);
              }
              if (s.center) {
                // Centering inline is non-trivial in a flow. We'll skip for now or try to nudge.
              }
            })
            .style('cursor', s => (s.link || s.details) ? 'pointer' : 'default')
            .on('click', (event, s) => {
              if (s.link) {
                event.stopPropagation();
                thisRenderer.nodeLinkClickCallback(s.link);
              } else if (s.details) {
                event.stopPropagation();
                // Simple toggle for details if we had a state, for now just a click feedback
              }
            })
            .on('dblclick', event => event.stopPropagation());
        });
      })
      .attr('font-size', (d) => `${thisRenderer.getFontSize(d.depth)}px`)
      .attr('font-weight', (d) => thisRenderer.getFontWeight(d.depth))
      .attr('fill', (d) => {
        if (thisRenderer.isDarkMode) {
          if (d.depth === 0) return RendererColors.node.rootTextDark;
          return 'white';
        }
        return 'white';
      })
    // Render images and note blocks below node text with unified timing
    update.each(function (d) {
      const duration = thisRenderer.config.animationDuration;
      const staggerDelay = (d.depth || 0) * thisRenderer.config.staggerDelay;
      
      // Image rendering logic
      const image = d.metadata.image;
      const container = d3.select(this).select<SVGGElement>('g.image-container');

      if (!image) {
        container.interrupt().attr('opacity', 0);
      } else {
        const width = (d as any).metadata?.width || 0;
        const imgW = image.thumbWidth || 0;
        const imgH = image.thumbHeight || 0;
        const height = (d as any).metadata?.height || 0;

        let rectX: number;
        if (thisRenderer.isVertical) {
          rectX = -width / 2;
        } else {
          const pos = positions.get(d.id) || { x: 0, y: 0 };
          const parentPos = d.parent ? (positions.get(d.parent.id) || { x: 0, y: 0 }) : null;
          if (!parentPos) rectX = -width / 2;
          else if (pos.x < parentPos.x) rectX = -width;
          else rectX = 0;
        }

        container.interrupt()
          .transition()
          .duration(duration)
          .delay(staggerDelay)
          .ease(d3.easeCubicOut)
          .attr('opacity', 1)
          .attr('transform', `translate(${rectX + (width - imgW) / 2}, ${-height / 2 + thisRenderer.config.padding.y})`);

        const img = container.select<SVGImageElement>('image')
          .attr('width', imgW)
          .attr('height', imgH)
          .attr('href', image.url)
          .on('click', (event) => {
            event.stopPropagation();
            thisRenderer.nodeImageClickCallback(image.url, image.alt, image.link);
          });
      }

      thisRenderer.renderNoteBlocks(d3.select(this) as any, d, positions, duration, staggerDelay);
    });


    // Sync the clip path dimensions with the background rect
    update.select('clipPath rect')
      .interrupt()
      .transition()
      .duration(this.config.animationDuration)
      .ease(d3.easeCubicOut)
      .delay(0)
      .attr('width', (d) => (d as any).metadata?.width || 0)
      .attr('height', (d) => (d as any).metadata?.height || 0)
      .attr('x', function (d) {
        // Reuse same geometry as the background rect
        const width = (d as any).metadata?.width || 0;
        if (thisRenderer.isVertical) return -width / 2;
        const pos = positions.get(d.id) || { x: 0, y: 0 };
        const parentPos = d.parent ? (positions.get(d.parent.id) || { x: 0, y: 0 }) : null;
        if (!parentPos || pos.x >= parentPos.x) return 0;
        return -width;
      })
      .attr('y', (d) => -((d as any).metadata?.height || 0) / 2);

    update.select('rect.node-bg')
      .interrupt()
      .attr('rx', this.config.borderRadius)
      .attr('ry', this.config.borderRadius)
      .transition()
      .duration(this.config.animationDuration)
      .ease(d3.easeCubicOut)
      .delay(0)
      .attr('width', (d) => (d as any).metadata?.width || 0)
      .attr('height', (d) => (d as any).metadata?.height || 0)
      .attr('x', (d) => {
        const width = (d as any).metadata?.width || 0;
        if (thisRenderer.isVertical) return -width / 2;

        const pos = positions.get(d.id) || { x: 0, y: 0 };
        const parentPos = d.parent ? (positions.get(d.parent.id) || { x: 0, y: 0 }) : null;

        if (!parentPos) {
          return -width / 2;
        }

        if (pos.x < parentPos.x) {
          return -width;
        }
        return 0;
      })
      .attr('y', (d) => -((d as any).metadata?.height || 0) / 2)
      .attr('fill', (d) => {
        if (thisRenderer.isDarkMode) {
          if (d.depth === 0) return RendererColors.node.rootFillDark;
          return ColorManager.getThemeShade(d.color, true) || RendererColors.node.branchFallbackDark;
        }
        if (d.depth === 0) return RendererColors.node.rootFillLight;
        return d.color || RendererColors.node.branchFallbackLight;
      })
      .style('stroke', (d) => {
        if (this.selectedNodeId === d.id) return RendererColors.border.selected;
        if (this.highlightIds.has(d.id)) return this.config.highlightColor;
        if ((d as any).metadata?.codeBlocks?.length > 0 || (d as any).metadata?.quoteBlocks?.length > 0) return 'none';
        if (thisRenderer.isDarkMode) {
          if (d.depth === 0) return RendererColors.border.rootDark;
          return RendererColors.border.branchDark;
        }
        if (d.depth === 0) return RendererColors.border.rootLight;
        return RendererColors.border.branchLight;
      })
      .attr('stroke-width', (d) => (this.selectedNodeId === d.id || this.highlightIds.has(d.id)) ? 3 : 1.5);

    // Indicators logic: dependent on side
    const indicator = update.selectAll<SVGCircleElement, TreeNode>('circle.collapsible-indicator')
      .data(d => d.children.length > 0 ? [d] : [], d => d.id);

    indicator.exit().remove();

    indicator.enter()
      .append('circle')
      .attr('class', 'collapsible-indicator')
      .style('outline', 'none')
      .attr('r', 6)
      .attr('fill', 'none') // Managed by transition
      .attr('stroke-width', 2)
      .attr('role', 'button')
      .attr('aria-label', (d) => d.collapsed ? "Expand node" : "Collapse node")
      .attr('tabindex', -1) // Not directly tabbable, controlled via Enter on node
      .on('mouseover', function () { d3.select(this).attr('r', 8); })
      .on('mouseout', function () { d3.select(this).attr('r', 6); })
      .on('click', (event, d) => {
        event.stopPropagation();
        this.toggleNode(d);
      })
      .merge(indicator as any)
      .transition() // Use a new transition for enter/update
      .duration(this.config.animationDuration)
      .ease(d3.easeCubicOut)
      .delay((d) => (d.depth || 0) * this.config.staggerDelay)
      .attr('cx', (d) => {
        if (thisRenderer.isVertical) return 0; // Centered horizontally for vertical layouts
        const width = (d as any).metadata?.width || 0;
        const pos = positions.get(d.id) || { x: 0, y: 0 };
        const parentPos = d.parent ? (positions.get(d.parent.id) || { x: 0, y: 0 }) : null;
        if (!parentPos) {
          // Robust side detection: if any child is on the right, put indicator on the right
          const hasRightChild = d.children.some(child => {
            const childPos = positions.get(child.id);
            return childPos && childPos.x > pos.x;
          });
          if (hasRightChild) return width / 2;

          // Otherwise, if there are only left children, it must be RTL
          const hasLeftChild = d.children.some(child => {
            const childPos = positions.get(child.id);
            return childPos && childPos.x < pos.x;
          });
          if (hasLeftChild) return -width / 2;

          return width / 2; // Default for no children or LTR
        }
        if (pos.x < parentPos.x) return -width; // Left-side node
        return width; // Right-side node
      })
      .attr('cy', (d) => {
        if (!thisRenderer.isVertical) return 0; // Centered vertically for horizontal layouts
        const height = (d as any).metadata?.height || 0;
        const pos = positions.get(d.id) || { x: 0, y: 0 };

        // Determine Top-Down vs Bottom-Up based on children positions
        const firstChild = d.children[0];
        const childPos = firstChild ? positions.get(firstChild.id) : null;
        if (childPos && childPos.y < pos.y) {
          return -height / 2; // Bottom-up (children above): indicator at Top
        }
        return height / 2; // Top-down: indicator at Bottom
      })
      .style('stroke', (d) => {
        if (!thisRenderer.isDarkMode) {
          if (!d.parent || d.depth === 0) return RendererColors.border.rootLight;
          return RendererColors.border.branchLight;
        }
        if (!d.parent || d.depth === 0) return RendererColors.border.rootDark;
        return RendererColors.border.branchDark;
      })
      .attr('fill', (d) => {
        if (thisRenderer.isDarkMode) {
          if (d.collapsed) return 'white';
          if (d.depth === 0) return RendererColors.node.rootFillDark;
          return ColorManager.getThemeShade(d.color, true) || RendererColors.node.branchFallbackDark;
        }
        if (d.collapsed) return 'white';
        if (d.depth === 0) return RendererColors.node.rootFillLight;
        return d.color || RendererColors.node.branchFallbackLight;
      });
  }

  private renderNoteBlocks(
    nodeGroup: d3.Selection<SVGGElement, TreeNode, SVGGElement, unknown>,
    d: TreeNode,
    positions: Map<string, Position>,
    duration: number,
    delay: number
  ): void {
    const NB = LAYOUT_CONFIG.NOTE_BLOCK;
    const thisRenderer = this;
    const width = (d as any).metadata?.width || 0;
    const height = (d as any).metadata?.height || 0;
    const depth = d.depth || 0;

    const codeBlocks = d.metadata.codeBlocks || [];
    const quoteBlocks = d.metadata.quoteBlocks || [];
    const tableBlocks = d.metadata.tableBlocks || [];
    if (codeBlocks.length === 0 && quoteBlocks.length === 0 && tableBlocks.length === 0) {
      nodeGroup.selectAll('g.note-blocks').remove();
      return;
    }

    // Compute left-x of the node rect (mirrors rect positioning logic)
    let rectX: number;
    if (this.isVertical) {
      rectX = -width / 2;
    } else {
      const pos = positions.get(d.id) || { x: 0, y: 0 };
      const parentPos = d.parent ? (positions.get(d.parent.id) || { x: 0, y: 0 }) : null;
      if (!parentPos) rectX = -width / 2;
      else if (pos.x < parentPos.x) rectX = -width;
      else rectX = 0;
    }

    const textFontSize = this.getFontSize(depth);
    const textLineHeight = this.getLineHeight(depth);
    const displayContent = (d as any).metadata?.displayContent || d.content;
    const displayLines = this.wrapText(
      displayContent,
      depth === 0 ? LAYOUT_CONFIG.ROOT_MAX_WIDTH - this.config.padding.x * 2 : Infinity,
      textFontSize,
      this.getFontWeight(depth)
    );
    const textBlockH = displayLines.length * textLineHeight;
    const hasText = displayLines.length > 0;

    // Y start: rect top + padding + text height
    const rectTop = -height / 2;
    let blockY = rectTop + this.config.padding.y + textBlockH;
    if (hasText) blockY += NB.PILL_GAP;
    if (d.metadata.image) {
      blockY += (d.metadata.image.thumbHeight || 0) + LAYOUT_CONFIG.IMAGE.PADDING;
    }

    // Use data joins for blocks to enable smooth transitions
    let blocksGroup = nodeGroup.select<SVGGElement>('g.note-blocks');
    if (blocksGroup.empty()) {
      blocksGroup = nodeGroup.append('g')
        .attr('class', 'note-blocks')
        .attr('clip-path', `url(#clip-${d.id})`);
    } else {
      // Ensure existing blocksGroup also has the clip-path attribute
      blocksGroup.attr('clip-path', `url(#clip-${d.id})`);
    }

    const allBlocks = [
      ...codeBlocks.map((b, i) => ({ ref: b, type: 'code' as const, id: `code-${i}` })),
      ...quoteBlocks.map((b, i) => ({ ref: b, type: 'quote' as const, id: `quote-${i}` })),
      ...tableBlocks.map((b, i) => ({ ref: b, type: 'table' as const, id: `table-${i}` }))
    ];

    const blockSelections = blocksGroup.selectAll<SVGGElement, any>('g.note-block')
      .data(allBlocks, d => d.id);

    const isDark = this.isDarkMode;
    const RC = RendererColors.noteBlock;
    const pillBg = isDark ? RC.pillBgDark : RC.pillBgLight;
    const pillText = isDark ? RC.pillTextDark : RC.pillTextLight;
    const expandedBg = isDark ? RC.expandedBgDark : RC.expandedBgLight;
    const codeLang = isDark ? RC.codeLangDark : RC.codeLangLight;
    const quoteAccent = isDark ? RC.quoteAccentDark : RC.quoteAccentLight;
    const quoteTextC = isDark ? RC.quoteTextDark : RC.quoteTextLight;
    const innerW = width - this.config.padding.x * 2;

    // EXIT: fade out and remove
    blockSelections.exit()
      .transition()
      .duration(duration)
      .ease(d3.easeCubicOut)
      .attr('opacity', 0)
      .remove();

    // ENTER: start invisible
    const enter = blockSelections.enter()
      .append('g')
      .attr('class', b => `note-block note-block-${b.type}`)
      .attr('opacity', 0);

    // MERGE & UPDATE
    const update = enter.merge(blockSelections as any);

    update.each(function (block) {
      const blockGroup = d3.select(this);

      // Ensure group starts at current blockY IF it's newly entered (opacity 0) 
      // AND has no transform yet, to prevent flying from node origin
      if (!blockGroup.attr('transform')) {
        blockGroup.attr('transform', `translate(${rectX + thisRenderer.config.padding.x}, ${blockY})`);
      }
      const type = block.type;
      const isExpanded = block.ref.expanded;
      const rawContent = (type === 'code' ? block.ref.code : (type === 'quote' ? block.ref.text : '')) || '';
      const contentLines = rawContent.split(/\r?\n/);
      const lineH = type === 'code' ? NB.CODE_LINE_HEIGHT : (type === 'quote' ? NB.QUOTE_LINE_HEIGHT : NB.TABLE_LINE_HEIGHT);
      const vPad = type === 'code' ? NB.CODE_V_PADDING : (type === 'quote' ? NB.QUOTE_V_PADDING : NB.TABLE_V_PADDING);
      const headerH = (type === 'table') ? NB.TABLE_HEADER_HEIGHT : NB.CODE_HEADER_HEIGHT;

      // Calculate dimensions
      let expandedH = NB.PILL_HEIGHT;
      if (isExpanded) {
        if (type === 'table') {
          const headerRows = block.ref.headers?.length ? 1 : 0;
          const totalRows = (block.ref.rows?.length || 0) + headerRows;
          expandedH = headerH + (totalRows * NB.TABLE_ROW_HEIGHT) + (NB.TABLE_V_PADDING * 2);
        } else {
          expandedH = headerH + vPad + (contentLines.length * lineH) + vPad;
        }
      }

      // Transition the block group's position (for cascade moves)
      blockGroup.interrupt()
        .transition()
        .duration(duration)
        .ease(d3.easeCubicOut)
        .delay(0)
        .attr('opacity', 1)
        .attr('transform', `translate(${rectX + thisRenderer.config.padding.x}, ${blockY})`);

      // Background rectangle transition (for height expansion/collapse)
      let bgRect = blockGroup.select<SVGRectElement>('rect.block-bg');
      if (bgRect.empty()) {
        bgRect = blockGroup.append('rect').attr('class', 'block-bg').attr('rx', 4).attr('ry', 4);
      }
      bgRect.interrupt()
        .transition()
        .duration(duration)
        .ease(d3.easeCubicOut)
        .delay(0)
        .attr('width', innerW)
        .attr('height', expandedH)
        .attr('fill', isExpanded ? expandedBg : pillBg);

      // Clean up background selection
      bgRect.style('cursor', isExpanded ? 'default' : 'pointer')
        .on('click', (event: any) => {
          if (!isExpanded) {
            event.stopPropagation();
            block.ref.expanded = true;
            // Notify the application to trigger a layout recalculation
            thisRenderer.nodeUpdateCallback(d.id);
          }
        })
        .on('dblclick', (event: any) => event.stopPropagation());

      // ── 1. Collapsed Pill Elements (only when !isExpanded) ──
      const pillContent = blockGroup.selectAll<SVGGElement, any>('g.pill-content')
        .data(!isExpanded ? [block] : []);

      pillContent.exit().transition().duration(duration).delay(delay)
        .attr('opacity', 0)
        .attr('transform', 'translate(0, 0)') // Lock position while fading
        .remove();

      const pillEnter = pillContent.enter().append('g').attr('class', 'pill-content').attr('opacity', 0);

      pillEnter.append('text').attr('class', 'caret').attr('x', 10).attr('y', NB.PILL_HEIGHT / 2)
        .attr('font-size', '9px').attr('fill', pillText).attr('dominant-baseline', 'central').style('pointer-events', 'none').text('▶');

      pillEnter.append('text').attr('class', 'label').attr('x', 26).attr('y', NB.PILL_HEIGHT / 2)
        .attr('font-size', '10px').attr('dominant-baseline', 'central').style('pointer-events', 'none');

      pillEnter.append('text').attr('class', 'count').attr('x', innerW - 8).attr('y', NB.PILL_HEIGHT / 2)
        .attr('text-anchor', 'end').attr('font-size', '9px').attr('fill', pillText).attr('dominant-baseline', 'central').style('pointer-events', 'none');

      const pillUpdate = pillEnter.merge(pillContent as any);
      pillUpdate.transition().duration(duration).delay(delay).attr('opacity', 1);

      pillUpdate.select('text.label')
        .attr('font-family', type === 'code' ? NB.MONO_FONT : 'Inter, sans-serif')
        .attr('font-style', type === 'quote' ? 'italic' : 'normal')
        .attr('fill', type === 'table' ? RendererColors.noteBlock.tableAccent : (type === 'code' ? codeLang : quoteAccent))
        .text(type === 'code' ? (block.ref.language || 'code') : type);

      pillUpdate.select('text.count')
        .attr('x', innerW - 8)
        .text(type === 'table' 
            ? `${block.ref.rows?.length || 0} row${(block.ref.rows?.length || 0) !== 1 ? 's' : ''}` 
            : `${(type === 'code' ? block.ref.code : block.ref.text || '').split('\n').length} line${(type === 'code' ? block.ref.code : block.ref.text || '').split('\n').length !== 1 ? 's' : ''}`);

      // ── 2. Expanded Header ──
      const header = blockGroup.selectAll<SVGGElement, any>('g.block-header')
        .data(isExpanded ? [block] : []);

      header.exit().interrupt()
        .transition()
        .duration(duration * 0.6) // Faster exit to prevent flying
        .attr('opacity', 0)
        .attr('transform', 'translate(0, 0)')
        .remove();

      const headerEnter = header.enter().append('g').attr('class', 'block-header').attr('opacity', 0);

      headerEnter.append('path').attr('class', 'header-bg');
      headerEnter.append('text').attr('class', 'caret').attr('x', 10).attr('y', headerH / 2)
        .attr('font-size', '9px').attr('fill', pillText).attr('dominant-baseline', 'central').style('pointer-events', 'none').text('▼');
      headerEnter.append('text').attr('class', 'label').attr('x', 26).attr('y', headerH / 2)
        .attr('font-size', '10px').attr('dominant-baseline', 'central').style('pointer-events', 'none');

      const headerUpdate = headerEnter.merge(header as any);
      headerUpdate.transition().duration(duration).delay(delay).attr('opacity', 1);

      const headerPath = `M 0 4 Q 0 0 4 0 L ${innerW - 4} 0 Q ${innerW} 0 ${innerW} 4 L ${innerW} ${headerH} L 0 ${headerH} Z`;
      headerUpdate.select('path.header-bg')
        .attr('d', headerPath)
        .attr('fill', isDark ? RendererColors.noteBlock.headerBgDark : RendererColors.noteBlock.headerBgLight)
        .style('cursor', 'pointer')
        .on('click', (event) => {
          event.stopPropagation();
          block.ref.expanded = false;
          // Notify the application to trigger a layout recalculation
          thisRenderer.nodeUpdateCallback(d.id);
        });

      headerUpdate.select('text.label')
        .attr('font-family', type === 'code' ? NB.MONO_FONT : 'Inter, sans-serif')
        .attr('font-style', type === 'quote' ? 'italic' : 'normal')
        .attr('fill', type === 'table' ? RendererColors.noteBlock.tableAccent : (type === 'code' ? codeLang : quoteAccent))
        .text(type === 'code' ? (block.ref.language || 'code') : type);

      // ── 3. Expanded Code/Quote Content ──
      const content = blockGroup.selectAll<SVGTextElement, any>('text.block-content')
        .data(isExpanded && type !== 'table' ? [block] : []);

      content.exit().interrupt()
        .transition()
        .duration(duration * 0.6) // Faster exit to prevent flying
        .attr('opacity', 0)
        .attr('x', 0)
        .attr('y', 0)
        .remove();

      const contentEnter = content.enter().append('text')
        .attr('class', 'block-content')
        .attr('opacity', 0)
        .attr('x', 0)
        .attr('y', 0);

      const contentUpdate = contentEnter.merge(content as any);
      contentUpdate
        .interrupt()
        .attr('x', 0)
        .attr('y', 0)
        .transition().duration(duration).delay(0).attr('opacity', 1);

      const blockFontStyle = type === 'quote' ? 'italic' : 'normal';

      contentUpdate.attr('font-family', type === 'code' ? NB.MONO_FONT : 'Inter, sans-serif')
        .attr('font-size', `${lineH}px`)
        .attr('font-style', blockFontStyle)
        .attr('fill', type === 'code'
          ? (isDark ? RendererColors.noteBlock.codeTextDark : RendererColors.noteBlock.codeTextLight)
          : quoteTextC)
        .style('white-space', 'pre');

      // Render lines using tspan join
      const tspans = contentUpdate.selectAll<SVGTSpanElement, string>('tspan')
        .data(contentLines);

      tspans.join('tspan')
        .attr('x', type === 'code' ? 8 : (NB.QUOTE_BORDER_WIDTH + 8))
        .attr('dy', (line, i) => i === 0 ? (headerH + vPad + lineH / 2) : lineH)
        .attr('dominant-baseline', 'central')
        .text(line => {
          if (line.length === 0) return '\u00A0';
          // Use standard lines now that white-space: pre is active
          return type === 'code' && line.length > 58 ? `${line.substring(0, 56)}…` : line;
        });

      // ── 4. Expanded Table Content ──
      const tableContent = blockGroup.selectAll<SVGGElement, any>('g.table-content')
        .data(isExpanded && type === 'table' ? [block] : []);

      tableContent.exit().remove();
      const tableEnter = tableContent.enter().append('g').attr('class', 'table-content').attr('opacity', 0);
      
      const tableUpdate = tableEnter.merge(tableContent as any);
      tableUpdate.transition().duration(duration).attr('opacity', 1);

      tableUpdate.each(function(b) {
        const g = d3.select(this);
        g.selectAll('*').remove();
        
        const headers = b.ref.headers || [];
        const rows = b.ref.rows || [];
        const alignments = b.ref.alignments || [];
        const colCount = Math.max(headers.length, ...rows.map(r => r.length));
        
        // Evenly distribute columns within innerW
        const finalColWidths = new Array(colCount).fill(innerW / colCount);

        let runningY = headerH + NB.TABLE_V_PADDING;
        const startY = runningY;
        
        // Helper to draw a row
        const drawRow = (data: string[], isHeader: boolean) => {
          let currentX = 0;
          data.forEach((cell, i) => {
            const colW = finalColWidths[i];
            const align = alignments[i] || 'left';
            
            // Cell text
            let textX = currentX + NB.TABLE_CELL_HPADDING;
            if (align === 'center') textX = currentX + colW / 2;
            else if (align === 'right') textX = currentX + colW - NB.TABLE_CELL_HPADDING;
            
            g.append('text')
              .attr('x', textX)
              .attr('y', runningY + NB.TABLE_ROW_HEIGHT / 2)
              .attr('font-size', `${NB.TABLE_LINE_HEIGHT}px`)
              .attr('font-weight', isHeader ? 'bold' : 'normal')
              .attr('fill', isHeader
                ? (isDark ? RendererColors.noteBlock.tableHeaderDark : RendererColors.noteBlock.tableHeaderLight)
                : (isDark ? RendererColors.noteBlock.tableCellDark : RendererColors.noteBlock.tableCellLight))
              .attr('text-anchor', align === 'center' ? 'middle' : align === 'right' ? 'end' : 'start')
              .attr('dominant-baseline', 'central')
              .text(cell);
            
            currentX += colW;
          });
          
          // Row separator
          if (isHeader) {
            g.append('line')
              .attr('x1', 0)
              .attr('y1', runningY + NB.TABLE_ROW_HEIGHT)
              .attr('x2', innerW)
              .attr('y2', runningY + NB.TABLE_ROW_HEIGHT)
              .attr('stroke', isDark ? RendererColors.noteBlock.tableDividerDark : RendererColors.noteBlock.tableDividerLight)
              .attr('stroke-width', 1.5);
          }
          
          runningY += NB.TABLE_ROW_HEIGHT;
        };

        if (headers.length > 0) drawRow(headers, true);
        rows.forEach(r => drawRow(r, false));

        // Vertical column separators
        let runningX = 0;
        finalColWidths.forEach((colW, i) => {
          if (i === finalColWidths.length - 1) return;
          runningX += colW;
          g.append('line')
            .attr('x1', runningX)
            .attr('y1', startY)
            .attr('x2', runningX)
            .attr('y2', runningY)
            .attr('stroke', isDark ? RendererColors.noteBlock.tableDividerDark : RendererColors.noteBlock.tableDividerLight)
            .attr('stroke-width', 1)
            .style('stroke-dasharray', '2,2')
            .attr('opacity', 0.5);
        });
      });

      blockY += expandedH + NB.PILL_GAP;
    });

  }

  /**
   * Toggle node collapse state
   */
  public toggleNode(node: TreeNode): void {
    // Notify the application to trigger a layout recalculation
    this.nodeToggleCallback(node.id);
  }

  /**
   * Render curved links between nodes
   */
  private renderLinks(links: any[], positions: Map<string, Position>): void {
    if (!this.g) return;
    const layer = this.g.select('g.links-layer');

    const linkPaths = layer.selectAll<SVGPathElement, any>('path.link')
      .data(links, (d) => `${d.source.id}-${d.target.id}`);

    linkPaths.exit()
      .transition()
      .duration(this.config.animationDuration)
      .ease(d3.easeCubicOut)
      .attr('stroke-opacity', 0)
      .attr('d', (data: any) => {
        // Find nearest visible source/target or their ancestors
        const getVisiblePos = (node: TreeNode): Position => {
          let curr: TreeNode | null = node;
          while (curr && !positions.has(curr.id)) {
            curr = curr.parent;
          }
          return curr ? positions.get(curr.id)! : (this.lastPositions?.get(node.id) || { x: 0, y: 0 });
        };

        const sPos = getVisiblePos(data.source);
        const tPos = getVisiblePos(data.target);
        const sWidth = (data.source as any).metadata?.width || 0;
        const sY = sPos.y;

        let sX: number;
        if (this.isVertical) {
          sX = sPos.x;
          const sHeight = (data.source as any).metadata?.height || 0;
          const dy = tPos.y < sPos.y ? -sHeight / 2 : sHeight / 2;
          return `M${sX},${sPos.y + dy}C${sX},${sPos.y + dy} ${sX},${sPos.y + dy} ${sX},${sPos.y + dy}`;
        } else {
          // Robust source side detection
          if (!data.source.parent) {
            sX = tPos.x < sPos.x ? sPos.x - sWidth / 2 : sPos.x + sWidth / 2;
          } else {
            // For non-root sources, we use the direction toward its own parent if possible
            let pVisible = data.source.parent;
            while (pVisible && !positions.has(pVisible.id)) pVisible = pVisible.parent;
            const pPos = pVisible ? positions.get(pVisible.id)! : { x: sPos.x - 1, y: sPos.y };
            sX = sPos.x < pPos.x ? sPos.x - sWidth : sPos.x + sWidth;
          }
          return `M${sX},${sY}C${sX},${sY} ${sX},${sY} ${sX},${sY}`;
        }
      })
      .remove();

    const enter = linkPaths.enter()
      .append('path')
      .attr('class', 'link')
      .attr('fill', 'none')
      .attr('stroke-opacity', 0)
      .attr('stroke-width', 2)
      .attr('d', (d) => {
        const sWidth = (d.source as any).metadata?.width || 0;
        const targetFinalPos = positions.get(d.target.id) || { x: 0, y: 0 };

        // INSERTION SLOT: if the target node is being inserted between siblings,
        // start the link from the displaced sibling's old position so it matches
        // the node's ENTER animation starting point.
        if (d.target.parent && this.lastPositions) {
          const siblings = d.target.parent.children;
          const myIndex = siblings.findIndex((s: any) => s.id === d.target.id);
          if (myIndex >= 0) {
            const nextSibling = siblings[myIndex + 1];
            const nextLastPos = nextSibling && this.lastPositions.get(nextSibling.id);
            if (nextLastPos) {
              const sPos = positions.get(d.source.id) || { x: 0, y: 0 };
              let sX: number;
              if (this.isVertical) {
                sX = sPos.x;
              } else if (!d.source.parent) {
                sX = targetFinalPos.x < sPos.x ? sPos.x - sWidth / 2 : sPos.x + sWidth / 2;
              } else {
                const pPos = positions.get(d.source.parent.id) || { x: sPos.x - 1, y: sPos.y };
                sX = sPos.x < pPos.x ? sPos.x - sWidth : sPos.x + sWidth;
              }
              const startY = nextLastPos.y;
              return `M${sX},${startY}C${sX},${startY} ${sX},${startY} ${sX},${startY}`;
            }
          }
        }

        // RECURSIVE FLY-OUT fallback:
        // Find the nearest ancestor that WAS already visible
        let ancestor = d.source;
        while (ancestor && !this.lastPositions?.has(ancestor.id)) {
          ancestor = ancestor.parent;
        }

        const sPos = (ancestor && this.lastPositions?.get(ancestor.id)) ||
          positions.get(d.source.id) ||
          { x: 0, y: 0 };

        // Target in initial state is just the source point (collapsed)
        const tPos = sPos;

        // Use the same edge calculation as sideAwareDiagonal for the initial (collapsed) state
        let sX: number;
        let sY: number = sPos.y;

        if (this.isVertical) {
          sX = sPos.x;
          // Sub-nodes in vertical layouts grow from the top/bottom of parent
          const sHeight = (d.source as any).metadata?.height || 0;
          const targetFinalPos = positions.get(d.target.id) || sPos;
          sY = targetFinalPos.y < sPos.y ? sPos.y - sHeight / 2 : sPos.y + sHeight / 2;
          return `M${sX},${sY}C${sX},${sY} ${sX},${sY} ${sX},${sY}`;
        } else {
          if (!d.source.parent) {
            const targetFinalPos = positions.get(d.target.id) || sPos;
            sX = targetFinalPos.x < sPos.x ? sPos.x - sWidth / 2 : sPos.x + sWidth / 2;
          } else {
            const pPos = positions.get(d.source.parent.id) || { x: 0, y: 0 };
            sX = sPos.x < pPos.x ? sPos.x - sWidth : sPos.x + sWidth;
          }
          return `M${sX},${sY}C${sX},${sY} ${sX},${sY} ${sX},${sY}`;
        }
      });

    // ── Diagonal generators (must be defined before update.transition) ──────

    const getSourceX = (source: any, target: any): number => {
      const sPos = positions.get(source.id) || { x: 0, y: 0 };
      const tPos = positions.get(target.id) || { x: 0, y: 0 };
      const sWidth = (source as any).metadata?.width || 0;
      if (!source.parent) return tPos.x < sPos.x ? sPos.x - sWidth / 2 : sPos.x + sWidth / 2;
      const pPos = positions.get(source.parent.id) || { x: 0, y: 0 };
      return sPos.x < pPos.x ? sPos.x - sWidth : sPos.x + sWidth;
    };

    const getSourceY = (source: any, target: any): number => {
      const sPos = positions.get(source.id) || { x: 0, y: 0 };
      const tPos = positions.get(target.id) || { x: 0, y: 0 };
      const sHeight = (source as any).metadata?.height || 0;
      return tPos.y < sPos.y ? sPos.y - sHeight / 2 : sPos.y + sHeight / 2;
    };

    const getTargetY = (source: any, target: any): number => {
      const sPos = positions.get(source.id) || { x: 0, y: 0 };
      const tPos = positions.get(target.id) || { x: 0, y: 0 };
      const tHeight = (target as any).metadata?.height || 0;
      return tPos.y < sPos.y ? tPos.y + tHeight / 2 : tPos.y - tHeight / 2;
    };

    const sideAwareDiagonal = (d: any) => {
      const sPos = positions.get(d.source.id) || { x: 0, y: 0 };
      const tPos = positions.get(d.target.id) || { x: 0, y: 0 };

      if (this.isVertical) {
        const sX = sPos.x;
        const sY = getSourceY(d.source, d.target);
        const tX = tPos.x;
        const tY = getTargetY(d.source, d.target);
        const cp1y = sY + (tY - sY) / 2;
        return `M${sX},${sY}C${sX},${cp1y} ${tX},${cp1y} ${tX},${tY}`;
      }

      const sX = getSourceX(d.source, d.target);
      const sY = sPos.y;
      const tX = tPos.x;
      const tY = tPos.y;
      const cp1x = sX + (tX - sX) / 2;
      return `M${sX},${sY}C${cp1x},${sY} ${cp1x},${tY} ${tX},${tY}`;
    };

    // ── Apply transition to all links (enter + update) ───────────────────────
    const update = enter.merge(linkPaths);

    update.transition()
      .duration(this.config.animationDuration)
      .ease(d3.easeCubicOut)
      .delay((d) => (d.target.depth || 0) * this.config.staggerDelay)
      .attr('d', sideAwareDiagonal)
      .attr('stroke-opacity', 0.55)
      .attr('stroke', (d) => ColorManager.getThemeShade(d.target.color, false) || 'currentColor');
  }


  /**
   * Flatten tree to array
   */
  private flattenTree(root: TreeNode): TreeNode[] {
    const nodes: TreeNode[] = [];
    const traverse = (node: TreeNode) => {
      nodes.push(node);
      if (!node.collapsed) {
        node.children.forEach(traverse);
      }
    };
    traverse(root);
    return nodes;
  }

  /**
   * Get link pairs from nodes
   */
  private getLinks(nodes: TreeNode[]): { source: TreeNode; target: TreeNode }[] {
    const links: { source: TreeNode; target: TreeNode }[] = [];
    nodes.forEach(node => {
      if (!node.collapsed) {
        node.children.forEach(child => {
          links.push({ source: node, target: child });
        });
      }
    });
    return links;
  }
}
