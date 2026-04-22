/**
 * Feature: D3.js Renderer (Lite - No Animations)
 * Purpose: Instant-render mind map visualization using D3.js — zero transitions
 * Dependencies: D3.js, RendererAdapter interface, core types
 */

import * as d3 from 'd3';
import { RendererAdapter } from '../adapters/renderer-adapter';
import { TreeNode, Position, NodeChange, Transform } from '@/core/types';
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
  getHeadingLineHeight,
} from '@/core/utils/text-rendering';

/**
 * Lite version of D3Renderer — identical features, instant rendering, no animations.
 * Designed for export and scenarios where animation overhead is unnecessary.
 */
export class D3RendererLite implements RendererAdapter {
  private container: HTMLElement | null = null;
  private svg: d3.Selection<SVGSVGElement, unknown, null, undefined> | null = null;
  private g: d3.Selection<SVGGElement, unknown, null, undefined> | null = null;
  private zoom: d3.ZoomBehavior<SVGSVGElement, unknown> | null = null;
  private lastRoot: TreeNode | null = null;
  private lastPositions: Map<string, Position> | null = null;
  private highlightIds: Set<string> = new Set();
  private selectedNodeId: string | null = null;
  private isVertical: boolean = false;
  private isDarkMode: boolean = false;
  private measureCtx: CanvasRenderingContext2D | null = null;

  private measureCache = new LRUCache<string, {
    contentKey: string;
    width: number;
    height: number;
    imageThumbWidth?: number;
    imageThumbHeight?: number;
  }>(2000);
  private _imageHrefCache = new WeakMap<SVGImageElement, string>();
  private pendingTransform: Transform | null = null;
  private rafId: number | null = null;
  private pendingPan: { dx: number; dy: number } | null = null;
  private panRafId: number | null = null;

  public onTransform?: (transform: Transform) => void;

  private readonly config = {
    padding: {
      x: 12 * 0.75,
      y: 12 * 0.75,
    },
    margin: {
      x: 40 * 0.75,
      y: 20 * 0.75,
    },
    borderRadius: 6,
    animationDuration: 0,
    staggerDelay: 0,
    highlightColor: RendererColors.action.highlight,
  };

  private getFontSize(depth: number): number {
    return getNoteBlockFontSize(depth);
  }

  private getFontWeight(depth: number): string {
    return getNoteBlockFontWeight(depth);
  }

  private getLineHeight(depth: number): number {
    return getNoteBlockLineHeight(depth);
  }

  private wrapText(
    text: string,
    maxWidth: number,
    fontSize: number,
    fontWeight: string,
    fontFamily: string = 'Inter, sans-serif',
    literal: boolean = false
  ): string[] {
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

    d3.select(container).selectAll('*').remove();

    this.svg = d3
      .select(container)
      .append('svg')
      .attr('width', '100%')
      .attr('height', '100%')
      .attr('class', 'inklink-canvas');

    this.g = this.svg.append('g').attr('class', 'mindmap-content');
    this.g.append('g').attr('class', 'links-layer');
    this.g.append('g').attr('class', 'nodes-layer');

    this.zoom = d3
      .zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 4])
      .translateExtent([
        [-5000, -5000],
        [5000, 5000],
      ])
      .filter((event) => {
        const isAllowedButton =
          event.button === 0 || event.button === 1 || event.button === undefined;
        return !event.ctrlKey && !event.altKey && !event.metaKey && isAllowedButton;
      })
      .on('start', () => {
        this.svg?.style('cursor', 'grabbing');
      })
      .on('zoom', (event) => {
        if (this.g) {
          this.g.attr('transform', event.transform);
        }
        if (this.onTransform) {
          this.pendingTransform = {
            x: event.transform.x,
            y: event.transform.y,
            scale: event.transform.k,
          };
          if (!this.rafId) {
            this.rafId = requestAnimationFrame(() => {
              this.rafId = null;
              if (this.pendingTransform && this.onTransform) {
                this.onTransform(this.pendingTransform);
                this.pendingTransform = null;
              }
            });
          }
        }
      })
      .on('end', () => {
        this.svg?.style('cursor', 'grab');
      });

    this.zoom.clickDistance(8);
    this.svg
      .call(this.zoom)
      .style('cursor', 'grab')
      .on('click', () => {
        if (this.nodeClickCallback) this.nodeClickCallback('');
      })
      .filter(() => true)
      .on(
        'wheel.zoom',
        (event: WheelEvent) => {
          event.preventDefault();
          const isZoom = event.ctrlKey || event.altKey || event.metaKey;
          if (isZoom) {
            const delta =
              -event.deltaY * (event.deltaMode === 1 ? 0.05 : event.deltaMode === 2 ? 1 : 0.002);
            const factor = Math.pow(2, delta);
            const [mx, my] = d3.pointer(event, this.svg?.node());
            if (this.zoom && this.svg) {
              this.zoom.scaleBy(this.svg as any, factor, [mx, my]);
            }
          } else {
            let dx = event.deltaX;
            let dy = event.deltaY;
            if (event.shiftKey && Math.abs(dy) > Math.abs(dx)) {
              dx = dy;
              dy = 0;
            }
            if (event.deltaMode === 1) {
              dx *= 20;
              dy *= 20;
            } else if (event.deltaMode === 2) {
              dx *= 200;
              dy *= 200;
            }
            // Batch pan updates for smoother wheel scrolling
            if (!this.pendingPan) {
              this.pendingPan = { dx: 0, dy: 0 };
            }
            this.pendingPan.dx += -dx;
            this.pendingPan.dy += -dy;
            if (!this.panRafId) {
              this.panRafId = requestAnimationFrame(() => {
                this.panRafId = null;
                if (this.pendingPan && this.zoom && this.svg) {
                  this.zoom.translateBy(this.svg as any, this.pendingPan.dx, this.pendingPan.dy);
                  this.pendingPan = null;
                }
              });
            }
          }
        },
        { passive: false }
      );

    imageDimensionStore.subscribe(() => {
      if (this.lastRoot) {
        this.nodeUpdateCallback(this.lastRoot.id);
      }
    });
  }

  /**
   * Render the complete tree — instant, no animations
   */
  render(root: TreeNode, positions: Map<string, Position>, isDarkMode: boolean = false): void {
    if (!this.g || !this.svg || !root || !positions) {
      if (!root || !positions) this.clear();
      return;
    }
    this.isDarkMode = isDarkMode;

    for (const pos of positions.values()) {
      if (Number.isNaN(pos.x) || Number.isNaN(pos.y)) {
        console.error('D3RendererLite: Invalid positions (NaN) detected', positions);
        this.clear();
        return;
      }
    }

    this.lastRoot = root;
    this.lastPositions = positions;

    if (root.children.length > 0) {
      const rootPos = positions.get(root.id) || { x: 0, y: 0 };
      let maxDx = 0;
      root.children.forEach((child) => {
        const childPos = positions.get(child.id);
        if (childPos) {
          maxDx = Math.max(maxDx, Math.abs(childPos.x - rootPos.x));
        }
      });
      this.isVertical = maxDx < 40;
    }

    const allNodes = this.flattenTree(root);

    if (!this.measureCtx) {
      const canvas = document.createElement('canvas');
      this.measureCtx = canvas.getContext('2d');
    }

    allNodes.forEach((node) => this.measureNode(node));

    const allLinks = this.getLinks(allNodes);

    this.renderLinks(allLinks, positions);
    this.renderNodes(allNodes, positions);
  }

  private getMeasureContentKey(node: TreeNode): string {
    const display = (node as any).metadata?.displayContent ?? node.content ?? '';
    const imageUrl = node.metadata.image?.url ?? '';
    const codeCount = (node.metadata.codeBlocks ?? []).reduce(
      (s: number, b: any) => s + (b.expanded ? 1 : 0) + b.code.length,
      0
    );
    const quoteCount = (node.metadata.quoteBlocks ?? []).reduce(
      (s: number, b: any) => s + (b.expanded ? 1 : 0) + b.text.length,
      0
    );
    const tableContentKey = (node.metadata.tableBlocks ?? []).reduce((s: number, b: any) => {
      const hLen = (b.headers ?? []).reduce((acc: number, h: string) => acc + (h?.length || 0), 0);
      const rLen = (b.rows ?? []).reduce(
        (acc: number, r: any[]) =>
          acc + r.reduce((ra: number, c: any) => ra + (String(c)?.length || 0), 0),
        0
      );
      return s + (b.expanded ? 1 : 0) + hLen + rLen;
    }, 0);
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
    return `${node.depth}|${display.length}|${imageUrl}|${imageState}|${codeCount}|${quoteCount}|${tableContentKey}|v3`;
  }

  private measureNode(node: TreeNode): void {
    if (!this.measureCtx) {
      const canvas = document.createElement('canvas');
      this.measureCtx = canvas.getContext('2d');
    }
    const ctx = this.measureCtx;

    const contentKey = this.getMeasureContentKey(node);
    const cached = this.measureCache.get(node.id);
    if (cached && cached.contentKey === contentKey) {
      node.metadata.width = cached.width;
      node.metadata.height = cached.height;
      // Phase 3 sync: Fast-path — restore image thumb dimensions from cache
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
    const rootMaxW =
      (depth === 0 ? LAYOUT_CONFIG.ROOT_MAX_WIDTH : Infinity) - this.config.padding.x * 2;

    if (ctx) ctx.font = `${fontWeight} ${fontSize}px Inter, sans-serif`;

    let displayContent = (node as any).metadata?.displayContent ?? node.content ?? '';
    displayContent = displayContent.replace(
      /\[(codeblock|quoteblock|image|tableblock):\d+\]/gi,
      ''
    );
    displayContent = displayContent
      .split('\n')
      .map((line: string) => line.replace(/^(\s*)[-*+]\s*\[([ xX])\]/, '$1[$2]'))
      .join('\n')
      .trim();

    const displayLines = this.wrapText(displayContent, rootMaxW, fontSize, fontWeight);
    let maxWidth = 0;

    displayLines.forEach((line) => {
      const segments = parseMarkdownLine(line);
      let lineWidth = 0;
      segments.forEach((seg) => {
        if (ctx) {
          const segFontSize = seg.heading
            ? getHeadingFontSize(seg.heading)
            : seg.subscript || seg.superscript
              ? fontSize * 0.7
              : fontSize;
          const segFontFamily = seg.keyboard
            ? LAYOUT_CONFIG.NOTE_BLOCK.MONO_FONT
            : 'Inter, sans-serif';
          const textToMeasure = seg.checkbox ? '☑ ' : seg.text;
          ctx.font = `${seg.bold || (seg.heading && seg.heading <= 3) ? 'bold ' : fontWeight} ${seg.italic ? 'italic ' : ''}${segFontSize}px ${segFontFamily}`;
          lineWidth += ctx.measureText(textToMeasure).width;
        } else {
          const segFontSize = seg.heading
            ? getHeadingFontSize(seg.heading)
            : seg.subscript || seg.superscript
              ? fontSize * 0.7
              : fontSize;
          lineWidth += seg.text.length * (segFontSize * 0.6);
        }
      });
      maxWidth = Math.max(maxWidth, lineWidth);
    });

    const hasText = displayContent.length > 0;
    node.metadata.width = maxWidth + this.config.padding.x * 2;

    let totalTextHeight = 0;
    displayLines.forEach((line) => {
      const lineSegments = parseMarkdownLine(line);
      const maxLineH = lineSegments.reduce((max, seg) => {
        const h = seg.heading ? getHeadingLineHeight(seg.heading) : lineHeight;
        return Math.max(max, h);
      }, 0);
      totalTextHeight += maxLineH || lineHeight;
    });
    node.metadata.height = (hasText ? totalTextHeight : 0) + this.config.padding.y * 2;

    const codeBlocks = node.metadata.codeBlocks || [];
    const quoteBlocks = node.metadata.quoteBlocks || [];
    const tableBlocks = node.metadata.tableBlocks || [];
    const hasNoteBlocks = codeBlocks.length > 0 || quoteBlocks.length > 0 || tableBlocks.length > 0;

    if (node.metadata.image) {
      const image = node.metadata.image;
      const imgConfig = LAYOUT_CONFIG.IMAGE;

      const dims = imageDimensionStore.getDimensions(image.url);
      if (dims) {
        image.width = dims.width;
        image.height = dims.height;
        image.aspect = dims.aspect;
      }

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
        const isActuallyLoading = imageDimensionStore.isLoading(image.url);
        image.thumbWidth = isActuallyLoading ? 40 : 0;
        image.thumbHeight = isActuallyLoading ? 30 : 0;
        if (!isActuallyLoading && !image.thumbWidth) {
          image.thumbWidth = 40;
          image.thumbHeight = 30;
          (image as any).failed = true;
        }
      }

      const thumbH = image.thumbHeight ?? 0;
      const thumbW = image.thumbWidth ?? 0;
      node.metadata.height += thumbH;

      if (thumbH > 0 && (hasText || hasNoteBlocks)) {
        node.metadata.height += imgConfig.PADDING;
      }

      if (thumbW > maxWidth) {
        maxWidth = thumbW;
        node.metadata.width = maxWidth + this.config.padding.x * 2;
      }
    }

    const NB = LAYOUT_CONFIG.NOTE_BLOCK;
    const allNoteBlocks: Array<{
      expanded: boolean;
      content: string;
      isQuote: boolean;
      isTable: boolean;
      headers?: string[];
      rows?: string[][];
    }> = [
      ...codeBlocks.map((b) => ({
        expanded: b.expanded,
        content: b.code,
        isQuote: false,
        isTable: false,
      })),
      ...quoteBlocks.map((b) => ({
        expanded: b.expanded,
        content: b.text,
        isQuote: true,
        isTable: false,
      })),
      ...tableBlocks.map((b) => ({
        expanded: b.expanded,
        content: '',
        isQuote: false,
        isTable: true,
        headers: b.headers,
        rows: b.rows,
      })),
    ];

    if (allNoteBlocks.length > 0) {
      let maxNoteWidth = 180 * 0.75;
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
            return rawLines.flatMap((line: string) => wrapText(line, maxWidth, NB.TABLE_LINE_HEIGHT, '400', mFn, 'Inter, sans-serif'));
          };

          const colCount = Math.max(block.headers?.length || 0, ...(block.rows?.map(r => r.length) || [0]));
          const colWidths = new Array(colCount).fill(0);

          if (colCount > 0) {
            if (ctx) ctx.font = `${NB.TABLE_LINE_HEIGHT}px Inter, sans-serif`;

            // First pass: measure natural widths for columns (Adaptive)
            const measureCol = (row: string[], weight: string) => {
              row.forEach((cell, i) => {
                const lines = getCellLines(cell);
                lines.forEach(line => {
                  const w = measureRichTextWidth(line, NB.TABLE_LINE_HEIGHT, weight, (t, f) => {
                    if (ctx) { ctx.font = f; return ctx.measureText(t).width; }
                    return t.length * NB.TABLE_LINE_HEIGHT * 0.6;
                  });
                  colWidths[i] = Math.max(colWidths[i], w + 60 + 4); // padding + buffer
                });
              });
            };

            if (block.headers) measureCol(block.headers, 'bold');
            block.rows?.forEach(row => measureCol(row, '400'));

            // Second pass: Calculate row heights based on wrapped lines
            if (block.headers?.length) {
              let maxLinesInHeader = 1;
              block.headers.forEach((h, i) => {
                maxLinesInHeader = Math.max(maxLinesInHeader, getCellLines(h, Math.max(500, colWidths[i] - NB.TABLE_CELL_HPADDING * 2)).length);
              });
              totalTableHeight += NB.TABLE_HEADER_HEIGHT + (maxLinesInHeader - 1) * NB.TABLE_LINE_HEIGHT;
            }

            block.rows?.forEach(row => {
              let maxLinesInRow = 1;
              row.forEach((cell, i) => {
                maxLinesInRow = Math.max(maxLinesInRow, getCellLines(cell, Math.max(500, colWidths[i] - NB.TABLE_CELL_HPADDING * 2)).length);
              });
              totalTableHeight += NB.TABLE_ROW_HEIGHT + (maxLinesInRow - 1) * NB.TABLE_LINE_HEIGHT;
            });

            node.metadata.height += totalTableHeight;

            if (tableBlocks[idx - codeBlocks.length - quoteBlocks.length]) {
              tableBlocks[idx - codeBlocks.length - quoteBlocks.length].colWidths = colWidths;
            }

            const totalTableW = colWidths.reduce((sum, w) => sum + w, 0);
            if (totalTableW > maxNoteWidth) maxNoteWidth = totalTableW;
          }
        } else {
          const lineH = block.isQuote ? NB.QUOTE_LINE_HEIGHT : NB.CODE_LINE_HEIGHT;
          const blockFontFamily = block.isQuote
            ? 'Inter, sans-serif'
            : NB.MONO_FONT.replace(/'/g, '');

          const wrapW = NB.MAX_WIDTH - (block.isQuote ? 24 : 16);
          const lines = (block.content || '')
            .split(/\r?\n/)
            .flatMap((line: string) =>
              this.wrapText(line, wrapW, lineH, 'normal', blockFontFamily)
            );

          const fontRef = `${lineH}px ${blockFontFamily}`;
          if (ctx) ctx.font = fontRef;

          lines.forEach((line) => {
            let lineWidth = 0;
            if (ctx) {
              lineWidth =
                ctx.measureText(line).width + (block.isQuote ? NB.QUOTE_BORDER_WIDTH + 16 : 16);
            } else {
              lineWidth = line.length * (lineH * 0.6) + 16;
            }
            if (lineWidth > maxNoteWidth) maxNoteWidth = lineWidth;
          });

          const vPad = block.isQuote ? NB.QUOTE_V_PADDING : NB.CODE_V_PADDING;
          const expandedH = NB.CODE_HEADER_HEIGHT + vPad + lines.length * lineH + vPad;
          node.metadata.height += expandedH;
        }
      });

      if (maxNoteWidth > maxWidth) {
        maxWidth = maxNoteWidth;
        node.metadata.width = maxWidth + this.config.padding.x * 2;
      }
    }

    const cacheEntry: {
      contentKey: string;
      width: number;
      height: number;
      imageThumbWidth?: number;
      imageThumbHeight?: number;
    } = {
      contentKey,
      width: node.metadata.width,
      height: node.metadata.height,
    };

    // Phase 3 sync: Cache image thumb dimensions
    if (node.metadata.image) {
      cacheEntry.imageThumbWidth = node.metadata.image.thumbWidth;
      cacheEntry.imageThumbHeight = node.metadata.image.thumbHeight;
    }

    this.measureCache.set(node.id, cacheEntry);
  }

  /**
   * Update — triggers full re-render (instant)
   */
  update(changes: NodeChange[]): void {
    if (this.lastRoot && this.lastPositions) {
      this.render(this.lastRoot, this.lastPositions, this.isDarkMode);
    }
  }

  /**
   * Fast-path: update only stroke visuals for highlight/selection
   */
  private updateNodeVisuals(): void {
    if (!this.g) return;
    this.g
      .selectAll<SVGRectElement, TreeNode>('rect.node-bg')
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
      .attr('stroke-width', (d) =>
        this.selectedNodeId === d.id || this.highlightIds.has(d.id) ? 3 : 1.5
      );
  }

  /**
   * Clear all rendered elements
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
   * Get viewport bounds
   */
  getViewportBounds(): { width: number; height: number } {
    const rect = this.container?.getBoundingClientRect() || { width: 0, height: 0 };
    return { width: rect.width, height: rect.height };
  }

  /**
   * Set the current transform from external source
   */
  setTransform(transform: Transform): void {
    if (!this.svg || !this.zoom) return;
    this.svg.call(
      this.zoom.transform,
      d3.zoomIdentity.translate(transform.x, transform.y).scale(transform.scale)
    );
  }

  /**
   * Get the current transform
   */
  getTransform(): Transform {
    if (!this.svg) return { x: 0, y: 0, scale: 1 };
    const t = d3.zoomTransform(this.svg.node() as SVGSVGElement);
    return { x: t.x, y: t.y, scale: t.k };
  }

  private nodeClickCallback: (nodeId: string) => void = () => {};
  private nodeDoubleClickCallback: (nodeId: string) => void = () => {};
  private nodeToggleCallback: (nodeId: string) => void = () => {};
  private nodeUpdateCallback: (nodeId: string) => void = () => {};
  private nodeLinkClickCallback: (url: string) => void = () => {};
  private nodeImageClickCallback: (url: string, alt?: string, link?: string) => void = () => {};
  private blockToggleCallback: (nodeId: string) => void = () => {};

  onNodeClick(callback: (nodeId: string) => void): void {
    this.nodeClickCallback = callback;
  }

  onNodeDoubleClick(callback: (nodeId: string) => void): void {
    this.nodeDoubleClickCallback = callback;
  }

  onNodeToggle(callback: (nodeId: string) => void): void {
    this.nodeToggleCallback = callback;
  }

  onNodeUpdate(callback: (nodeId: string) => void): void {
    this.nodeUpdateCallback = callback;
  }

  onNodeLinkClick(callback: (url: string) => void): void {
    this.nodeLinkClickCallback = callback;
  }

  onNodeImageClick(callback: (url: string, alt?: string, link?: string) => void): void {
    this.nodeImageClickCallback = callback;
  }

  onBlockToggle(callback: (nodeId: string) => void): void {
    this.blockToggleCallback = callback;
  }

  highlightNodes(nodeIds: string[]): void {
    this.highlightIds = new Set(nodeIds);
    if (this.g) {
      this.updateNodeVisuals();
      return;
    }
    if (this.lastRoot && this.lastPositions) {
      this.render(this.lastRoot, this.lastPositions, this.isDarkMode);
    }
  }

  setSelectedNode(nodeId: string | null): void {
    this.selectedNodeId = nodeId;
    if (this.g) {
      this.updateNodeVisuals();
      return;
    }
    if (this.lastRoot && this.lastPositions) {
      this.render(this.lastRoot, this.lastPositions, this.isDarkMode);
    }
  }

  /**
   * Render nodes — instant, no animations
   */
  private renderNodes(nodes: TreeNode[], positions: Map<string, Position>): void {
    if (!this.g) return;
    const thisRenderer = this;
    const layer = this.g.select('g.nodes-layer');

    const nodeGroups = layer.selectAll<SVGGElement, TreeNode>('g.node').data(nodes, (d) => d.id);

    // EXIT
    nodeGroups.exit().remove();

    // ENTER
    const enter = nodeGroups
      .enter()
      .append('g')
      .attr('class', 'node')
      .attr('cursor', 'pointer')
      .attr('opacity', 1)
      .attr('tabindex', -1)
      .style('outline', 'none')
      .attr('role', 'button')
      .attr('aria-label', (d) => `Node: ${d.content}`);

    enter
      .append('defs')
      .append('clipPath')
      .attr('id', (d) => `clip-${d.id}`)
      .append('rect')
      .attr('rx', this.config.borderRadius)
      .attr('ry', this.config.borderRadius);

    enter
      .append('rect')
      .attr('class', 'node-bg')
      .attr('rx', this.config.borderRadius)
      .attr('ry', this.config.borderRadius)
      .attr('stroke-width', 1.5);

    enter.append('text').attr('font-family', 'Inter, sans-serif').attr('xml:space', 'preserve');

    enter.append('g').attr('class', 'image-container').append('image');

    const update = enter.merge(nodeGroups);

    update
      .attr('data-id', (d) => d.id)
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
      .attr('transform', (d) => {
        const pos = positions.get(d.id) || { x: 0, y: 0 };
        return `translate(${pos.x}, ${pos.y})`;
      });

    update
      .select('text')
      .each(function (this: any, d: any) {
        const textElement = d3.select(this);
        const depth = d.depth || 0;
        const fontSize = thisRenderer.getFontSize(depth);
        const fontWeight = thisRenderer.getFontWeight(depth);

        let displayContent = (d as any).metadata?.displayContent ?? d.content ?? '';
        displayContent = displayContent.replace(
          /\[(codeblock|quoteblock|image|tableblock):\d+\]/gi,
          ''
        );
        displayContent = displayContent
          .split('\n')
          .map((line: string) => line.replace(/^(\s*)[-*+]\s*\[([ xX])\]/, '$1[$2]'))
          .join('\n')
          .trim();
        const displayLines = thisRenderer.wrapText(
          displayContent,
          depth === 0 ? LAYOUT_CONFIG.ROOT_MAX_WIDTH - thisRenderer.config.padding.x * 2 : Infinity,
          fontSize,
          fontWeight
        );

        const width = (d as any).metadata?.width || 0;
        let x: number;
        if (thisRenderer.isVertical) {
          x = -width / 2 + thisRenderer.config.padding.x;
        } else {
          const pos = positions.get(d.id) || { x: 0, y: 0 };
          const parentPos = d.parent ? positions.get(d.parent.id) || { x: 0, y: 0 } : null;
          if (!parentPos) x = -width / 2 + thisRenderer.config.padding.x;
          else if (pos.x < parentPos.x) x = -width + thisRenderer.config.padding.x;
          else x = thisRenderer.config.padding.x;
        }

        const tspanJoin = textElement
          .selectAll<SVGTSpanElement, string>('tspan.line')
          .data(displayLines, (line, i) => i);

        tspanJoin.exit().remove();

        const tspanEnter = tspanJoin.enter().append('tspan').attr('class', 'line');

        const tspanUpdate = tspanEnter.merge(tspanJoin);

        const nodeFill = (() => {
          if (thisRenderer.isDarkMode) {
            if (depth === 0) return RendererColors.node.rootFillDark;
            return (
              ColorManager.getThemeShade(d.color, true) || RendererColors.node.branchFallbackDark
            );
          }
          if (depth === 0) return RendererColors.node.rootFillLight;
          return d.color || RendererColors.node.branchFallbackLight;
        })();

        const totalLines = displayLines.length;
        const lineHeight = thisRenderer.getLineHeight(depth);
        let totalTextHeight = 0;
        displayLines.forEach((line) => {
          const lineSegments = parseMarkdownLine(line);
          const maxLineH = lineSegments.reduce((max, seg) => {
            const h = seg.heading ? getHeadingLineHeight(seg.heading) : lineHeight;
            return Math.max(max, h);
          }, 0);
          totalTextHeight += maxLineH || lineHeight;
        });
        const textH = totalTextHeight;
        const height = (d as any).metadata?.height || 0;

        let yOffset = -height / 2 + thisRenderer.config.padding.y;
        const image = d.metadata.image;
        const imgH = image && (image.thumbHeight ?? 0) > 0 ? (image.thumbHeight ?? 0) : 0;
        const hasText = displayLines.length > 0;
        const imgGap = imgH > 0 && hasText ? LAYOUT_CONFIG.IMAGE.PADDING : 0;
        yOffset += imgH + imgGap;
        const textOffset = yOffset + textH / 2;

        textElement.attr('y', textOffset).attr('x', x);

        const lineSegments = new Map<string, ReturnType<typeof parseMarkdownLine>>();
        displayLines.forEach((line) => lineSegments.set(line, parseMarkdownLine(line)));

        tspanUpdate
          .attr('x', (line) => {
            const segments = lineSegments.get(line) ?? [];
            const isCentered = segments.some((s) => s.center);

            if (isCentered) {
              if (thisRenderer.isVertical) return 0;
              const width = (d as any).metadata?.width || 0;
              const parentPos = d.parent ? positions.get(d.parent.id) || { x: 0, y: 0 } : null;
              const pos = positions.get(d.id) || { x: 0, y: 0 };

              if (!parentPos) return 0;
              if (pos.x < parentPos.x) return -width / 2;
              return width / 2;
            }
            return x;
          })
          .style('text-anchor', (line) => {
            const segments = lineSegments.get(line) ?? [];
            return segments.some((s) => s.center) ? 'middle' : null;
          })
          .attr('dy', (line, i) => (i === 0 ? `${0.35 - (totalLines - 1) * 0.625}em` : '1.25em'))
          .style('visibility', (line) => {
            const trimmed = line.trim();
            return trimmed === '---' || trimmed === '***' || trimmed === '___'
              ? 'hidden'
              : 'visible';
          });

        if (!this.parentNode) return;
        const nodeG = d3.select(this.parentNode as SVGGElement);
        const dividersData = displayLines
          .map((line, i) => ({ line: line.trim(), i }))
          .filter((d) => d.line === '---' || d.line === '***' || d.line === '___');
        const dividers = nodeG
          .selectAll<SVGLineElement, any>('line.hr-divider')
          .data(dividersData, (d) => `${d.line}-${d.i}`);

        dividers.exit().remove();

        dividers
          .enter()
          .append('line')
          .attr('class', 'hr-divider')
          .merge(dividers)
          .each(function (dInfo) {
            const { line, i } = dInfo;
            const width = (d as any).metadata?.width || 0;
            const isCentered = thisRenderer.isVertical || d.depth === 0;

            const blockTop = -height / 2 + thisRenderer.config.padding.y + imgH + imgGap;
            const lineY = blockTop + i * lineHeight + lineHeight / 2;

            const pos = positions.get(d.id) || { x: 0, y: 0 };
            const parentPos = d.parent ? positions.get(d.parent.id) || { x: 0, y: 0 } : null;
            let startX: number;
            if (isCentered) {
              startX = -width / 2;
            } else if (parentPos && pos.x < parentPos.x) {
              startX = -width;
            } else {
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
              .attr('stroke-dasharray', line === '***' || line === '___' ? '3,3' : 'none');
          });

        tspanUpdate.each(function (line) {
          const tspan = d3.select<SVGTSpanElement, string>(this);
          const segments = lineSegments.get(line) ?? parseMarkdownLine(line);

          const segmentJoin = tspan
            .selectAll<SVGTSpanElement, any>('tspan.segment')
            .data(segments, (s, i) => `${s.text}-${i}`);

          segmentJoin.exit().remove();

          const segEnter = segmentJoin.enter().append('tspan').attr('class', 'segment');

          const segUpdate = segEnter.merge(segmentJoin);

          segUpdate
            .text((s) => {
              if (s.checkbox) return s.checked ? '☑ ' : '☐ ';
              return s.text;
            })
            .style('font-weight', (s) =>
              s.bold
                ? 'bold'
                : s.heading && s.heading <= 3
                  ? 'bold'
                  : thisRenderer.getFontWeight(depth)
            )
            .style('font-style', (s) => (s.italic ? 'italic' : 'normal'))
            .style('text-decoration', (s) =>
              s.underline || s.link ? 'underline' : s.strikethrough ? 'line-through' : 'none'
            )
            .style('font-size', (s) =>
              s.heading
                ? `${getHeadingFontSize(s.heading)}px`
                : s.subscript || s.superscript
                  ? `${fontSize * 0.7}px`
                  : `${fontSize}px`
            )
            .style('fill', (s) => {
              if (s.checkbox || s.bullet) return RendererColors.inline.bullet;
              if (s.link) return ColorManager.getLinkColor(nodeFill);
              if (s.highlight) return RendererColors.inline.highlightText;
              return null;
            })
            .attr('baseline-shift', (s) =>
              s.subscript ? 'sub' : s.superscript ? 'super' : 'baseline'
            )
            .style('cursor', (s) => (s.link || s.details ? 'pointer' : 'default'))
            .each(function (s) {
              const seg = d3.select(this);
              if (s.math) {
                seg.style('font-family', 'serif, STIXGeneral, "Times New Roman"');
                if (!s.subscript && !s.superscript) {
                  seg.style('font-size', `${fontSize * 1.1}px`);
                }
              }

              if (s.highlight || s.keyboard) {
                const seg = d3.select(this);
                if (s.highlight) {
                  seg
                    .style('fill', RendererColors.inline.highlightText)
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
                  const isColored = d.depth > 0 && d.color;
                  if (isColored && !thisRenderer.isDarkMode) {
                    seg.style('fill', ColorManager.getLinkColor(nodeFill));
                  } else if (d.depth === 0 && !thisRenderer.isDarkMode) {
                    seg.style('fill', '#e2e8f0');
                  } else {
                    seg.style(
                      'fill',
                      thisRenderer.isDarkMode
                        ? RendererColors.inline.kbdDark
                        : RendererColors.inline.kbdLight
                    );
                  }
                }
              }
            })
            .style('cursor', (s) => (s.link || s.details ? 'pointer' : 'default'))
            .on('click', (event, s) => {
              if (s.link) {
                event.stopPropagation();
                thisRenderer.nodeLinkClickCallback(s.link);
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
      });

    update.each(function (d) {
      const image = d.metadata.image;
      const container = d3.select(this).select<SVGGElement>('g.image-container');

      if (!image) {
        container.attr('opacity', 0);
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
          const parentPos = d.parent ? positions.get(d.parent.id) || { x: 0, y: 0 } : null;
          if (!parentPos) rectX = -width / 2;
          else if (pos.x < parentPos.x) rectX = -width;
          else rectX = 0;
        }

        container
          .attr('opacity', 1)
          .attr(
            'transform',
            `translate(${rectX + (width - imgW) / 2}, ${-height / 2 + thisRenderer.config.padding.y})`
          );

        const imgEl = container.select<SVGImageElement>('image');
        const imgNode = imgEl.node();
        const targetHref = (image as any).failed ? '' : image.url;

        // Phase 4 sync: Only set href if URL changed
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

        const errorPlaceholder = container
          .selectAll('g.error-placeholder')
          .data((image as any).failed ? [image] : []);
        errorPlaceholder.exit().remove();
        const errEnter = errorPlaceholder.enter().append('g').attr('class', 'error-placeholder');
        errEnter
          .append('rect')
          .attr('width', imgW)
          .attr('height', imgH)
          .attr('rx', 4)
          .attr('fill', thisRenderer.isDarkMode ? '#450a0a' : '#fef2f2')
          .attr('stroke', '#ef4444')
          .attr('stroke-width', 1);
        errEnter
          .append('text')
          .attr('x', imgW / 2)
          .attr('y', imgH / 2)
          .attr('text-anchor', 'middle')
          .attr('dominant-baseline', 'central')
          .attr('fill', '#ef4444')
          .style('font-size', '10px')
          .style('font-weight', 'bold')
          .text('404');
      }

      thisRenderer.renderNoteBlocks(d3.select(this) as any, d, positions);
    });

    update
      .select('clipPath rect')
      .attr('width', (d) => (d as any).metadata?.width || 0)
      .attr('height', (d) => (d as any).metadata?.height || 0)
      .attr('x', function (d) {
        const width = (d as any).metadata?.width || 0;
        if (thisRenderer.isVertical || d.depth === 0) return -width / 2;
        const pos = positions.get(d.id) || { x: 0, y: 0 };
        const parentPos = d.parent ? positions.get(d.parent.id) || { x: 0, y: 0 } : null;
        if (!parentPos || pos.x < parentPos.x) return -width;
        return 0;
      })
      .attr('y', (d) => -((d as any).metadata?.height || 0) / 2);

    update
      .select('rect.node-bg')
      .attr('rx', this.config.borderRadius)
      .attr('ry', this.config.borderRadius)
      .attr('width', (d) => (d as any).metadata?.width || 0)
      .attr('height', (d) => (d as any).metadata?.height || 0)
      .attr('x', (d) => {
        const width = (d as any).metadata?.width || 0;
        if (thisRenderer.isVertical) return -width / 2;

        const pos = positions.get(d.id) || { x: 0, y: 0 };
        const parentPos = d.parent ? positions.get(d.parent.id) || { x: 0, y: 0 } : null;

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
          return (
            ColorManager.getThemeShade(d.color, true) || RendererColors.node.branchFallbackDark
          );
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
      .attr('stroke-width', (d) =>
        this.selectedNodeId === d.id || this.highlightIds.has(d.id) ? 3 : 1.5
      );

    const indicator = update
      .selectAll<SVGCircleElement, TreeNode>('circle.collapsible-indicator')
      .data(
        (d) => (d.children.length > 0 ? [d] : []),
        (d) => d.id
      );

    indicator.exit().remove();

    indicator
      .enter()
      .append('circle')
      .attr('class', 'collapsible-indicator')
      .style('outline', 'none')
      .attr('r', 6)
      .attr('fill', 'none')
      .attr('stroke-width', 2)
      .attr('role', 'button')
      .attr('aria-label', (d) => (d.collapsed ? 'Expand node' : 'Collapse node'))
      .attr('tabindex', -1)
      .on('mouseover', function () {
        d3.select(this).attr('r', 8);
      })
      .on('mouseout', function () {
        d3.select(this).attr('r', 6);
      })
      .on('click', (event, d) => {
        event.stopPropagation();
        this.toggleNode(d);
      })
      .merge(indicator as any)
      .attr('cx', (d) => {
        if (thisRenderer.isVertical) return 0;
        const width = (d as any).metadata?.width || 0;
        const pos = positions.get(d.id) || { x: 0, y: 0 };
        const parentPos = d.parent ? positions.get(d.parent.id) || { x: 0, y: 0 } : null;
        if (!parentPos) {
          const hasRightChild = d.children.some((child) => {
            const childPos = positions.get(child.id);
            return childPos && childPos.x > pos.x;
          });
          if (hasRightChild) return width / 2;

          const hasLeftChild = d.children.some((child) => {
            const childPos = positions.get(child.id);
            return childPos && childPos.x < pos.x;
          });
          if (hasLeftChild) return -width / 2;

          return width / 2;
        }
        if (pos.x < parentPos.x) return -width;
        return width;
      })
      .attr('cy', (d) => {
        if (!thisRenderer.isVertical) return 0;
        const height = (d as any).metadata?.height || 0;
        const pos = positions.get(d.id) || { x: 0, y: 0 };

        const firstChild = d.children[0];
        const childPos = firstChild ? positions.get(firstChild.id) : null;
        if (childPos && childPos.y < pos.y) {
          return -height / 2;
        }
        return height / 2;
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
          return (
            ColorManager.getThemeShade(d.color, true) || RendererColors.node.branchFallbackDark
          );
        }
        if (d.collapsed) return 'white';
        if (d.depth === 0) return RendererColors.node.rootFillLight;
        return d.color || RendererColors.node.branchFallbackLight;
      });
  }

  private renderNoteBlocks(
    nodeGroup: d3.Selection<SVGGElement, TreeNode, SVGGElement, unknown>,
    d: TreeNode,
    positions: Map<string, Position>
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

    let rectX: number;
    if (this.isVertical) {
      rectX = -width / 2;
    } else {
      const pos = positions.get(d.id) || { x: 0, y: 0 };
      const parentPos = d.parent ? positions.get(d.parent.id) || { x: 0, y: 0 } : null;
      if (!parentPos) rectX = -width / 2;
      else if (pos.x < parentPos.x) rectX = -width;
      else rectX = 0;
    }

    const textFontSize = this.getFontSize(depth);
    const textLineHeight = this.getLineHeight(depth);
    let displayContent = (d as any).metadata?.displayContent ?? d.content ?? '';
    displayContent = displayContent
      .replace(/\[(codeblock|quoteblock|image|tableblock):\d+\]/gi, '')
      .trim();
    const displayLines = thisRenderer.wrapText(
      displayContent,
      depth === 0 ? LAYOUT_CONFIG.ROOT_MAX_WIDTH - this.config.padding.x * 2 : Infinity,
      textFontSize,
      this.getFontWeight(depth)
    );
    let totalTextHeight = 0;
    displayLines.forEach((line) => {
      const lineSegments = parseMarkdownLine(line);
      const maxLineH = lineSegments.reduce((max, seg) => {
        const h = seg.heading ? getHeadingLineHeight(seg.heading) : textLineHeight;
        return Math.max(max, h);
      }, 0);
      totalTextHeight += maxLineH || textLineHeight;
    });
    const textBlockH = totalTextHeight;
    const hasText = displayLines.length > 0;

    const rectTop = -height / 2;
    let blockY = rectTop + this.config.padding.y + textBlockH;

    if (hasText || d.metadata.image) {
      blockY += NB.PILL_GAP;
    }

    if (d.metadata.image) {
      blockY += (d.metadata.image.thumbHeight || 0) + LAYOUT_CONFIG.IMAGE.PADDING;
    }

    let blocksGroup = nodeGroup.select<SVGGElement>('g.note-blocks');
    if (blocksGroup.empty()) {
      blocksGroup = nodeGroup
        .append('g')
        .attr('class', 'note-blocks')
        .attr('clip-path', `url(#clip-${d.id})`);
    } else {
      blocksGroup.attr('clip-path', `url(#clip-${d.id})`);
    }

    const allBlocks = [
      ...codeBlocks.map((b, i) => ({ ref: b, type: 'code' as const, id: `code-${i}` })),
      ...quoteBlocks.map((b, i) => ({ ref: b, type: 'quote' as const, id: `quote-${i}` })),
      ...tableBlocks.map((b, i) => ({ ref: b, type: 'table' as const, id: `table-${i}` })),
    ];

    const blockSelections = blocksGroup
      .selectAll<SVGGElement, any>('g.note-block')
      .data(allBlocks, (d) => d.id);

    blockSelections.exit().remove();

    const enter = blockSelections
      .enter()
      .append('g')
      .attr('class', (b) => `note-block note-block-${b.type}`)
      .attr('opacity', 1);

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

    const update = enter.merge(blockSelections as any);

    // Calculate positions for all blocks, then render
    let currentY = blockY;
    const blockPositions = new Map<string, number>();

    allBlocks.forEach((block) => {
      blockPositions.set(block.id, currentY);
      const isExpanded = block.ref.expanded;
      const type = block.type;
      if (!isExpanded) {
        currentY += NB.PILL_HEIGHT + NB.PILL_GAP;
      } else if (type === 'table') {
        const colWidths = block.ref.colWidths || [];
        let totalTableHeight = NB.TABLE_HEADER_HEIGHT + NB.TABLE_V_PADDING * 2;
        if (block.ref.headers?.length) {
          let maxLines = 1;
          block.ref.headers.forEach((h: string, hi: number) => {
            const cw = colWidths[hi] || innerW / (block.ref.headers?.length || 1);
            const lines = (h || '')
              .replace(/<br\s*\/?>/gi, '\n')
              .replace(/\\n/g, '\n')
              .replace(/\\t/g, '    ')
              .replace(/\t/g, '    ')
              .split(/\r?\n/);
            maxLines = Math.max(maxLines, lines.length);
          });
          totalTableHeight += NB.TABLE_HEADER_HEIGHT + (maxLines - 1) * NB.TABLE_LINE_HEIGHT;
        }
        block.ref.rows?.forEach((row: string[]) => {
          let maxLines = 1;
          row.forEach((cell, ci) => {
            const cw = colWidths[ci] || innerW / (row.length || 1);
            const lines = (cell || '')
              .replace(/<br\s*\/?>/gi, '\n')
              .replace(/\\n/g, '\n')
              .replace(/\\t/g, '    ')
              .replace(/\t/g, '    ')
              .split(/\r?\n/);
            maxLines = Math.max(maxLines, lines.length);
          });
          totalTableHeight += NB.TABLE_ROW_HEIGHT + (maxLines - 1) * NB.TABLE_LINE_HEIGHT;
        });
        currentY += totalTableHeight + NB.PILL_GAP;
      } else {
        const lineH = type === 'code' ? NB.CODE_LINE_HEIGHT : NB.QUOTE_LINE_HEIGHT;
        const blockFontFamily =
          type === 'code' ? NB.MONO_FONT.replace(/'/g, '') : 'Inter, sans-serif';
        const wrapW = NB.MAX_WIDTH - (type === 'code' ? 16 : 24);
        const rawContent = type === 'code' ? block.ref.code : block.ref.text;
        const contentLines = (rawContent || '')
          .split(/\r?\n/)
          .flatMap((line: string) =>
            thisRenderer.wrapText(line, wrapW, lineH, 'normal', blockFontFamily, type === 'code')
          );
        const vPad = type === 'code' ? NB.CODE_V_PADDING : NB.QUOTE_V_PADDING;
        const headerH = NB.CODE_HEADER_HEIGHT;
        currentY += headerH + vPad + contentLines.length * lineH + vPad + NB.PILL_GAP;
      }
    });

    // Set transform for all blocks
    update.attr('transform', (b) => {
      const y = blockPositions.get(b.id) || blockY;
      return `translate(${rectX + thisRenderer.config.padding.x}, ${y})`;
    });

    update.each(function (block) {
      const blockGroup = d3.select(this);
      const type = block.type;
      const isExpanded = block.ref.expanded;
      const rawContent =
        (type === 'code' ? block.ref.code : type === 'quote' ? block.ref.text : '') || '';
      const lineH =
        type === 'code'
          ? NB.CODE_LINE_HEIGHT
          : type === 'quote'
            ? NB.QUOTE_LINE_HEIGHT
            : NB.TABLE_LINE_HEIGHT;
      const blockFontFamily =
        type === 'code' ? NB.MONO_FONT.replace(/'/g, '') : 'Inter, sans-serif';
      const contentLines = rawContent
        .split(/\r?\n/)
        .flatMap((line: string) =>
          thisRenderer.wrapText(
            line,
            NB.MAX_WIDTH - (type === 'code' ? 16 : 24),
            lineH,
            'normal',
            blockFontFamily,
            type === 'code'
          )
        );
      const vPad =
        type === 'code'
          ? NB.CODE_V_PADDING
          : type === 'quote'
            ? NB.QUOTE_V_PADDING
            : NB.TABLE_V_PADDING;
      const headerH = type === 'table' ? NB.TABLE_HEADER_HEIGHT : NB.CODE_HEADER_HEIGHT;

      let expandedH = NB.PILL_HEIGHT;
      if (isExpanded) {
        if (type === 'table') {
          let totalTableHeight = NB.TABLE_HEADER_HEIGHT + NB.TABLE_V_PADDING * 2;
          const colWidths = block.ref.colWidths || [];
          const getCellLines = (txt: string, maxWidth?: number) => {
            const rawLines = (txt || '')
              .replace(/<br\s*\/?>/gi, '\n')
              .replace(/\\n/g, '\n')
              .replace(/\\t/g, '    ')
              .replace(/\t/g, '    ')
              .split(/\r?\n/);
            if (maxWidth === undefined || maxWidth <= 0) return rawLines;
            return rawLines.flatMap((line: string) =>
              thisRenderer.wrapText(
                line,
                maxWidth,
                NB.TABLE_LINE_HEIGHT,
                '400',
                'Inter, sans-serif'
              )
            );
          };

          if (block.ref.headers?.length) {
            let maxLinesInHeader = 1;
            block.ref.headers.forEach((h: string, i: number) => {
              const colW = colWidths[i] || innerW / (block.ref.headers?.length || 1);
              maxLinesInHeader = Math.max(
                maxLinesInHeader,
                getCellLines(h, Math.max(500, colW - 40)).length
              );
            });
            totalTableHeight +=
              NB.TABLE_HEADER_HEIGHT + (maxLinesInHeader - 1) * NB.TABLE_LINE_HEIGHT;
          }

          block.ref.rows?.forEach((row: string[]) => {
            let maxLinesInRow = 1;
            row.forEach((cell, i) => {
              const colW = colWidths[i] || innerW / (row.length || 1);
              maxLinesInRow = Math.max(
                maxLinesInRow,
                getCellLines(cell, Math.max(500, colW - 40)).length
              );
            });
            totalTableHeight += NB.TABLE_ROW_HEIGHT + (maxLinesInRow - 1) * NB.TABLE_LINE_HEIGHT;
          });
          expandedH = totalTableHeight + 12;
        } else {
          expandedH = headerH + vPad + contentLines.length * lineH + vPad;
        }
      }

      let bgRect = blockGroup.select<SVGRectElement>('rect.block-bg');
      if (bgRect.empty()) {
        bgRect = blockGroup.append('rect').attr('class', 'block-bg').attr('rx', 4).attr('ry', 4);
      }
      bgRect
        .attr('width', innerW)
        .attr('height', expandedH)
        .attr('fill', isExpanded ? expandedBg : pillBg)
        .style('cursor', 'pointer')
        .on('pointerdown', (e) => e.stopPropagation())
        .on('click', (event: any) => {
          event.stopPropagation();
          block.ref.expanded = !isExpanded;
          thisRenderer.nodeUpdateCallback(d.id);
        });

      const pillContent = blockGroup
        .selectAll<SVGGElement, any>('g.pill-content')
        .data(!isExpanded ? [block] : []);

      pillContent.exit().remove();

      const pillEnter = pillContent
        .enter()
        .append('g')
        .attr('class', 'pill-content')
        .attr('opacity', 1);

      pillEnter
        .append('text')
        .attr('class', 'caret')
        .attr('x', 10)
        .attr('y', NB.PILL_HEIGHT / 2)
        .attr('font-size', '9px')
        .attr('fill', pillText)
        .attr('dominant-baseline', 'central')
        .style('pointer-events', 'none')
        .text('▶');

      pillEnter
        .append('text')
        .attr('class', 'label')
        .attr('x', 26)
        .attr('y', NB.PILL_HEIGHT / 2)
        .attr('font-size', '10px')
        .attr('dominant-baseline', 'central')
        .style('pointer-events', 'none');

      pillEnter
        .append('text')
        .attr('class', 'count')
        .attr('x', innerW - 8)
        .attr('y', NB.PILL_HEIGHT / 2)
        .attr('text-anchor', 'end')
        .attr('font-size', '9px')
        .attr('fill', pillText)
        .attr('dominant-baseline', 'central')
        .style('pointer-events', 'none');

      const pillUpdate = pillEnter.merge(pillContent as any);

      pillUpdate
        .select('text.label')
        .attr('font-family', type === 'code' ? NB.MONO_FONT : 'Inter, sans-serif')
        .attr('font-style', type === 'quote' ? 'italic' : 'normal')
        .attr(
          'fill',
          type === 'table'
            ? RendererColors.noteBlock.tableAccent
            : type === 'code'
              ? codeLang
              : quoteAccent
        )
        .text(type === 'code' ? block.ref.language || 'code' : type);

      pillUpdate
        .select('text.count')
        .attr('x', innerW - 8)
        .text(
          type === 'table'
            ? `${block.ref.rows?.length || 0} row${(block.ref.rows?.length || 0) !== 1 ? 's' : ''}`
            : `${(type === 'code' ? block.ref.code : block.ref.text || '').split('\n').length} line${(type === 'code' ? block.ref.code : block.ref.text || '').split('\n').length !== 1 ? 's' : ''}`
        );

      const header = blockGroup
        .selectAll<SVGGElement, any>('g.block-header')
        .data(isExpanded ? [block] : []);

      header.exit().remove();

      const headerEnter = header
        .enter()
        .append('g')
        .attr('class', 'block-header')
        .attr('opacity', 1);

      headerEnter.append('path').attr('class', 'header-bg');
      headerEnter
        .append('text')
        .attr('class', 'caret')
        .attr('x', 10)
        .attr('y', headerH / 2)
        .attr('font-size', '9px')
        .attr('fill', pillText)
        .attr('dominant-baseline', 'central')
        .style('pointer-events', 'none')
        .text('▼');
      headerEnter
        .append('text')
        .attr('class', 'label')
        .attr('x', 26)
        .attr('y', headerH / 2)
        .attr('font-size', '10px')
        .attr('dominant-baseline', 'central')
        .style('pointer-events', 'none');

      const headerUpdate = headerEnter.merge(header as any);

      const headerPath = `M 0 4 Q 0 0 4 0 L ${innerW - 4} 0 Q ${innerW} 0 ${innerW} 4 L ${innerW} ${headerH} L 0 ${headerH} Z`;
      headerUpdate
        .select('path.header-bg')
        .attr('d', headerPath)
        .attr(
          'fill',
          isDark ? RendererColors.noteBlock.headerBgDark : RendererColors.noteBlock.headerBgLight
        )
        .style('cursor', 'pointer')
        .on('click', (event) => {
          event.stopPropagation();
          block.ref.expanded = false;
          thisRenderer.nodeUpdateCallback(d.id);
        });

      headerUpdate
        .select('text.label')
        .attr('font-family', type === 'code' ? NB.MONO_FONT : 'Inter, sans-serif')
        .attr('font-style', type === 'quote' ? 'italic' : 'normal')
        .attr(
          'fill',
          type === 'table'
            ? RendererColors.noteBlock.tableAccent
            : type === 'code'
              ? codeLang
              : quoteAccent
        )
        .text(type === 'code' ? block.ref.language || 'code' : type);

      const content = blockGroup
        .selectAll<SVGTextElement, any>('text.block-content')
        .data(isExpanded && type !== 'table' ? [block] : []);

      content.exit().remove();

      const contentEnter = content
        .enter()
        .append('text')
        .attr('class', 'block-content')
        .attr('opacity', 1)
        .attr('x', 0)
        .attr('y', 0);

      const contentUpdate = contentEnter.merge(content as any);

      const blockFontStyle = type === 'quote' ? 'italic' : 'normal';

      contentUpdate
        .attr('x', 0)
        .attr('y', 0)
        .attr('font-family', type === 'code' ? NB.MONO_FONT : 'Inter, sans-serif')
        .attr('font-size', `${lineH}px`)
        .attr('font-style', blockFontStyle)
        .attr(
          'fill',
          type === 'code'
            ? isDark
              ? RendererColors.noteBlock.codeTextDark
              : RendererColors.noteBlock.codeTextLight
            : quoteTextC
        )
        .style('white-space', 'pre');

      const tspans = contentUpdate.selectAll<SVGTSpanElement, string>('tspan').data(contentLines);

      tspans
        .join('tspan')
        .attr('x', type === 'code' ? 8 : NB.QUOTE_BORDER_WIDTH + 8)
        .attr('dy', (line, i) => (i === 0 ? headerH + vPad + lineH / 2 : lineH))
        .attr('dominant-baseline', 'central')
        .text((line) => {
          if (line.length === 0) return '\u00A0';
          return line;
        });

      const tableContent = blockGroup
        .selectAll<SVGGElement, any>('g.table-content')
        .data(isExpanded && type === 'table' ? [block] : []);

      tableContent.exit().remove();
      const tableEnter = tableContent
        .enter()
        .append('g')
        .attr('class', 'table-content')
        .attr('opacity', 1);

      const tableUpdate = tableEnter.merge(tableContent as any);

      tableUpdate.each(function (b) {
        const g = d3.select(this);

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
        const colCount = Math.max(headers.length, ...rows.map((r) => r.length));

        let finalColWidths: number[];
        const measuredColWidths = b.ref.colWidths;
        if (measuredColWidths && measuredColWidths.length >= colCount) {
          const totalMeasured = measuredColWidths
            .slice(0, colCount)
            .reduce((s: number, w: number) => s + w, 0);
          const scale = innerW / Math.max(totalMeasured, 1);
          finalColWidths = measuredColWidths.slice(0, colCount).map((w: number) => w * scale);
        } else {
          finalColWidths = new Array(colCount).fill(innerW / colCount);
        }
        
        // Ensure finalColWidths accounts for increased padding
        finalColWidths = finalColWidths.map(w => Math.max(w, 60));

        let runningY = headerH + NB.TABLE_V_PADDING;
        const startY = runningY;

        const drawRow = (data: string[], isHeader: boolean) => {
          let currentX = 0;

          const getCellLines = (txt: string, maxWidth?: number) => {
            const rawLines = (txt || '')
              .replace(/<br\s*\/?>/gi, '\n')
              .replace(/\\n/g, '\n')
              .replace(/\\t/g, '    ')
              .replace(/\t/g, '    ')
              .split(/\r?\n/);
            if (maxWidth === undefined || maxWidth <= 0) return rawLines;
            return rawLines.flatMap((line: string) =>
              thisRenderer.wrapText(
                line,
                maxWidth,
                NB.TABLE_LINE_HEIGHT,
                '400',
                'Inter, sans-serif'
              )
            );
          };

          let maxLinesInRow = 1;
          data.forEach((cell, i) => {
            const colW = finalColWidths[i];
            maxLinesInRow = Math.max(
              maxLinesInRow,
              getCellLines(cell, Math.max(500, colW - 60)).length
            );
          });

          const baseHeight = isHeader ? NB.TABLE_HEADER_HEIGHT : NB.TABLE_ROW_HEIGHT;
          const rowH = baseHeight + (maxLinesInRow - 1) * NB.TABLE_LINE_HEIGHT;

          data.forEach((cell, i) => {
            const colW = finalColWidths[i];
            const align = alignments[i] || 'left';
            const lines = getCellLines(cell, Math.max(500, colW - 60));
            const numLines = lines.length;

            lines.forEach((line, lineIdx) => {
              let textX = currentX + 30;
              if (align === 'center') textX = currentX + colW / 2;
              else if (align === 'right') textX = currentX + colW - 30;

              const cellStartY = runningY + (rowH - (numLines - 1) * NB.TABLE_LINE_HEIGHT) / 2;
              const lineY = cellStartY + lineIdx * NB.TABLE_LINE_HEIGHT;

              const textElement = g
                .append('text')
                .attr('x', textX)
                .attr('y', lineY)
                .attr('font-size', `${NB.TABLE_LINE_HEIGHT}px`)
                .attr(
                  'fill',
                  isHeader
                    ? isDark
                      ? RendererColors.noteBlock.tableHeaderDark
                      : RendererColors.noteBlock.tableHeaderLight
                    : isDark
                      ? RendererColors.noteBlock.tableCellDark
                      : RendererColors.noteBlock.tableCellLight
                )
                .attr(
                  'text-anchor',
                  align === 'center' ? 'middle' : align === 'right' ? 'end' : 'start'
                )
                .attr('dominant-baseline', 'central');

              const segments = parseMarkdownLine(line);
              segments.forEach((seg) => {
                const tspan = textElement
                  .append('tspan')
                  .text(seg.text)
                  .style('font-weight', isHeader || seg.bold ? 'bold' : 'normal')
                  .style('font-style', seg.italic ? 'italic' : 'normal')
                  .style(
                    'text-decoration',
                    seg.strikethrough
                      ? 'line-through'
                      : seg.underline || seg.link
                        ? 'underline'
                        : 'none'
                  )
                  .style(
                    'fill',
                    seg.link
                      ? ColorManager.getLinkColor(nodeFill)
                      : seg.highlight
                        ? RendererColors.inline.highlightText
                        : ''
                  )
                  .attr('baseline-shift', seg.superscript ? 'super' : (seg.subscript ? 'sub' : '0'))
                  .attr('font-size', (seg.superscript || seg.subscript) ? `${NB.TABLE_LINE_HEIGHT * 0.75}px` : `${NB.TABLE_LINE_HEIGHT}px`)
                  .each(function () {
                    if (seg.highlight) {
                      d3.select(this)
                        .style('stroke', RendererColors.inline.highlightFill)
                        .style('stroke-width', '2.5px')
                        .style('stroke-opacity', 0.5)
                        .style('stroke-linecap', 'round')
                        .style('stroke-linejoin', 'round')
                        .style('paint-order', 'stroke fill');
                    }
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

            currentX += colW;
          });

          if (isHeader) {
            g.append('line')
              .attr('x1', 0)
              .attr('y1', runningY + rowH)
              .attr('x2', innerW)
              .attr('y2', runningY + rowH)
              .attr(
                'stroke',
                isDark
                  ? RendererColors.noteBlock.tableDividerDark
                  : RendererColors.noteBlock.tableDividerLight
              )
              .attr('stroke-width', 1.5);
          }

          runningY += rowH;
        };

        if (headers.length > 0) drawRow(headers, true);
        rows.forEach((r) => drawRow(r, false));

        let runningX = 0;
        finalColWidths.forEach((colW, i) => {
          if (i === finalColWidths.length - 1) return;
          runningX += colW;
          g.append('line')
            .attr('x1', runningX)
            .attr('y1', startY)
            .attr('x2', runningX)
            .attr('y2', runningY)
            .attr(
              'stroke',
              isDark
                ? RendererColors.noteBlock.tableDividerDark
                : RendererColors.noteBlock.tableDividerLight
            )
            .attr('stroke-width', 1)
            .style('stroke-dasharray', '2,2')
            .attr('opacity', 0.5);
        });
        
        const finalH = Math.max(NB.PILL_HEIGHT, runningY + NB.TABLE_V_PADDING) + 2;
        expandedH = finalH;
        g.attr('data-last-height', expandedH);
      });
    });
  }

  /**
   * Toggle node collapse state
   */
  public toggleNode(node: TreeNode): void {
    this.nodeToggleCallback(node.id);
  }

  /**
   * Render curved links — instant, no animations
   */
  private renderLinks(links: any[], positions: Map<string, Position>): void {
    if (!this.g) return;
    const layer = this.g.select('g.links-layer');

    const linkPaths = layer
      .selectAll<SVGPathElement, any>('path.link')
      .data(links, (d) => `${d.source.id}-${d.target.id}`);

    linkPaths.exit().remove();

    const enter = linkPaths
      .enter()
      .append('path')
      .attr('class', 'link')
      .attr('fill', 'none')
      .attr('stroke-width', 2);

    const update = enter.merge(linkPaths);

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

    update
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
    nodes.forEach((node) => {
      if (!node.collapsed) {
        node.children.forEach((child) => {
          links.push({ source: node, target: child });
        });
      }
    });
    return links;
  }
}
