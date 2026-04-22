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
import { LRUCache } from '@/core/utils/lru-cache';
import {
  wrapText,
  getNoteBlockFontSize,
  getNoteBlockFontWeight,
  getNoteBlockLineHeight,
  parseMarkdownLine,
  measureRichTextWidth,
  getHeadingFontSize,
  getHeadingLineHeight
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
  private lastCullingUpdate: number = 0;
  private highlightIds: Set<string> = new Set();
  private selectedNodeId: string | null = null;
  private isVertical: boolean = false;
  private isDarkMode: boolean = false;
  private measureCtx: CanvasRenderingContext2D | null = null;

  private measureCache = new LRUCache<string, {
    contentKey: string;
    width: number;
    height: number;
    displayLines?: string[];
    textHeight?: number;
    hasText?: boolean;
    imageThumbWidth?: number;
    imageThumbHeight?: number;
  }>(2000);

  private _isHidden: boolean = false;
  private _skipAnimations: boolean = false;
  private _renderRafId: number | null = null;
  private _pendingRenderArgs: { root: TreeNode; positions: Map<string, Position>; isDarkMode: boolean } | null = null;
  private _imageStoreUnsubscribe: (() => void) | null = null;
  private _visibilityHandler: (() => void) | null = null;
  private _cullingDirty: boolean = false;
  private _imageHrefCache = new WeakMap<SVGImageElement, string>();

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
   * Returns a D3 transition with the configured duration, or duration 0 if animations are skipped.
   */
  private transition<T extends d3.BaseType, U, TElement extends d3.BaseType, TDatum>(
    sel: d3.Selection<T, U, TElement, TDatum>
  ): d3.Transition<T, U, TElement, TDatum> {
    return this._skipAnimations
      ? sel.transition().duration(0)
      : sel.transition().duration(this.config.animationDuration);
  }

  /**
   * Helper to wrap text into lines based on maximum width.
   * This is Markdown-aware to ensure links are treated as atomic units and don't wrap mid-line.
   */
  private wrapText(text: string, maxWidth: number, fontSize: number, fontWeight: string, fontFamily: string = 'Inter, sans-serif', literal: boolean = false): string[] {
    const ctx = this.measureCtx;
    const measure = (t: string, f: string) => {
      if (ctx) {
        ctx.font = f;
        return ctx.measureText(t).width;
      }
      return t.length * (fontSize * 0.6);
    };
    return wrapText(text, maxWidth, fontSize, fontWeight, measure, fontFamily, literal);
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

    // Background rect that respects theme via CSS
    this.svg.append('rect')
      .attr('class', 'canvas-bg')
      .attr('width', '100%')
      .attr('height', '100%');

    // Create container groups
    this.g = this.svg.append('g').attr('class', 'mindmap-content');
    this.g.append('g').attr('class', 'links-layer');
    this.g.append('g').attr('class', 'nodes-layer');

    // Setup zoom/pan
    this.zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 4])
      .translateExtent([[-5000, -5000], [5000, 5000]])
      .filter((event) => {
        // Only allow panning via drag when no modifier keys are pressed.
        // For mouse events, we check for left (0) or middle (1) button.
        // Touch events typically have undefined or 0 button.
        const isAllowedButton = event.button === 0 || event.button === 1 || event.button === undefined;
        return !event.ctrlKey && !event.altKey && !event.metaKey && isAllowedButton;
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

        // Phase 1 Optimization: Defer culling to zoom.end
        // Pan/zoom only updates the transform matrix — zero DOM manipulation during drag
        this._cullingDirty = true;
      })
      .on('end', () => {
        this.svg?.style('cursor', 'grab');
        this._skipAnimations = false;
        // Phase 1 Optimization: Only re-render if culling state is dirty
        if (this._cullingDirty && this.lastRoot && this.lastPositions) {
          this._cullingDirty = false;
          this.render(this.lastRoot, this.lastPositions, this.isDarkMode);
        }
      });

    this.zoom.clickDistance(8);
    this.svg.call(this.zoom)
      .style('cursor', 'grab')
      .on('click', () => {
         // Clear selection if clicking canvas background
         if (this.nodeClickCallback) this.nodeClickCallback('');
      })
      // CRITICAL FIX: Add a click distance threshold to prevent micro-movements (common during lag)
      // from being interpreted as a pan start, which suppresses the local click event.
      .filter(() => true) // allow all events
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
    this._imageStoreUnsubscribe = imageDimensionStore.subscribe(() => {
      if (this.lastRoot) {
        this.nodeUpdateCallback(this.lastRoot.id);
      }
    });

    // Handle tab visibility to prevent transition pile-up and skipped renders
    this._visibilityHandler = () => {
      this._isHidden = document.hidden;
      if (this._isHidden) {
        if (this._renderRafId) {
          cancelAnimationFrame(this._renderRafId);
          this._renderRafId = null;
        }
      } else {
        this._skipAnimations = true;
        if (this._pendingRenderArgs) {
          const args = this._pendingRenderArgs;
          this._pendingRenderArgs = null;
          this._doRender(args.root, args.positions, args.isDarkMode);
        }
        requestAnimationFrame(() => {
          this._skipAnimations = false;
        });
      }
    };
    document.addEventListener('visibilitychange', this._visibilityHandler);
  }

  /**
   * Render the complete tree (batched via requestAnimationFrame)
   */
  render(root: TreeNode, positions: Map<string, Position>, isDarkMode: boolean = false): void {
    if (!this.g || !this.svg || !root || !positions) {
      if (!root || !positions) this.clear();
      return;
    }

    if (this._isHidden) {
      this._pendingRenderArgs = { root, positions, isDarkMode };
      return;
    }

    this._pendingRenderArgs = { root, positions, isDarkMode };

    if (!this._renderRafId) {
      this._renderRafId = requestAnimationFrame(() => {
        this._renderRafId = null;
        if (this._pendingRenderArgs) {
          const args = this._pendingRenderArgs;
          this._pendingRenderArgs = null;
          this._doRender(args.root, args.positions, args.isDarkMode);
        }
      });
    }
  }

  /**
   * Internal synchronous render (called by rAF or visibility restore)
   */
  private _doRender(root: TreeNode, positions: Map<string, Position>, isDarkMode: boolean): void {
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
    (root as any)._allNodesCount = allNodes.length; // Store for throttled culling checks

    // Update zoom translate extent based on actual map bounds with padding
    // This allows the "canvas to grow on the fly" as content is added or expanded.
    if (this.zoom && this.svg) {
      let minX = 0, maxX = 0, minY = 0, maxY = 0;
      const rootPos = positions.get(root.id) || { x: 0, y: 0 };

      allNodes.forEach(node => {
        const pos = positions.get(node.id);
        if (pos) {
          const w = (node as any).metadata?.width || 100;
          const h = (node as any).metadata?.height || 40;
          
          // More precise bound calculation based on side
          if (this.isVertical) {
            minX = Math.min(minX, pos.x - w / 2);
            maxX = Math.max(maxX, pos.x + w / 2);
            minY = Math.min(minY, pos.y - h / 2);
            maxY = Math.max(maxY, pos.y + h / 2);
          } else {
            // Horizontal: pos.x is inner edge for branches, center for root
            if (pos.x > rootPos.x) { // Right side
              minX = Math.min(minX, pos.x);
              maxX = Math.max(maxX, pos.x + w);
            } else if (pos.x < rootPos.x) { // Left side
              minX = Math.min(minX, pos.x - w);
              maxX = Math.max(maxX, pos.x);
            } else { // Root
              minX = Math.min(minX, pos.x - w / 2);
              maxX = Math.max(maxX, pos.x + w / 2);
            }
            minY = Math.min(minY, pos.y - h / 2);
            maxY = Math.max(maxY, pos.y + h / 2);
          }
        }
      });
      
      const view = this.getViewportBounds();
      
      // Calculate effective extent: map bounds + buffer, but at least viewport size
      // to ensure small maps can still be panned/centered freely.
      const extMinX = Math.min(minX - LAYOUT_CONFIG.PANNING.BUFFER_X, -view.width / 2);
      const extMaxX = Math.max(maxX + LAYOUT_CONFIG.PANNING.BUFFER_X, view.width / 2);
      const extMinY = Math.min(minY - LAYOUT_CONFIG.PANNING.BUFFER_Y, -view.height / 2);
      const extMaxY = Math.max(maxY + LAYOUT_CONFIG.PANNING.BUFFER_Y, view.height / 2);

      this.zoom.translateExtent([
        [extMinX, extMinY],
        [extMaxX, extMaxY]
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

    // Phase 2: Visibility-based culling
    // Calculate which nodes are visible, but pass ALL nodes to render functions
    // Off-screen nodes will be hidden via CSS visibility instead of DOM removal
    const visibleIds = new Set<string>();
    if (this.svg && allNodes.length > 30) {
      const t = d3.zoomTransform(this.svg.node() as SVGSVGElement);
      const bounds = this.getViewportBounds();
      const culled = this.culler.getVisibleNodes(
        root,
        positions,
        { x: t.x, y: t.y, scale: t.k },
        bounds.width,
        bounds.height
      );
      // Always include root and direct children for stability
      allNodes.forEach(n => {
        if (culled.has(n.id) || n.depth <= 1) visibleIds.add(n.id);
      });
    } else {
      // Small tree: everything visible
      allNodes.forEach(n => visibleIds.add(n.id));
    }

    const allLinks = this.getLinks(allNodes);

    this.renderLinks(allLinks, positions, visibleIds);
    this.renderNodes(allNodes, positions, visibleIds);
  }

  /**
   * Calculates a stable content key for a node to detect measurement cache invalidation.
   */
  private getMeasureContentKey(node: TreeNode): string {
    const display = (node as any).metadata?.displayContent ?? node.content ?? '';
    const imageUrl = node.metadata.image?.url ?? '';
    const codeCount = (node.metadata.codeBlocks ?? []).reduce((s: number, b: any) => s + (b.expanded ? 1 : 0) + b.code.length, 0);
    const quoteCount = (node.metadata.quoteBlocks ?? []).reduce((s: number, b: any) => s + (b.expanded ? 1 : 0) + b.text.length, 0);
    const tableContentKey = (node.metadata.tableBlocks ?? []).reduce((s: number, b: any) => {
      const hLen = (b.headers ?? []).reduce((acc: number, h: string) => acc + (h?.length || 0), 0);
      const rLen = (b.rows ?? []).reduce((acc: number, r: any[]) => acc + r.reduce((ra: number, c: any) => ra + (String(c)?.length || 0), 0), 0);
      return s + (b.expanded ? 1 : 0) + hLen + rLen;
    }, 0);
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
    return `${node.depth}|${display.length}|${imageUrl}|${imageState}|${codeCount}|${quoteCount}|${tableContentKey}|v7`;
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
      // Phase 3: Fast-path — restore image thumb dimensions from cache
      // Avoids imageDimensionStore lookups and re-computation on every render
      if (node.metadata.image && cached.imageThumbWidth !== undefined) {
        node.metadata.image.thumbWidth = cached.imageThumbWidth;
        node.metadata.image.thumbHeight = cached.imageThumbHeight;
      }
      return;
    }

    const depth = node.depth || 0;
    const fontSize = this.getFontSize(depth);
    const fontWeight = this.getFontWeight(depth);
    const lineHeight = this.getLineHeight(depth);
    const rootMaxW = (depth === 0 ? LAYOUT_CONFIG.ROOT_MAX_WIDTH : Infinity) - (this.config.padding.x * 2);

    if (ctx) ctx.font = `${fontWeight} ${fontSize}px Inter, sans-serif`;

    // Calculate the display text by stripping out internal placeholders
    let displayContent = ((node as any).metadata?.displayContent ?? node.content ?? '');
    // Strip leading list markers from actual display if they were caught in the content
    displayContent = displayContent.replace(/\[(codeblock|quoteblock|image|tableblock):\d+\]/gi, '');
    displayContent = displayContent.split('\n').map((line: string) => line.replace(/^(\s*)[-*+]\s*\[([ xX])\]/, '$1[$2]')).join('\n').trim();

    const displayLines = this.wrapText(displayContent, rootMaxW, fontSize, fontWeight);
    let maxWidth = 0;

    displayLines.forEach(line => {
      const segments = parseMarkdownLine(line);
      let lineWidth = 0;
      segments.forEach(seg => {
        if (ctx) {
          const segFontSize = seg.heading ? getHeadingFontSize(seg.heading) : ((seg.subscript || seg.superscript) ? fontSize * 0.7 : fontSize);
          const segFontFamily = seg.keyboard ? LAYOUT_CONFIG.NOTE_BLOCK.MONO_FONT : 'Inter, sans-serif';
          const textToMeasure = seg.checkbox ? '☑ ' : seg.text;
          ctx.font = `${(seg.bold || (seg.heading && seg.heading <= 3)) ? 'bold ' : fontWeight} ${seg.italic ? 'italic ' : ''}${segFontSize}px ${segFontFamily}`;
          lineWidth += ctx.measureText(textToMeasure).width;
        } else {
          const segFontSize = seg.heading ? getHeadingFontSize(seg.heading) : ((seg.subscript || seg.superscript) ? fontSize * 0.7 : fontSize);
          lineWidth += seg.text.length * (segFontSize * 0.6);
        }
      });
      maxWidth = Math.max(maxWidth, lineWidth);
    });

    const hasText = displayContent.length > 0;
    node.metadata.width = maxWidth + (this.config.padding.x * 2);
    
    let totalTextHeight = 0;
    displayLines.forEach(line => {
      const lineSegments = parseMarkdownLine(line);
      const maxLineH = lineSegments.reduce((max, seg) => {
        const h = seg.heading ? getHeadingLineHeight(seg.heading) : lineHeight;
        return Math.max(max, h);
      }, 0);
      totalTextHeight += maxLineH || lineHeight;
    });
    node.metadata.height = (hasText ? totalTextHeight : 0) + (this.config.padding.y * 2);

    // Prepare note blocks info early for height/gap calculation
    const codeBlocks = node.metadata.codeBlocks || [];
    const quoteBlocks = node.metadata.quoteBlocks || [];
    const tableBlocks = node.metadata.tableBlocks || [];
    const hasNoteBlocks = codeBlocks.length > 0 || quoteBlocks.length > 0 || tableBlocks.length > 0;

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
        if (!isActuallyLoading && !image.thumbWidth) {
          // Failed to load placeholder dimensions
          image.thumbWidth = 40;
          image.thumbHeight = 30;
          (image as any).failed = true;
        }
      }

      // Update node height: Add thumbnail height
      const thumbH = image.thumbHeight ?? 0;
      const thumbW = image.thumbWidth ?? 0;
      node.metadata.height += thumbH;

      // Add gap if there is text OR note blocks below the image
      if (thumbH > 0 && (hasText || hasNoteBlocks)) {
        node.metadata.height += imgConfig.PADDING;
      }

      // Update node width: max(textWidth, thumbWidth)
      if (thumbW > maxWidth) {
        maxWidth = thumbW;
        node.metadata.width = maxWidth + (this.config.padding.x * 2);
      }
    }

    // Account for code/quote note blocks in height
    const NB = LAYOUT_CONFIG.NOTE_BLOCK;
    const allNoteBlocks: Array<{ expanded: boolean; content: string; isQuote: boolean; isTable: boolean; headers?: string[]; rows?: string[][] }> = [
      ...codeBlocks.map(b => ({ expanded: b.expanded, content: b.code, isQuote: false, isTable: false })),
      ...quoteBlocks.map(b => ({ expanded: b.expanded, content: b.text, isQuote: true, isTable: false })),
      ...tableBlocks.map(b => ({ expanded: b.expanded, content: '', isQuote: false, isTable: true, headers: b.headers, rows: b.rows })),
    ];

    if (allNoteBlocks.length > 0) {
      let maxNoteWidth = 180 * 0.75; // Baseline width for minimum pill display
      allNoteBlocks.forEach((block, idx) => {
        if (hasText || node.metadata.image || idx > 0) {
          node.metadata.height += NB.PILL_GAP;
        }

        if (!block.expanded) {
          node.metadata.height += NB.PILL_HEIGHT;
        } else if (block.isTable) {
          // Table height calculation with support for multi-line cells (\n, \n literal, <br>)
          let totalTableHeight = NB.PILL_HEIGHT + (NB.TABLE_V_PADDING * 2) + 4; // Add 4px safety buffer
          const getCellLines = (txt: string, maxWidth?: number) => {
            const rawLines = (txt || '').replace(/<br\s*\/?>/gi, '\n').replace(/\\n/g, '\n').replace(/\\t/g, '    ').replace(/\t/g, '    ').split(/\r?\n/);
            if (maxWidth === undefined || maxWidth <= 0) return rawLines;
            const mFn = (t: string, f: string) => { 
                if (ctx) { ctx.font = f; return ctx.measureText(t).width; } 
                return t.length * (NB.TABLE_LINE_HEIGHT * 0.6); 
            };
            return rawLines.flatMap((line: string) => wrapText(line, Math.max(500, maxWidth || 0), NB.TABLE_LINE_HEIGHT, '400', mFn, 'Inter, sans-serif'));
          };

          const colCount = Math.max(block.headers?.length || 0, ...(block.rows?.map(r => r.length) || [0]));
          const colWidths = new Array(colCount).fill(0);

          if (colCount > 0) {
            if (ctx) ctx.font = `${NB.TABLE_LINE_HEIGHT}px Inter, sans-serif`;

            // First pass: measure natural widths for columns (Adaptive - No hard clamp)
            const measureCol = (row: string[], weight: string) => {
              row.forEach((cell, i) => {
                const lines = getCellLines(cell);
                lines.forEach(line => {
                  const w = measureRichTextWidth(line, NB.TABLE_LINE_HEIGHT, weight, (t, f) => {
                    if (ctx) { ctx.font = f; return ctx.measureText(t).width; }
                    return t.length * NB.TABLE_LINE_HEIGHT * 0.6;
                  });
                  colWidths[i] = Math.max(colWidths[i], w + 60 + 4); // 60 padding + 4px safety buffer
                });
              });
            };

            if (block.headers) measureCol(block.headers, 'bold');
            block.rows?.forEach(row => measureCol(row, '400'));

            // Second pass: Calculate row heights based on wrapped lines
            if (block.headers?.length) {
              let maxLinesInHeader = 1;
              block.headers.forEach((h, i) => {
                maxLinesInHeader = Math.max(maxLinesInHeader, getCellLines(h, colWidths[i] - 28).length);
              });
              totalTableHeight += NB.TABLE_HEADER_HEIGHT + (maxLinesInHeader - 1) * NB.TABLE_LINE_HEIGHT;
            }

            block.rows?.forEach(row => {
              let maxLinesInRow = 1;
              row.forEach((cell, i) => {
                maxLinesInRow = Math.max(maxLinesInRow, getCellLines(cell, colWidths[i] - 60).length);
              });
              totalTableHeight += NB.TABLE_ROW_HEIGHT + (maxLinesInRow - 1) * NB.TABLE_LINE_HEIGHT;
            });

            node.metadata.height += totalTableHeight;

            // Store colWidths for rendering
            if (tableBlocks[idx - codeBlocks.length - quoteBlocks.length]) {
              tableBlocks[idx - codeBlocks.length - quoteBlocks.length].colWidths = colWidths;
            }

            const totalTableW = colWidths.reduce((sum, w) => sum + w, 0);
            if (totalTableW > maxNoteWidth) maxNoteWidth = totalTableW;
          }
        } else {
          // Code/Quote block height
          const lineH = block.isQuote ? NB.QUOTE_LINE_HEIGHT : NB.CODE_LINE_HEIGHT;
          const blockFontFamily = block.isQuote ? 'Inter, sans-serif' : NB.MONO_FONT.replace(/'/g, "");
          
          // Use same wrapping logic as renderNoteBlocks to ensure height matches
          const wrapW = NB.MAX_WIDTH - (block.isQuote ? 24 : 16);
          const lines = (block.content || '').split(/\r?\n/).flatMap((line: string) =>
            this.wrapText(line, wrapW, lineH, 'normal', blockFontFamily)
          );

          // Calculate note block lines width
          const fontRef = `${lineH}px ${blockFontFamily}`;
          if (ctx) ctx.font = fontRef;
          
          lines.forEach(line => {
            let lineWidth = 0;
            if (ctx) {
              lineWidth = ctx.measureText(line).width + (block.isQuote ? NB.QUOTE_BORDER_WIDTH + 16 : 16);
            } else {
              lineWidth = line.length * (lineH * 0.6) + 16;
            }
            if (lineWidth > maxNoteWidth) maxNoteWidth = lineWidth;
          });

          const vPad = block.isQuote ? NB.QUOTE_V_PADDING : NB.CODE_V_PADDING;
          const expandedH = NB.CODE_HEADER_HEIGHT + vPad + (lines.length * lineH) + vPad;
          node.metadata.height += expandedH;
        }
      });

      if (maxNoteWidth > maxWidth) {
        maxWidth = maxNoteWidth;
        node.metadata.width = maxWidth + (this.config.padding.x * 2);
      }
    }

    // Phase 5: Cache block heights on block refs for renderNoteBlocks fast-path
    // This avoids re-computing heights in renderNoteBlocks on every render
    if (allNoteBlocks.length > 0) {
      allNoteBlocks.forEach((block, idx) => {
        let cachedHeight: number;
        if (!block.expanded) {
          cachedHeight = NB.PILL_HEIGHT;
        } else if (block.isTable) {
          let totalTableHeight = NB.PILL_HEIGHT + (NB.TABLE_V_PADDING * 2) + 4;
          const colCount = Math.max(block.headers?.length || 0, ...(block.rows?.map(r => r.length) || [0]));
          if (colCount > 0 && block.headers?.length) {
            let maxLinesInHeader = 1;
            block.headers.forEach((h, i) => {
              const lines = (h || '').replace(/<br\s*\/?>/gi, '\n').replace(/\\n/g, '\n').split(/\r?\n/);
              maxLinesInHeader = Math.max(maxLinesInHeader, lines.length);
            });
            totalTableHeight += NB.TABLE_HEADER_HEIGHT + (maxLinesInHeader - 1) * NB.TABLE_LINE_HEIGHT;
          }
          block.rows?.forEach(row => {
            let maxLinesInRow = 1;
            row.forEach((cell) => {
              const lines = (cell || '').replace(/<br\s*\/?>/gi, '\n').replace(/\\n/g, '\n').split(/\r?\n/);
              maxLinesInRow = Math.max(maxLinesInRow, lines.length);
            });
            totalTableHeight += NB.TABLE_ROW_HEIGHT + (maxLinesInRow - 1) * NB.TABLE_LINE_HEIGHT;
          });
          cachedHeight = totalTableHeight;
        } else {
          const lineH = block.isQuote ? NB.QUOTE_LINE_HEIGHT : NB.CODE_LINE_HEIGHT;
          const blockFontFamily = block.isQuote ? 'Inter, sans-serif' : NB.MONO_FONT.replace(/'/g, "");
          const wrapW = NB.MAX_WIDTH - (block.isQuote ? 24 : 16);
          const lines = (block.content || '').split(/\r?\n/).flatMap((line: string) =>
            this.wrapText(line, wrapW, lineH, 'normal', blockFontFamily)
          );
          const vPad = block.isQuote ? NB.QUOTE_V_PADDING : NB.CODE_V_PADDING;
          cachedHeight = NB.CODE_HEADER_HEIGHT + vPad + (lines.length * lineH) + vPad;
        }
        // Store on the original block ref so renderNoteBlocks can read it
        const sourceBlock = block.isTable
          ? tableBlocks[idx - codeBlocks.length - quoteBlocks.length]
          : block.isQuote
            ? quoteBlocks[idx - codeBlocks.length]
            : codeBlocks[idx];
        if (sourceBlock) {
          (sourceBlock as any)._cachedExpandedHeight = cachedHeight;
        }
      });
    }

    // Store result in cache (including render data for renderNodes reuse)
    const cacheEntry: {
      contentKey: string;
      width: number;
      height: number;
      displayLines?: string[];
      textHeight?: number;
      hasText?: boolean;
      imageThumbWidth?: number;
      imageThumbHeight?: number;
    } = {
      contentKey,
      width: node.metadata.width,
      height: node.metadata.height,
      displayLines,
      textHeight: totalTextHeight,
      hasText,
    };

    // Phase 3: Cache image thumb dimensions for fast-path restoration
    if (node.metadata.image) {
      cacheEntry.imageThumbWidth = node.metadata.image.thumbWidth;
      cacheEntry.imageThumbHeight = node.metadata.image.thumbHeight;
    }

    this.measureCache.set(node.id, cacheEntry);
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
    this.measureCache.clear();
  }

  /**
   * Fully destroy the renderer and clean up all resources
   */
  destroy(): void {
    if (this._imageStoreUnsubscribe) {
      this._imageStoreUnsubscribe();
      this._imageStoreUnsubscribe = null;
    }
    if (this._visibilityHandler) {
      document.removeEventListener('visibilitychange', this._visibilityHandler);
      this._visibilityHandler = null;
    }
    if (this._renderRafId) {
      cancelAnimationFrame(this._renderRafId);
      this._renderRafId = null;
    }
    this._pendingRenderArgs = null;
    this.clear();
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
    if (!this.svg || !this.zoom || !this.g || !this.lastRoot || !this.lastPositions) return;

    // Use filter instead of CSS selector to be resilient to complex IDs (with colons/dots)
    const nodes = this.g.selectAll<SVGGElement, TreeNode>('g.node')
      .filter((d) => d.id === nodeId);
    const nodeElement = nodes.empty() ? null : nodes.node();

    // Get target position from cache
    const pos = this.lastPositions.get(nodeId);
    if (!pos) return;

    const bounds = this.getViewportBounds();
    let x = pos.x;
    let y = pos.y;

    if (nodeElement) {
      // Use actual center if node is in DOM
      const bbox = nodeElement.getBBox();
      x = pos.x + bbox.x + bbox.width / 2;
      y = pos.y + bbox.y + bbox.height / 2;
      if (!skipBrowserFocus) nodeElement.focus();
    } else {
      // Fallback: estimate center from metadata if node is culled
      const findNode = (n: TreeNode): TreeNode | null => {
        if (n.id === nodeId) return n;
        if (n.children) {
          for (const c of n.children) {
            const res = findNode(c);
            if (res) return res;
          }
        }
        return null;
      };
      
      const nodeData = findNode(this.lastRoot);
      if (nodeData) {
        const w = (nodeData as any).metadata?.width || 0;
        const h = (nodeData as any).metadata?.height || 0;
        if (this.isVertical) {
          x = pos.x; y = pos.y;
        } else {
          const rootPos = this.lastPositions.get(this.lastRoot.id) || { x: 0, y: 0 };
          x = pos.x < rootPos.x ? pos.x - w / 2 : (pos.x > rootPos.x ? pos.x + w / 2 : pos.x);
        }
      }
    }

    this.svg.transition()
      .duration(500) // Faster transition for navigation responsiveness
      .ease(d3.easeQuadOut)
      .call(
        this.zoom.transform,
        d3.zoomIdentity
          .translate(bounds.width / 2, bounds.height / 2)
          .scale(1.5)
          .translate(-x, -y)
      )
      .on('end', () => {
        // Ensure the focused node is rendered if it was previously culled
        if (this.lastRoot && this.lastPositions) {
          this.render(this.lastRoot, this.lastPositions, this.isDarkMode);
        }
      });
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
  private renderNodes(nodes: TreeNode[], positions: Map<string, Position>, visibleIds: Set<string>): void {
    if (!this.g) return;
    const thisRenderer = this;
    const layer = this.g.select('g.nodes-layer');

    const nodeGroups = layer.selectAll<SVGGElement, TreeNode>('g.node')
      .data(nodes, (d) => d.id);

    // EXIT: fly to the nearest visible ancestor (only for actual tree removals, not culling)
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

    // UPDATE
    const update = enter.merge(nodeGroups);

    // Phase 2: Visibility-based culling — hide off-screen nodes instead of DOM removal
    update
      .style('visibility', (d) => visibleIds.has(d.id) ? 'visible' : 'hidden')
      .style('display', (d) => visibleIds.has(d.id) ? null : 'none');

    update.attr('data-id', (d) => d.id)
      .on('click', (event, d) => {
        event.stopPropagation();
        this.nodeClickCallback(d.id);
      })
      .on('dblclick', (event, d) => {
        event.stopPropagation();
        this.nodeDoubleClickCallback(d.id);
      })
      .on('focus', (_, d) => {
        this.nodeClickCallback(d.id);
      })
      .interrupt()
      .transition()
      .duration(this.config.animationDuration)
      .ease(d3.easeCubicOut)
      .attr('opacity', 1)
      .attr('transform', (d) => {
        const pos = positions.get(d.id) || { x: 0, y: 0 };
        return `translate(${pos.x}, ${pos.y})`;
      });

    update.select('text')
      .each(function (this: any, d: any) {
        const textElement = d3.select(this);
        const depth = d.depth || 0;
        const fontSize = thisRenderer.getFontSize(depth);
        const fontWeight = thisRenderer.getFontWeight(depth);

        // Use cached display lines from measureNode if available (avoids redundant wrapText + parseMarkdownLine)
        const cached = thisRenderer.measureCache.get(d.id);
        let displayLines: string[];
        let textH: number;
        if (cached && cached.displayLines) {
          displayLines = cached.displayLines;
          textH = cached.textHeight ?? 0;
        } else {
          let displayContent = ((d as any).metadata?.displayContent ?? d.content ?? '');
          displayContent = displayContent.replace(/\[(codeblock|quoteblock|image|tableblock):\d+\]/gi, '');
          displayContent = displayContent.split('\n').map((line: string) => line.replace(/^(\s*)[-*+]\s*\[([ xX])\]/, '$1[$2]')).join('\n').trim();
          displayLines = thisRenderer.wrapText(
            displayContent,
            depth === 0 ? LAYOUT_CONFIG.ROOT_MAX_WIDTH - (thisRenderer.config.padding.x * 2) : Infinity,
            fontSize,
            fontWeight
          );
          textH = 0;
          displayLines.forEach(line => {
            const lineSegments = parseMarkdownLine(line);
            const maxLineH = lineSegments.reduce((max, seg) => {
              const h = seg.heading ? getHeadingLineHeight(seg.heading) : thisRenderer.getLineHeight(depth);
              return Math.max(max, h);
            }, 0);
            textH += maxLineH || thisRenderer.getLineHeight(depth);
          });
        }

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
        const lineHeight = thisRenderer.getLineHeight(depth);
        const totalTextHeight = textH;
        const height = (d as any).metadata?.height || 0;

        const image = d.metadata.image;
        const imgH = (image && (image.thumbHeight ?? 0) > 0) ? (image.thumbHeight ?? 0) : 0;
        const hasText = displayLines.length > 0;
        const imgGap = (imgH > 0 && hasText) ? LAYOUT_CONFIG.IMAGE.PADDING : 0;
        const hasNoteBlocks = ((d.metadata.codeBlocks?.length || 0) + (d.metadata.quoteBlocks?.length || 0) + (d.metadata.tableBlocks?.length || 0)) > 0;

        let textOffset: number;
        if (imgH === 0 && !hasNoteBlocks) {
          // Center text block vertically within the node when no image or note blocks
          textOffset = 0;
        } else {
          let yOffset = -height / 2 + thisRenderer.config.padding.y;
          yOffset += imgH + imgGap;
          textOffset = yOffset + textH / 2;
        }

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

        // Calculate actual per-line heights (headings have larger line heights)
        const lineHeights = displayLines.map(line => {
          const segs = lineSegments.get(line) ?? parseMarkdownLine(line);
          return segs.reduce((max, seg) => {
            const h = seg.heading ? getHeadingLineHeight(seg.heading) : lineHeight;
            return Math.max(max, h);
          }, 0);
        });

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
          .attr('dy', (line, i) => {
            if (i === 0) {
              // Position first line so the entire text block is centered at textOffset
              const dy = -totalTextHeight / 2 + lineHeights[0] * 0.7;
              return `${dy / fontSize}em`;
            } else {
              // Space from previous baseline using actual line heights
              const dy = lineHeights[i - 1] * 0.3 + lineHeights[i] * 0.7;
              return `${dy / fontSize}em`;
            }
          })
          .style('visibility', line => {
            const trimmed = line.trim();
            return (trimmed === '---' || trimmed === '***' || trimmed === '___') ? 'hidden' : 'visible';
          });

        // Render dividers for hr markers - use a stable join for the lines themselves
        if (!this.parentNode) return;
        const nodeG = d3.select(this.parentNode as SVGGElement);
        const dividersData = displayLines.map((line, i) => ({ line: line.trim(), i })).filter(d =>
          d.line === '---' || d.line === '***' || d.line === '___'
        );
        const dividers = nodeG.selectAll<SVGLineElement, any>('line.hr-divider')
          .data(dividersData, d => `${d.line}-${d.i}`);

        dividers.exit().remove();

        dividers.enter().append('line')
          .attr('class', 'hr-divider')
          .merge(dividers)
          .each(function (dInfo) {
            const { line, i } = dInfo;
            const width = (d as any).metadata?.width || 0;
            const isCentered = thisRenderer.isVertical || d.depth === 0;

            // Calculate absolute Y coordinate relative to the block top
            const blockTop = -height / 2 + thisRenderer.config.padding.y + imgH + imgGap;
            const lineY = blockTop + (i * lineHeight) + (lineHeight / 2);

            const pos = positions.get(d.id) || { x: 0, y: 0 };
            const parentPos = d.parent ? (positions.get(d.parent.id) || { x: 0, y: 0 }) : null;
            let startX: number;
            if (isCentered) {
              startX = -width / 2;
            } else if (parentPos && pos.x < parentPos.x) {
              // Left-side nodes in horizontal layout have origin at the right edge
              startX = -width;
            } else {
              // Right-side nodes or standard layout have origin at the left edge
              startX = 0;
            }

            d3.select(this)
              .style('pointer-events', 'none')
              .attr('x1', startX + 12)
              .attr('x2', startX + width - 12)
              .attr('y1', lineY)
              .attr('y2', lineY)
              .attr('stroke', 'white')
              .attr('stroke-opacity', 0.9)
              .attr('stroke-width', 1.5)
              .attr('stroke-dasharray', (line === '***' || line === '___') ? '3,3' : 'none');
          });

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

          segUpdate.text(s => {
            if (s.checkbox) return s.checked ? '☑ ' : '☐ ';
            return s.text;
          })
            .style('font-weight', s => s.bold ? 'bold' : (s.heading && s.heading <= 3) ? 'bold' : thisRenderer.getFontWeight(depth))
            .style('font-style', s => s.italic ? 'italic' : 'normal')
            .style('text-decoration', s => (s.underline || s.link) ? 'underline' : (s.strikethrough ? 'line-through' : 'none'))
            .style('font-size', s => s.heading ? `${getHeadingFontSize(s.heading)}px` : ((s.subscript || s.superscript) ? `${fontSize * 0.7}px` : `${fontSize}px`))
            .style('fill', s => {
              if (s.checkbox || s.bullet) return RendererColors.inline.bullet;
              if (s.link) return ColorManager.getLinkColor(nodeFill);
              if (s.highlight) return RendererColors.inline.highlightText;
              return null;
            })
            .attr('baseline-shift', s => s.subscript ? 'sub' : (s.superscript ? 'super' : 'baseline'))
            .style('cursor', s => (s.link || s.details) ? 'pointer' : 'default')
            .each(function (s) {
              const seg = d3.select(this);
              // Apply mathematical font for math segments
              if (s.math) {
                seg.style('font-family', 'serif, STIXGeneral, "Times New Roman"');
                // Serif fonts can appear smaller, so we nudge the size slightly if not in sub/sup
                if (!s.subscript && !s.superscript) {
                  seg.style('font-size', `${fontSize * 1.1}px`);
                }
              }
              
              if (s.highlight || s.keyboard) {
                const seg = d3.select(this);
                if (s.highlight) {
                  seg.style('fill', RendererColors.inline.highlightText)
                    .style('font-weight', 'semibold')
                    .style('stroke', RendererColors.inline.highlightFill)
                    .style('stroke-width', '2.5px')
                    .style('stroke-opacity', 1)
                    .style('stroke-linecap', 'round')
                    .style('stroke-linejoin', 'round')
                    .style('paint-order', 'stroke fill');
                }
                if (s.keyboard) {
                  seg.style('font-family', LAYOUT_CONFIG.NOTE_BLOCK.MONO_FONT);
                  // Use dynamic link-style color if on a colored background for better contrast
                  const isColored = d.depth > 0 && d.color;
                  if (isColored && !thisRenderer.isDarkMode) {
                    seg.style('fill', ColorManager.getLinkColor(nodeFill));
                  } else if (d.depth === 0 && !thisRenderer.isDarkMode) {
                    // Root in light mode is dark, so use a light code color
                    seg.style('fill', '#e2e8f0');
                  } else {
                    seg.style('fill', thisRenderer.isDarkMode ? RendererColors.inline.kbdDark : RendererColors.inline.kbdLight);
                  }
                }
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
            });
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

        const imgEl = container.select<SVGImageElement>('image');
        const imgNode = imgEl.node();
        const targetHref = (image as any).failed ? '' : image.url;

        // Phase 4: Only set href if URL changed — prevents re-fetching and flicker
        if (imgNode && thisRenderer._imageHrefCache.get(imgNode) !== targetHref) {
          thisRenderer._imageHrefCache.set(imgNode, targetHref);
          imgEl.attr('href', targetHref);
        }

        imgEl
          .attr('width', imgW)
          .attr('height', imgH)
          .attr('opacity', (image as any).failed ? 0 : 1)
          .on('click', (event) => {
            event.stopPropagation();
            thisRenderer.nodeImageClickCallback(image.url, image.alt, image.link);
          });

        const errorPlaceholder = container.selectAll('g.error-placeholder').data((image as any).failed ? [image] : []);
        errorPlaceholder.exit().remove();
        const errEnter = errorPlaceholder.enter().append('g').attr('class', 'error-placeholder');
        errEnter.append('rect')
          .attr('width', imgW)
          .attr('height', imgH)
          .attr('rx', 4)
          .attr('fill', thisRenderer.isDarkMode ? '#450a0a' : '#fef2f2')
          .attr('stroke', '#ef4444')
          .attr('stroke-width', 1);
        errEnter.append('text')
          .attr('x', imgW / 2)
          .attr('y', imgH / 2)
          .attr('text-anchor', 'middle')
          .attr('dominant-baseline', 'central')
          .attr('fill', '#ef4444')
          .style('font-size', '10px')
          .style('font-weight', 'bold')
          .text('404');
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
        if (thisRenderer.isVertical || d.depth === 0) return -width / 2;
        const pos = positions.get(d.id) || { x: 0, y: 0 };
        const parentPos = d.parent ? (positions.get(d.parent.id) || { x: 0, y: 0 }) : null;
        if (!parentPos || pos.x < parentPos.x) return -width;
        return 0;
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
    // Use cached display lines if available
    const cached = thisRenderer.measureCache.get(d.id);
    let displayLines: string[];
    let textBlockH: number;
    let hasText: boolean;
    if (cached && cached.displayLines) {
      displayLines = cached.displayLines;
      textBlockH = cached.textHeight ?? 0;
      hasText = cached.hasText ?? false;
    } else {
      let displayContent = ((d as any).metadata?.displayContent ?? d.content ?? '');
      displayContent = displayContent.replace(/\[(codeblock|quoteblock|image|tableblock):\d+\]/gi, '').trim();
      displayLines = thisRenderer.wrapText(
        displayContent,
        depth === 0 ? LAYOUT_CONFIG.ROOT_MAX_WIDTH - this.config.padding.x * 2 : Infinity,
        textFontSize,
        this.getFontWeight(depth)
      );
      textBlockH = 0;
      displayLines.forEach(line => {
        const lineSegments = parseMarkdownLine(line);
        const maxLineH = lineSegments.reduce((max, seg) => {
          const h = seg.heading ? getHeadingLineHeight(seg.heading) : textLineHeight;
          return Math.max(max, h);
        }, 0);
        textBlockH += maxLineH || textLineHeight;
      });
      hasText = displayLines.length > 0;
    }

    // Y start: rect top + padding + text height
    const rectTop = -height / 2;
    let blockY = rectTop + this.config.padding.y + textBlockH;
    
    // Consistent gap logic: if anything is above the note blocks, we need a PILL_GAP.
    // This matches the measurement logic in measureNode.
    if (hasText || d.metadata.image) {
      blockY += NB.PILL_GAP;
    }
    
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

    const nodeFill = (() => {
      if (isDark) {
        if (depth === 0) return RendererColors.node.rootFillDark;
        return ColorManager.getThemeShade(d.color, true) || RendererColors.node.branchFallbackDark;
      }
      if (depth === 0) return RendererColors.node.rootFillLight;
      return d.color || RendererColors.node.branchFallbackLight;
    })();

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
      const lineH = type === 'code' ? NB.CODE_LINE_HEIGHT : (type === 'quote' ? NB.QUOTE_LINE_HEIGHT : NB.TABLE_LINE_HEIGHT);
      const blockFontFamily = type === 'code' ? NB.MONO_FONT.replace(/'/g, "") : 'Inter, sans-serif';
      const contentLines = rawContent.split(/\r?\n/).flatMap((line: string) =>
        thisRenderer.wrapText(line, NB.MAX_WIDTH - (type === 'code' ? 16 : 24), lineH, 'normal', blockFontFamily, type === 'code')
      );
      const vPad = type === 'code' ? NB.CODE_V_PADDING : (type === 'quote' ? NB.QUOTE_V_PADDING : NB.TABLE_V_PADDING);
      const headerH = (type === 'table') ? NB.TABLE_HEADER_HEIGHT : NB.CODE_HEADER_HEIGHT;

      // Calculate dimensions
      let expandedH = NB.PILL_HEIGHT;
      // Phase 5: Use cached height from measureNode if available
      const cachedBlockHeight = (block.ref as any)._cachedExpandedHeight;
      if (cachedBlockHeight !== undefined) {
        expandedH = cachedBlockHeight;
      } else if (isExpanded) {
        if (type === 'table') {
          let totalTableHeight = NB.TABLE_HEADER_HEIGHT + (NB.TABLE_V_PADDING * 2);
          const colWidths = block.ref.colWidths || [];
          const getCellLines = (txt: string, maxWidth?: number) => {
            const rawLines = (txt || '').replace(/<br\s*\/?>/gi, '\n').replace(/\\n/g, '\n').replace(/\\t/g, '    ').replace(/\t/g, '    ').split(/\r?\n/);
            if (maxWidth === undefined || maxWidth <= 0) return rawLines;
            return rawLines.flatMap((line: string) => thisRenderer.wrapText(line, maxWidth, NB.TABLE_LINE_HEIGHT, '400', 'Inter, sans-serif'));
          };
          if (block.ref.headers?.length) {
            let maxLinesInHeader = 1;
            block.ref.headers.forEach((h: string, i: number) => {
              const colW = colWidths[i] || (innerW / (block.ref.headers?.length || 1));
              maxLinesInHeader = Math.max(maxLinesInHeader, getCellLines(h, Math.max(500, colW - 40)).length);
            });
            totalTableHeight += NB.TABLE_HEADER_HEIGHT + (maxLinesInHeader - 1) * NB.TABLE_LINE_HEIGHT;
          }

          block.ref.rows?.forEach((row: string[]) => {
            let maxLinesInRow = 1;
            row.forEach((cell, i) => {
              const colW = colWidths[i] || (innerW / (row.length || 1));
              maxLinesInRow = Math.max(maxLinesInRow, getCellLines(cell, Math.max(500, colW - 40)).length);
            });
            totalTableHeight += NB.TABLE_ROW_HEIGHT + (maxLinesInRow - 1) * NB.TABLE_LINE_HEIGHT;
          });
          expandedH = totalTableHeight + 8; // Extra buffer for expanded table background
        } else {
          expandedH = headerH + vPad + (contentLines.length * lineH) + vPad;
        }
      }

      // Transition the block group's position (for cascade moves)
      blockGroup.interrupt()
        .transition()
        .duration(duration)
        .ease(d3.easeCubicOut)
        .delay(delay)
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
        .delay(delay)
        .attr('width', innerW)
        .attr('height', expandedH)
        .attr('fill', isExpanded ? expandedBg : pillBg);

      // Clean up background selection
      bgRect.style('cursor', 'pointer')
        // Prevent pan start when clicking directly on the block to avoid zoom interference
        .on('pointerdown', (e) => e.stopPropagation())
        .on('click', (event: any) => {
          event.stopPropagation();
          // Toggle expansion on click for both collapsed and expanded states
          block.ref.expanded = !isExpanded;
          // Notify the application to trigger a layout recalculation
          thisRenderer.nodeUpdateCallback(d.id);
        })

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
        .transition().duration(duration).delay(delay).attr('opacity', 1);

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
          return line;
        });

      // ── 4. Expanded Table Content ──
      const tableContent = blockGroup.selectAll<SVGGElement, any>('g.table-content')
        .data(isExpanded && type === 'table' ? [block] : []);

      tableContent.exit().remove();
      const tableEnter = tableContent.enter().append('g').attr('class', 'table-content').attr('opacity', 0);

      const tableUpdate = tableEnter.merge(tableContent as any);
      tableUpdate.transition().duration(duration).attr('opacity', 1);

      tableUpdate.each(function (b) {
        const g = d3.select(this);
        
        // Stabilize table rendering to prevent flickering during unrelated node updates
        const tableContentKey = `${b.ref.headers?.join('|')}-${b.ref.rows?.map(r => r.join('|')).join('||')}`;
        const tableKey = `${b.id}-${tableContentKey}-${b.ref.expanded}-${innerW}`;
        if (g.attr('data-last-key') === tableKey) {
          expandedH = parseFloat(g.attr('data-last-height') || '0');
          return;
        }
        g.attr('data-last-key', tableKey);

        g.selectAll('*').remove();

        const headers = b.ref.headers || [];
        const rows = b.ref.rows || [];
        const alignments = b.ref.alignments || [];
        const colCount = Math.max(headers.length, ...rows.map(r => r.length));

        // 1. Re-calculate adaptive column widths exactly as web-export-manager does
        const getCellLinesRaw = (txt: string, mw?: number) => {
          const raw = (txt || '').replace(/<br\s*\/?>/gi, '\n').replace(/\\n/g, '\n').replace(/\\t/g, '    ').replace(/\t/g, '    ').split(/\r?\n/);
          if (mw === undefined) return raw;
          const mFn = (t: string, f: string) => { 
            if (thisRenderer.measureCtx) { 
              thisRenderer.measureCtx.font = f; 
              return thisRenderer.measureCtx.measureText(t).width; 
            } 
            return t.length * (NB.TABLE_LINE_HEIGHT * 0.6); 
          };
          return raw.flatMap(l => wrapText(l, Math.max(500, mw || 0), NB.TABLE_LINE_HEIGHT, 'normal', mFn, 'Inter, sans-serif'));
        };

        const rawCols = new Array(colCount).fill(0);
        const allRows = headers.length > 0 ? [headers, ...rows] : rows;
        allRows.forEach((row, ri) => {
          (row || []).forEach((cell, ci) => {
            if (ci >= colCount) return;
            const weight = (headers.length > 0 && ri === 0) ? 'bold' : '400';
            const lines = getCellLinesRaw(cell);
            lines.forEach(l => {
              const w = measureRichTextWidth(l, NB.TABLE_LINE_HEIGHT, weight, (t, f) => {
                if (thisRenderer.measureCtx) {
                  thisRenderer.measureCtx.font = f;
                  return thisRenderer.measureCtx.measureText(t).width;
                }
                return t.length * NB.TABLE_LINE_HEIGHT * 0.6;
              });
              rawCols[ci] = Math.max(rawCols[ci], w + 60);
            });
          });
        });

        const totalRawW = rawCols.reduce((s, w) => s + w, 0);
        // Do not scale down below natural width, only scale up if node is wider
        const scale = innerW > totalRawW ? innerW / totalRawW : 1.0;
        const finalColWidths = rawCols.map(w => w * scale);

        let runningY = headerH + NB.TABLE_V_PADDING;
        const startY = runningY;

        // 2. Exact row drawing loop mirroring web-export-manager
        const drawRow = (data: string[], isHeader: boolean) => {
          let currentX = 0;
          let maxLinesInRow = 1;
          const wrappedCells = data.map((cell, i) => {
            const lines = getCellLinesRaw(cell, Math.max(500, finalColWidths[i] - 60));
            maxLinesInRow = Math.max(maxLinesInRow, lines.length);
            return lines;
          });
          const baseH = isHeader ? NB.TABLE_HEADER_HEIGHT : NB.TABLE_ROW_HEIGHT;
          const rowH = baseH + (maxLinesInRow - 1) * NB.TABLE_LINE_HEIGHT;

          data.forEach((cell, i) => {
            const cw = finalColWidths[i];
            const align = alignments[i] || 'left';
            const lines = wrappedCells[i];
            const numLines = lines.length;
            const cellStartY = runningY + (rowH - (numLines - 1) * NB.TABLE_LINE_HEIGHT) / 2;

            // Use a per-cell group to enable clipping similar to export manager
            const cellG = g.append('g');

            lines.forEach((line, li) => {
              let textX = currentX + 30; // 30px left padding
              if (align === 'center') textX = currentX + cw / 2;
              else if (align === 'right') textX = currentX + cw - 30; // 30px right padding
              
              const lineY = cellStartY + li * NB.TABLE_LINE_HEIGHT;
              const textElement = cellG.append('text')
                .attr('x', textX)
                .attr('y', lineY)
                .attr('font-size', `${NB.TABLE_LINE_HEIGHT}px`)
                .attr('fill', isHeader
                  ? (isDark ? RendererColors.noteBlock.tableHeaderDark : RendererColors.noteBlock.tableHeaderLight)
                  : (isDark ? RendererColors.noteBlock.tableCellDark : RendererColors.noteBlock.tableCellLight))
                .attr('text-anchor', align === 'center' ? 'middle' : align === 'right' ? 'end' : 'start')
                .attr('dominant-baseline', 'central');

              const segments = parseMarkdownLine(line);
              segments.forEach(seg => {
                const tspan = textElement.append('tspan')
                  .text(seg.text)
                  .style('font-weight', (isHeader || seg.bold) ? 'bold' : 'normal')
                  .style('font-style', seg.italic ? 'italic' : 'normal')
                  .style('text-decoration', seg.strikethrough ? 'line-through' : (seg.underline || seg.link ? 'underline' : 'none'))
                  .style('fill', seg.link ? ColorManager.getLinkColor(nodeFill) : (seg.highlight ? RendererColors.inline.highlightText : ''))
                  .attr('baseline-shift', seg.superscript ? 'super' : (seg.subscript ? 'sub' : '0'))
                  .attr('font-size', (seg.superscript || seg.subscript) ? `${NB.TABLE_LINE_HEIGHT * 0.75}px` : `${NB.TABLE_LINE_HEIGHT}px`)
                  .each(function () {
                    // Highlights logic
                    if (seg.highlight) {
                      d3.select(this)
                        .style('stroke', RendererColors.inline.highlightFill)
                        .style('stroke-width', '2.5px')
                        .style('stroke-opacity', 0.5)
                        .style('stroke-linecap', 'round')
                        .style('stroke-linejoin', 'round')
                        .style('paint-order', 'stroke fill');
                    }
                    // Keyboard/Kbd logic
                    if (seg.keyboard) {
                      d3.select(this)
                        .style('font-family', NB.MONO_FONT)
                        .style('background', isDark ? '#334155' : '#f1f5f9');
                    }
                  });

                if (seg.link) {
                  tspan
                    .style('cursor', 'pointer')
                    .on('click', (event: any) => {
                      event.stopPropagation();
                      window.open(seg.link, '_blank');
                    });
                }
              });
            });
            currentX += cw;
          });

          if (isHeader) {
            g.append('line')
              .attr('x1', 0)
              .attr('y1', runningY + rowH)
              .attr('x2', innerW)
              .attr('y2', runningY + rowH)
              .attr('stroke', isDark ? RendererColors.noteBlock.tableDividerDark : RendererColors.noteBlock.tableDividerLight)
              .attr('stroke-width', 1.5);
          }
          runningY += rowH;
        };

        if (headers.length > 0) drawRow(headers, true);
        rows.forEach(r => drawRow(r, false));

        // 3. Final background sync
        const finalH = Math.max(NB.PILL_HEIGHT, runningY + NB.TABLE_V_PADDING);
        bgRect.attr('height', finalH);
        expandedH = finalH;
        g.attr('data-last-height', expandedH);


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
  private renderLinks(links: any[], positions: Map<string, Position>, visibleIds: Set<string>): void {
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

    // Phase 2: Visibility-based culling — hide links to off-screen nodes
    update
      .style('visibility', (d) => (visibleIds.has(d.source.id) && visibleIds.has(d.target.id)) ? 'visible' : 'hidden')
      .style('display', (d) => (visibleIds.has(d.source.id) && visibleIds.has(d.target.id)) ? null : 'none');

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
