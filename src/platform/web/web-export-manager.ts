/**
 * Feature: Web Export Manager
 * Purpose: Handles application of export logic for various formats (HTML, PNG, SVG)
 * Style: High-fidelity standalone experience using core app logic
 */

import { TreeNode } from '@/core/types';
import { imageDimensionStore } from '@/core/utils/image-store';

export class WebExportManager {
  // ── Font Loading ──────────────────────────────────────────────────

  private static _interFontDataUrl: string | null = null;
  private static _interFontPromise: Promise<string> | null = null;

  private async loadInterFontAsBase64(): Promise<string> {
    if (WebExportManager._interFontDataUrl) return WebExportManager._interFontDataUrl;
    if (WebExportManager._interFontPromise) return WebExportManager._interFontPromise;

    WebExportManager._interFontPromise = (async () => {
      try {
        const cssUrl = 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap';
        const cssResponse = await fetch(cssUrl);
        if (!cssResponse.ok) throw new Error('Failed to fetch Google Fonts CSS');
        let cssText = await cssResponse.text();

        const urlRegex = /url\(['"]?([^)]+\.woff2)['"]?\)/g;
        const fontUrls = new Set<string>();
        let match;
        while ((match = urlRegex.exec(cssText)) !== null) {
          fontUrls.add(match[1]);
        }

        for (const fontUrl of fontUrls) {
          const fontResponse = await fetch(fontUrl);
          if (!fontResponse.ok) continue;
          const blob = await fontResponse.blob();
          const base64 = await new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.readAsDataURL(blob);
          });
          cssText = cssText.replace(fontUrl, base64);
        }

        WebExportManager._interFontDataUrl = cssText;
        return WebExportManager._interFontDataUrl;
      } catch {
        WebExportManager._interFontDataUrl = '';
        return '';
      }
    })();

    return WebExportManager._interFontPromise;
  }

  // ── SVG Preparation ───────────────────────────────────────────────

  public async prepareSVG(svgElement: SVGSVGElement): Promise<SVGSVGElement> {
    const clone = svgElement.cloneNode(true) as SVGSVGElement;

    this.restoreHiddenNodes(clone);
    this.makeAllNodesVisible(clone);
    this.embedStylesAndFonts(clone);
    this.ensureTextAboveOverlays(clone);

    const bbox = await this.measureContentBoundingBox(clone);

    this.applyViewport(clone, bbox);
    this.repositionCollapsibleIndicators(clone);

    return clone;
  }

  private restoreHiddenNodes(clone: SVGSVGElement): void {
    // Only restore visibility on collapsed node groups, NOT on tspan/text elements
    // which intentionally use visibility:hidden to hide --- divider text.
    clone.querySelectorAll<SVGGElement>('g.node[style*="display: none"], g.node[style*="visibility: hidden"]').forEach((el) => {
      el.style.display = '';
      el.style.visibility = 'visible';
    });
  }

  private makeAllNodesVisible(clone: SVGSVGElement): void {
    clone.querySelectorAll('.node').forEach((el) => {
      if (el instanceof SVGElement) {
        el.setAttribute('opacity', '1');
        el.style.opacity = '1';
      }
    });
    // Ensure image containers are visible
    clone.querySelectorAll('g.image-container').forEach((el) => {
      if (el instanceof SVGGElement) {
        el.setAttribute('opacity', '1');
        el.style.opacity = '1';
      }
    });
    // Ensure actual image elements are visible
    clone.querySelectorAll('image').forEach((el) => {
      if (el instanceof SVGImageElement) {
        el.setAttribute('opacity', '1');
        el.style.opacity = '1';
      }
    });
  }

  private async embedStylesAndFonts(clone: SVGSVGElement): Promise<void> {
    const svgStyles = `
      .node text { pointer-events: none; user-select: none; }
      .collapsible-indicator { cursor: pointer; }
    `;

    const interFont = await this.loadInterFontAsBase64();
    const styleElement = document.createElementNS('http://www.w3.org/2000/svg', 'style');
    styleElement.textContent = `${interFont}\n${svgStyles}`;
    clone.prepend(styleElement);
  }

  private ensureTextAboveOverlays(clone: SVGSVGElement): void {
    clone.querySelectorAll('g.node').forEach((nodeGroup) => {
      const textEl = nodeGroup.querySelector(':scope > text');
      if (textEl) {
        nodeGroup.appendChild(textEl);
      }
    });
  }

  private async measureContentBoundingBox(clone: SVGSVGElement): Promise<DOMRect> {
    const container = this.mountOffScreen(clone);

    try {
      clone.setAttribute('width', '20000');
      clone.setAttribute('height', '20000');

      const mainG = clone.querySelector('.mindmap-content') || clone.querySelector('g');
      mainG?.removeAttribute('transform');

      clone.querySelectorAll('rect.canvas-bg').forEach((el) => el.remove());

      void container.offsetHeight;
      await document.fonts.ready;

      this.refitNodeRectsToText(clone);

      return this.computeNodeBBox(clone);
    } catch {
      return { x: 0, y: 0, width: 0, height: 0, top: 0, right: 0, bottom: 0, left: 0 } as DOMRect;
    } finally {
      document.body.removeChild(container);
    }
  }

  private mountOffScreen(clone: SVGSVGElement): HTMLDivElement {
    const container = document.createElement('div');
    container.style.cssText = 'position:absolute;left:-99999px;top:-99999px;width:20000px;height:20000px;overflow:visible;visibility:hidden;';
    container.appendChild(clone);
    document.body.appendChild(container);
    return container;
  }

  private refitNodeRectsToText(clone: SVGSVGElement): void {
    const PADDING_X = 9;

    clone.querySelectorAll<SVGGElement>('g.node').forEach((nodeGroup) => {
      const rect = nodeGroup.querySelector<SVGRectElement>('rect.node-bg');
      const text = nodeGroup.querySelector<SVGTextElement>('text');
      if (!rect) return;

      const rectWidth = parseFloat(rect.getAttribute('width') || '0');
      if (rectWidth <= 0) return;

      // Measure actual rendered text width
      let maxLineTextWidth = 0;
      if (text) {
        text.querySelectorAll<SVGTSpanElement>('tspan.line').forEach((lineTspan) => {
          // Skip hidden divider lines (--- *** ___)
          if (lineTspan.style.visibility === 'hidden') return;
          const segments = lineTspan.querySelectorAll<SVGTSpanElement>('tspan.segment');
          if (segments.length > 0) {
            let lineWidth = 0;
            segments.forEach((seg) => { lineWidth += seg.getComputedTextLength(); });
            if (lineWidth > maxLineTextWidth) maxLineTextWidth = lineWidth;
          } else {
            const w = lineTspan.getComputedTextLength();
            if (w > maxLineTextWidth) maxLineTextWidth = w;
          }
        });
      }

      // Also measure the image width so we never shrink the rect below it
      let imageWidth = 0;
      const imgEl = nodeGroup.querySelector<SVGImageElement>('g.image-container image');
      if (imgEl) {
        const iw = parseFloat(imgEl.getAttribute('width') || '0');
        if (iw > 0) imageWidth = iw + PADDING_X * 2;
      }

      // Required width = max(text, image). Never shrink below either.
      const requiredWidth = Math.max(maxLineTextWidth > 0 ? maxLineTextWidth + PADDING_X * 2 : 0, imageWidth, rectWidth);
      if (Math.abs(requiredWidth - rectWidth) < 1) return;

      rect.setAttribute('width', requiredWidth.toString());

      const rectX = parseFloat(rect.getAttribute('x') || '0');
      if (Math.abs(rectX + rectWidth) < 1) {
        rect.setAttribute('x', (-requiredWidth).toString());
      } else if (Math.abs(rectX + rectWidth / 2) < 1) {
        rect.setAttribute('x', (-requiredWidth / 2).toString());
      }

      const nodeId = nodeGroup.getAttribute('data-id');
      if (nodeId) {
        const clipRect = clone.querySelector<SVGRectElement>(`#clip-${nodeId} rect`);
        if (clipRect) {
          clipRect.setAttribute('width', requiredWidth.toString());
          const clipX = parseFloat(clipRect.getAttribute('x') || '0');
          if (Math.abs(clipX + rectWidth) < 1) {
            clipRect.setAttribute('x', (-requiredWidth).toString());
          } else if (Math.abs(clipX + rectWidth / 2) < 1) {
            clipRect.setAttribute('x', (-requiredWidth / 2).toString());
          }
        }
      }
    });
  }

  private computeNodeBBox(clone: SVGSVGElement): DOMRect {
    let minX = Infinity;
    let maxX = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;

    clone.querySelectorAll<SVGGElement>('g.node').forEach((node) => {
      const transform = node.getAttribute('transform') || '';
      const match = transform.match(/translate\(([^,]+)[,\s]+([^)]+)\)/);
      const cx = match ? parseFloat(match[1]) : 0;
      const cy = match ? parseFloat(match[2]) : 0;

      const rect = node.querySelector<SVGRectElement>('rect.node-bg');
      const w = rect ? parseFloat(rect.getAttribute('width') || '0') : 0;
      const h = rect ? parseFloat(rect.getAttribute('height') || '0') : 0;

      const rx = rect ? parseFloat(rect.getAttribute('x') || '0') : -w / 2;
      const ry = rect ? parseFloat(rect.getAttribute('y') || '0') : -h / 2;

      const left = cx + rx;
      const top = cy + ry;
      const right = left + w;
      const bottom = top + h;

      minX = Math.min(minX, left);
      maxX = Math.max(maxX, right);
      minY = Math.min(minY, top);
      maxY = Math.max(maxY, bottom);
    });

    if (!Number.isFinite(minX)) {
      return { x: 0, y: 0, width: 0, height: 0, top: 0, right: 0, bottom: 0, left: 0 } as DOMRect;
    }

    return {
      x: minX,
      y: minY,
      width: maxX - minX,
      height: maxY - minY,
      top: minY,
      right: maxX,
      bottom: maxY,
      left: minX,
    } as DOMRect;
  }

  private applyViewport(clone: SVGSVGElement, bbox: DOMRect): void {
    const padding = 100;
    clone.setAttribute('width', (bbox.width + padding * 2).toString());
    clone.setAttribute('height', (bbox.height + padding * 2).toString());
    clone.setAttribute(
      'viewBox',
      `${bbox.x - padding} ${bbox.y - padding} ${bbox.width + padding * 2} ${bbox.height + padding * 2}`
    );
    clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  }

  private repositionCollapsibleIndicators(clone: SVGSVGElement): void {
    clone.querySelectorAll('g.node').forEach((nodeGroup) => {
      const rect = nodeGroup.querySelector<SVGRectElement>('rect.node-bg');
      const indicator = nodeGroup.querySelector<SVGCircleElement>('circle.collapsible-indicator');
      if (!rect || !indicator) return;

      const rectWidth = parseFloat(rect.getAttribute('width') || '0');
      const rectX = parseFloat(rect.getAttribute('x') || '0');
      const icx = parseFloat(indicator.getAttribute('cx') || '0');
      const icy = parseFloat(indicator.getAttribute('cy') || '0');

      if (Math.abs(icx) > 0.1 || Math.abs(icy) > 0.1) {
        if (Math.abs(icx) > 0.1) {
          // Place circle AT the edge of the (possibly resized) rect — half in, half out (r=6 handles the split)
          if (Math.abs(rectX + rectWidth) < 1) {
            // Left-side node: left edge is at -rectWidth
            indicator.setAttribute('cx', (-rectWidth).toString());
          } else if (Math.abs(rectX + rectWidth / 2) < 1) {
            // Root/centered node: edges at ±rectWidth/2
            indicator.setAttribute('cx', (icx > 0 ? rectWidth / 2 : -rectWidth / 2).toString());
          } else {
            // Right-side node: right edge is at +rectWidth
            indicator.setAttribute('cx', rectWidth.toString());
          }
        } else if (Math.abs(icy) > 0.1) {
          const rectY = parseFloat(rect.getAttribute('y') || '0');
          const rectHeight = parseFloat(rect.getAttribute('height') || '0');
          // Place circle AT the top/bottom edge — half in, half out
          if (Math.abs(rectY + rectHeight) < 1) {
            indicator.setAttribute('cy', (-rectHeight).toString());
          } else if (Math.abs(rectY + rectHeight / 2) < 1) {
            indicator.setAttribute('cy', (icy > 0 ? rectHeight / 2 : -rectHeight / 2).toString());
          } else {
            indicator.setAttribute('cy', rectHeight.toString());
          }
        }
      }
    });
  }

  // ── Image Inlining ────────────────────────────────────────────────

  public async inlineSVGImages(clone: SVGSVGElement): Promise<void> {
    const images = clone.querySelectorAll('image');
    const tasks: Promise<void>[] = [];

    images.forEach((img) => {
      const href = img.getAttribute('href') || img.getAttribute('xlink:href');
      if (!href || href.startsWith('data:')) return;

      tasks.push(
        this.imageToDataURL(href).then((dataURL) => {
          if (dataURL) {
            img.setAttribute('href', dataURL);
            const xlinkHref = img.getAttributeNS('http://www.w3.org/1999/xlink', 'href');
            if (xlinkHref) {
              img.setAttributeNS('http://www.w3.org/1999/xlink', 'xlink:href', dataURL);
            }
          }
        })
      );
    });

    await Promise.all(tasks);
  }

  // ── PNG Export ────────────────────────────────────────────────────

  public async exportToPNG(
    svgElement: SVGSVGElement,
    background: 'transparent' | 'white' | 'dark'
  ): Promise<Blob> {
    const MAX_CANVAS_DIM = 16384;
    const MAX_CANVAS_AREA = MAX_CANVAS_DIM * MAX_CANVAS_DIM;
    const idealScale = 3.0;
    const padding = 100;

    const clone = this.prepareCloneForMeasurement(svgElement);
    const bbox = this.getContentBoundingBox(clone);

    if (bbox.width === 0 || bbox.height === 0) {
      throw new Error('Nothing to export — the mind map appears empty');
    }

    const { canvas, ctx, scaleFactor } = this.setupCanvas(bbox, padding, idealScale, MAX_CANVAS_DIM, MAX_CANVAS_AREA);

    await this.prepareCloneForRendering(clone, bbox, padding);

    const svgString = this.serializeSVG(clone);
    return this.renderSVGToCanvas(svgString, canvas, ctx, scaleFactor, background);
  }

  private prepareCloneForMeasurement(svgElement: SVGSVGElement): SVGSVGElement {
    const clone = svgElement.cloneNode(true) as SVGSVGElement;

    clone.querySelectorAll('[style*="display: none"], [style*="visibility: hidden"]').forEach((el) => {
      if (el instanceof SVGElement) {
        el.style.display = '';
        el.style.visibility = 'visible';
      }
    });

    return clone;
  }

  private getContentBoundingBox(clone: SVGSVGElement): DOMRect {
    const container = document.createElement('div');
    container.style.cssText = 'position:absolute;left:-99999px;top:-99999px;width:0;height:0;overflow:hidden;visibility:hidden;';
    container.appendChild(clone);
    document.body.appendChild(container);

    let bbox: DOMRect;
    try {
      const mainG = clone.querySelector('g');
      mainG?.removeAttribute('transform');
      bbox = clone.getBBox();
    } finally {
      document.body.removeChild(container);
    }

    return bbox;
  }

  private setupCanvas(
    bbox: DOMRect,
    padding: number,
    idealScale: number,
    maxDim: number,
    maxArea: number
  ): { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D | null; scaleFactor: number } {
    const contentWidth = bbox.width + padding * 2;
    const contentHeight = bbox.height + padding * 2;

    const maxScaleByDim = Math.min(maxDim / contentWidth, maxDim / contentHeight);
    const maxScaleByArea = Math.sqrt(maxArea / (contentWidth * contentHeight));
    const scaleFactor = Math.min(idealScale, maxScaleByDim, maxScaleByArea);

    const canvasWidth = Math.max(1, Math.round(contentWidth * scaleFactor));
    const canvasHeight = Math.max(1, Math.round(contentHeight * scaleFactor));

    const canvas = document.createElement('canvas');
    canvas.width = canvasWidth;
    canvas.height = canvasHeight;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
    }

    return { canvas, ctx, scaleFactor };
  }

  private async prepareCloneForRendering(
    clone: SVGSVGElement,
    bbox: DOMRect,
    padding: number
  ): Promise<void> {
    clone.querySelectorAll('path').forEach((p) => {
      p.setAttribute('fill', 'none');
      if (p instanceof SVGPathElement) {
        p.style.fill = 'none';
      }
    });

    clone.querySelectorAll('rect').forEach((r) => {
      r.setAttribute('stroke', 'none');
      r.setAttribute('stroke-width', '0');
      if (r instanceof SVGRectElement) {
        r.style.stroke = 'none';
        r.style.strokeWidth = '0';
      }
    });

    await this.inlineSVGImages(clone);
    this.embedDocumentStyles(clone);

    const cloneG = clone.querySelector('g');
    cloneG?.setAttribute('transform', `translate(${-bbox.x + padding}, ${-bbox.y + padding})`);
    clone.setAttribute('width', (bbox.width + padding * 2).toString());
    clone.setAttribute('height', (bbox.height + padding * 2).toString());
    clone.removeAttribute('viewBox');
    clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  }

  private embedDocumentStyles(clone: SVGSVGElement): void {
    const styles = Array.from(document.styleSheets)
      .map((sheet) => {
        try {
          return Array.from(sheet.cssRules)
            .map((r) => r.cssText)
            .join('');
        } catch {
          return '';
        }
      })
      .join('\n');

    const styleEl = document.createElementNS('http://www.w3.org/2000/svg', 'style');
    styleEl.textContent = `
      @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
      ${styles}
    `;
    clone.prepend(styleEl);
  }

  private serializeSVG(clone: SVGSVGElement): string {
    return new XMLSerializer().serializeToString(clone).replace(/&nbsp;/g, '&#160;');
  }

  private renderSVGToCanvas(
    svgString: string,
    canvas: HTMLCanvasElement,
    ctx: CanvasRenderingContext2D | null,
    scaleFactor: number,
    background: 'transparent' | 'white' | 'dark'
  ): Promise<Blob> {
    const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
    const svgUrl = URL.createObjectURL(svgBlob);

    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      const timeoutMs = 30000;
      let timedOut = false;

      const timer = setTimeout(() => {
        timedOut = true;
        URL.revokeObjectURL(svgUrl);
        reject(new Error(`PNG export timed out after ${timeoutMs / 1000}s — map may be too large`));
      }, timeoutMs);

      img.onload = () => {
        if (timedOut) return;
        clearTimeout(timer);
        URL.revokeObjectURL(svgUrl);

        if (!ctx) return reject(new Error('Canvas context unavailable'));

        if (background !== 'transparent') {
          ctx.fillStyle = background === 'dark' ? '#1e1e1e' : '#ffffff';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
        }

        ctx.save();
        ctx.scale(scaleFactor, scaleFactor);
        ctx.drawImage(img, 0, 0);
        ctx.restore();

        canvas.toBlob((blob) => {
          if (!blob || blob.size === 0) {
            return reject(new Error('PNG export produced an empty file — map may be too large for browser canvas'));
          }
          resolve(blob);
        }, 'image/png', 1.0);
      };

      img.onerror = () => {
        if (timedOut) return;
        clearTimeout(timer);
        URL.revokeObjectURL(svgUrl);
        this.renderFallback(svgString, canvas, ctx, scaleFactor, background, resolve, reject);
      };

      img.src = svgUrl;
    });
  }

  private renderFallback(
    svgString: string,
    canvas: HTMLCanvasElement,
    ctx: CanvasRenderingContext2D | null,
    scaleFactor: number,
    background: 'transparent' | 'white' | 'dark',
    resolve: (blob: Blob) => void,
    reject: (error: Error) => void
  ): void {
    const svgLen = svgString.length;
    if (svgLen > 2_000_000) {
      return reject(
        new Error(
          `Map is too large to export as PNG (${svgLen} chars). Try exporting fewer nodes or use SVG format.`
        )
      );
    }

    const unicodeSvg = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svgString);
    const fallbackImg = new Image();
    const timeoutMs = 30000;

    const fbTimer = setTimeout(() => {
      reject(new Error('PNG export fallback timed out — map may be too large'));
    }, timeoutMs);

    fallbackImg.onload = () => {
      clearTimeout(fbTimer);
      if (!ctx) return reject(new Error('Canvas context unavailable'));

      if (background !== 'transparent') {
        ctx.fillStyle = background === 'dark' ? '#1e1e1e' : '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }

      ctx.save();
      ctx.scale(scaleFactor, scaleFactor);
      ctx.drawImage(fallbackImg, 0, 0);
      ctx.restore();

      canvas.toBlob((blob) => {
        if (!blob || blob.size === 0) {
          return reject(new Error('PNG export fallback produced an empty file'));
        }
        resolve(blob);
      }, 'image/png', 1.0);
    };

    fallbackImg.onerror = () => {
      clearTimeout(fbTimer);
      reject(new Error('PNG export failed to render — map may be too complex'));
    };

    fallbackImg.src = unicodeSvg;
  }

  // ── HTML Export ───────────────────────────────────────────────────

  public async exportToHTML(
    root: TreeNode,
    title: string,
    isDarkMode: boolean = false,
    layoutDirection: string = 'two-sided'
  ): Promise<string> {
    const exportRoot = this.collapseToDepth(root, 1);
    await this.waitForImageDimensions(exportRoot);
    await this.inlineTreeImages(exportRoot);
    const jsonTree = JSON.stringify(this.stripCircular(exportRoot));
    const initialTheme = isDarkMode ? 'dark' : 'light';
    const escapedLayoutDir = layoutDirection || 'two-sided';

    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>${title} | Inklink Interactive</title>
    <script src="https://d3js.org/d3.v7.min.js"><\/script>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
    <style>
        * { box-sizing: border-box; }
        body, html { margin: 0; padding: 0; width: 100%; height: 100%; overflow: hidden; font-family: 'Inter', sans-serif; }
        body.light { background: #f8fafc; color: #0f172a; }
        body.dark { background: #1e1e1e; color: #f1f5f9; }
        #canvas { width: 100%; height: 100%; cursor: grab; touch-action: none; outline: none; }
        #canvas:active { cursor: grabbing; }
        .mindmap-content { will-change: transform; }
        svg { outline: none; }
        svg:focus { outline: none; }

        .node text { pointer-events: none; user-select: none; }
        .node rect { cursor: pointer; stroke: none !important; stroke-width: 0 !important; }
        .link { fill: none; stroke-opacity: 0.55; stroke-width: 2; }
        .collapsible-indicator { cursor: pointer; transition: r 0.15s; }

        .nav-container {
            position: fixed; bottom: 32px; left: 50%; transform: translateX(-50%);
            display: flex; align-items: center; gap: 12px; padding: 10px 16px;
            background: #fff; border: 1px solid #e2e8f0; border-radius: 12px;
            box-shadow: 0 10px 25px -5px rgba(0,0,0,0.1); z-index: 1000;
        }
        body.dark .nav-container { background: #2d2d2d; border-color: #444; }
        .btn-group { display: flex; gap: 4px; }
        .btn {
            display: flex; align-items: center; justify-content: center;
            height: 32px; padding: 0 12px; border-radius: 8px; border: 1px solid #e2e8f0;
            background: #fff; color: #0f172a; cursor: pointer; transition: all 0.2s;
            font-size: 12px; font-weight: 600; white-space: nowrap; font-family: 'Inter', sans-serif;
        }
        body.dark .btn { background: #2d2d2d; color: #f1f5f9; border-color: #444; }
        .btn:hover { background: #3b82f6; color: white; border-color: #3b82f6; }
        .btn.icon { width: 32px; padding: 0; font-size: 16px; }
        .btn.primary { background: #3b82f6; color: white; border-color: #3b82f6; }
        .title-badge {
            position: fixed; top: 24px; left: 24px; padding: 5px 14px; border-radius: 8px;
            background: rgba(59, 130, 246, 0.1); border: 1px solid rgba(59, 130, 246, 0.2);
            color: #3b82f6; font-size: 11px; font-weight: 700; text-transform: uppercase;
            z-index: 10; font-family: monospace;
        }
    </style>
</head>
<body class="${initialTheme}">
    <div class="title-badge">${title}</div>
    <div id="canvas"></div>

    <div class="nav-container">
        <div class="btn-group">
            <button class="btn" onclick="expandAll()">Expand All</button>
            <button class="btn" onclick="collapseAll()">Collapse All</button>
        </div>
        <div style="width: 1px; height: 16px; background: #e2e8f0;"></div>
        <div class="btn-group">
            <button class="btn icon" onclick="zoomIn()">+</button>
            <button class="btn icon" onclick="zoomOut()">−</button>
            <button class="btn" onclick="fitView()">Fit Screen</button>
        </div>
        <div style="width: 1px; height: 16px; background: #e2e8f0;"></div>
        <button class="btn" onclick="toggleTheme()">🌓 Theme</button>
        <button class="btn primary" onclick="exportPNG().catch(function(e){ console.error(e); alert('Export failed: ' + (e && e.message || 'Unknown error')); })">Export Image</button>
    </div>

<script>
const layoutDir = "${escapedLayoutDir}";
const LAYOUT_CONFIG = {
  BASE_SCALE: 0.75,
  SIBLING_SPACING: 30,
  LEVEL_SPACING: 75,
  ROOT_MAX_WIDTH: 300,
  IMAGE: { MAX_WIDTH: 180, MAX_HEIGHT: 120, PADDING: 4, CORNER_RADIUS: 4, BORDER_WIDTH: 1.5 },
  NOTE_BLOCK: {
    PILL_HEIGHT: 18, PILL_GAP: 3.75,
    CODE_LINE_HEIGHT: 9, CODE_HEADER_HEIGHT: 15, CODE_V_PADDING: 7.5,
    QUOTE_LINE_HEIGHT: 9, QUOTE_V_PADDING: 7.5, QUOTE_BORDER_WIDTH: 2.25,
    TABLE_LINE_HEIGHT: 9, TABLE_HEADER_HEIGHT: 15, TABLE_ROW_HEIGHT: 16.5,
    TABLE_V_PADDING: 7.5, TABLE_CELL_HPADDING: 9,
    MONO_FONT: "'JetBrains Mono', 'Fira Code', 'Courier New', monospace",
    MAX_WIDTH: 300
  }
};

const PADDING = 9;

const RendererColors = {
  branch: {
    palette: ['#4f46e5','#7c3aed','#e11d48','#d97706','#059669','#0284c7','#db2777','#ea580c','#0d9488','#475569'],
    darkShades: {'#4f46e5':'#4f46e5','#7c3aed':'#7c3aed','#e11d48':'#e11d48','#d97706':'#d97706','#059669':'#059669','#0284c7':'#0284c7','#db2777':'#db2777','#ea580c':'#ea580c','#0d9488':'#0d9488','#475569':'#475569'}
  },
  node: { rootFillLight: '#444444', rootFillDark: '#d4d4d4', branchFallbackLight: '#f1f5f9', branchFallbackDark: '#1e293b', rootTextDark: '#1e1e1e' },
  border: { rootLight: '#000000', rootDark: '#ffffff', branchLight: '#cbd5e1', branchDark: '#444444', selected: '#ef4444' },
  action: { highlight: '#2563eb' },
  inline: { highlightText: '#000000', highlightFill: '#eab308', kbdLight: '#475569', kbdDark: '#cbd5e1', bullet: '#ffffff' },
  noteBlock: {
    pillBgDark: '#0f172a', pillBgLight: '#e2e8f0', pillTextDark: '#94a3b8', pillTextLight: '#64748b',
    expandedBgDark: '#0f172a', expandedBgLight: '#f8fafc', codeLangDark: '#7dd3fc', codeLangLight: '#0284c7',
    quoteAccentDark: '#818cf8', quoteAccentLight: '#6366f1', quoteTextDark: '#c7d2fe', quoteTextLight: '#4338ca',
    tableAccent: '#10b981', headerBgDark: '#1e293b', headerBgLight: '#e2e8f0',
    codeTextDark: '#e2e8f0', codeTextLight: '#1e293b', tableHeaderDark: '#f1f5f9', tableHeaderLight: '#1e1e1e',
    tableCellDark: '#cbd5e1', tableCellLight: '#475569', tableDividerDark: '#334155', tableDividerLight: '#cbd5e1'
  }
};

const ColorManager = {
  getThemeShade(color, isDark) {
    if (!isDark) return color;
    return RendererColors.branch.darkShades[color?.toLowerCase()] || color;
  },
  getLinkColor(bgHex) {
    const clean = bgHex.replace('#', '');
    const r = parseInt(clean.substring(0, 2), 16) / 255;
    const g = parseInt(clean.substring(2, 4), 16) / 255;
    const b = parseInt(clean.substring(4, 6), 16) / 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    const l = (max + min) / 2;
    let h = 0, s = 0;
    if (max !== min) {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      switch (max) {
        case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
        case g: h = ((b - r) / d + 2) / 6; break;
        case b: h = ((r - g) / d + 4) / 6; break;
      }
    }
    if (s < 0.1) return '#3b82f6';
    const compH = h, compS = 1.0, compL = l < 0.7 ? 0.88 : 0.25;
    const hslToRgb = (p, q, t) => { let tt = t; if (tt < 0) tt += 1; if (tt > 1) tt -= 1; if (tt < 1/6) return p + (q-p)*6*tt; if (tt < 1/2) return q; if (tt < 2/3) return p + (q-p)*(2/3-tt)*6; return p; };
    const q2 = compL < 0.5 ? compL*(1+compS) : compL+compS-compL*compS;
    const p2 = 2*compL - q2;
    const toHex = x => Math.round(x*255).toString(16).padStart(2,'0');
    return '#' + toHex(hslToRgb(p2,q2,compH+1/3)) + toHex(hslToRgb(p2,q2,compH)) + toHex(hslToRgb(p2,q2,compH-1/3));
  }
};

const BASE_SCALE = LAYOUT_CONFIG.BASE_SCALE;

function getHeadingFontSize(level) {
  const sizes = { 1: 32, 2: 26, 3: 22, 4: 18, 5: 16, 6: 14 };
  return (sizes[level] || 14) * BASE_SCALE;
}

function getHeadingLineHeight(level) {
  const fontSize = getHeadingFontSize(level);
  const multipliers = [0, 1.4, 1.35, 1.3, 1.3, 1.25, 1.25];
  return fontSize * (multipliers[level] || 1.25);
}

function getNoteBlockFontSize(depth) {
  const scale = BASE_SCALE;
  const base = depth === 0 ? 22 : depth === 1 ? 17 : depth === 2 ? 14 : 12;
  return base * scale;
}

function getNoteBlockFontWeight(depth) {
  if (depth === 0) return '600';
  if (depth === 1) return '500';
  return '400';
}

function getNoteBlockLineHeight(depth) {
  return getNoteBlockFontSize(depth) * 1.25;
}

function decodeHtmlEntities(text) {
  return text
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, '\u00A0')
    .replace(/&amp;/g, '&');
}

function parseMarkdownLine(line) {
  var segments = [];
  line = decodeHtmlEntities(line);
  var BS = String.fromCharCode(92);
  var SQ = String.fromCharCode(39);
  var DQ = String.fromCharCode(34);
  var SL = String.fromCharCode(47);
  
  if (!line) {
    return [{ text: '\u00A0' }];
  }
  
  var BT = String.fromCharCode(96);
  var p = [];
  p.push(BT + '[^' + BT + ']*' + BT);
  p.push(BS + '$.*?' + BS + '$');
  p.push('==.*?==');
  p.push(BS + '^.*?' + BS + '^');
  p.push(BS + '[[ xX]' + BS + ']');
  p.push(BS + '*{3}.*?' + BS + '*{3}');
  p.push(BS + '*{2}.*?' + BS + '*{2}');
  p.push(BS + '*.*?' + BS + '*');
  p.push('~~.*?~~');
  p.push('~.*?~');
  p.push(BS + '[.*?]' + BS + ']' + BS + '(.*?' + BS + ')');
  p.push('<a' + BS + 'b[^>]*>.*?<' + BS + SL + 'a>');
  p.push('<sub' + BS + 'b[^>]*>.*?<' + BS + SL + 'sub>');
  p.push('<sup' + BS + 'b[^>]*>.*?<' + BS + SL + 'sup>');
  p.push('<kbd' + BS + 'b[^>]*>.*?<' + BS + SL + 'kbd>');
  p.push('<mark' + BS + 'b[^>]*>.*?<' + BS + SL + 'mark>');
  p.push('<code>.*?<' + BS + SL + 'code>');
  p.push('<u' + BS + 'b[^>]*>.*?<' + BS + SL + 'u>');
  p.push('<span' + BS + 'b[^>]*>.*?<' + BS + SL + 'span>');
  p.push('<div' + BS + 'b[^>]*>.*?<' + BS + SL + 'div>');
  p.push('<p' + BS + 'b[^>]*>.*?<' + BS + SL + 'p>');
  p.push('<center' + BS + 'b[^>]*>.*?<' + BS + SL + 'center>');
  p.push('<h[1-6]' + BS + 'b[^>]*>.*?<' + BS + SL + 'h[1-6]>');
  p.push('<details' + BS + 'b[^>]*>.*?<' + BS + SL + 'details>');
  p.push('<li>.*?<' + BS + SL + 'li>');
  p.push('<ul>.*?<' + BS + SL + 'ul>');
  p.push('<ol>.*?<' + BS + SL + 'ol>');
  p.push('<em>.*?<' + BS + SL + 'em>');
  p.push('<i>.*?<' + BS + SL + 'i>');
  p.push('<strong>.*?<' + BS + SL + 'strong>');
  p.push('<b>.*?<' + BS + SL + 'b>');
  p.push('<img' + BS + 'b[^>]*>');
  p.push('<image' + BS + 'b[^>]*>');
  
  var re = new RegExp('(' + p.join('|') + ')', 'gi');
  var parts = line.split(re);
  
  var reA = new RegExp('^<a' + BS + 'b[^>]*href=[' + DQ + SQ + '](.*?)[' + DQ + SQ + '][^>]*>(.*?)<' + BS + SL + 'a>$', 'i');
  var reSub = new RegExp('^<sub' + BS + 'b[^>]*>(.*?)<' + BS + SL + 'sub>$', 'i');
  var reSup = new RegExp('^<sup' + BS + 'b[^>]*>(.*?)<' + BS + SL + 'sup>$', 'i');
  var reKbd = new RegExp('^<kbd' + BS + 'b[^>]*>(.*?)<' + BS + SL + 'kbd>$', 'i');
  var reCode = new RegExp('^<code' + BS + 'b[^>]*>(.*?)<' + BS + SL + 'code>$', 'i');
  var reMark = new RegExp('^<mark' + BS + 'b[^>]*>(.*?)<' + BS + SL + 'mark>$', 'i');
  var reU = new RegExp('^<u' + BS + 'b[^>]*>(.*?)<' + BS + SL + 'u>$', 'i');
  var reCenter = new RegExp('^<center' + BS + 'b[^>]*>(.*?)<' + BS + SL + 'center>$', 'i');
  var reH = new RegExp('^<h([1-6])' + BS + 'b[^>]*>(.*?)<' + BS + SL + 'h' + BS + '1>$', 'i');
  var reDetails = new RegExp('^<details' + BS + 'b[^>]*>(.*?)<' + BS + SL + 'details>$', 'i');
  var reDetailsSum = new RegExp('^<details' + BS + 'b[^>]*>(?:<summary' + BS + 'b[^>]*>(.*?)<' + BS + SL + 'summary>)?.*?<' + BS + SL + 'details>$', 'i');
  var reList = new RegExp('^<(ul|ol|li)' + BS + 'b[^>]*>(.*?)<' + BS + SL + BS + '1>$', 'i');
  var reListClose = new RegExp('^<' + SL + '?(ul|ol)' + BS + 'b[^>]*>$', 'i');
  var reSpan = new RegExp('^<(span|div|p|em|i|strong|b)' + BS + 'b[^>]*>(.*?)<' + BS + SL + BS + '1>$', 'i');
  var reImg = new RegExp('^<(img|image)' + BS + 'b[^>]*' + SL + '?>$', 'i');
  var reCheckbox = new RegExp('^' + BS + '[([ xX])]' + BS + ']$');
  var reMathSubSup = new RegExp('(_[^{' + BS + 's]|_' + BS + '{.*?}|' + BS + '^[^{' + BS + 's]|' + BS + '^' + BS + '{.*?})', 'g');
  
  parts.forEach(function(part) {
    if (!part) return;
    
    if (part.startsWith(BT) && part.endsWith(BT) && part.length >= 2) {
      segments.push({ text: part.slice(1, -1), keyboard: true });
    } else if (part.startsWith('$') && part.endsWith('$') && part.length >= 2) {
      var content = part.slice(1, -1);
      var renderedMatch = renderMathToUnicode(content);
      var mathParts = renderedMatch.split(reMathSubSup);
      mathParts.forEach(function(mPart) {
        if (!mPart) return;
        if (mPart.startsWith('_')) {
          var sub = mPart.startsWith('_{') ? mPart.slice(2, -1) : mPart.slice(1);
          segments.push({ text: sub, subscript: true, math: true });
        } else if (mPart.startsWith('^')) {
          var sup = mPart.startsWith('^{') ? mPart.slice(2, -1) : mPart.slice(1);
          segments.push({ text: sup, superscript: true, math: true });
        } else {
          segments.push({ text: mPart, math: true });
        }
      });
    } else if ((part.startsWith('[') || part.startsWith('![')) && part.includes('](')) {
      var isImage = part.startsWith('!');
      var lastClosingBracket = part.lastIndexOf(']');
      var title = part.substring(isImage ? 2 : 1, lastClosingBracket);
      var urlPart = part.substring(lastClosingBracket + 1);
      var url = urlPart.substring(1, urlPart.length - 1);
      
      if (isImage) {
        segments.push({ text: '!' + title, link: url });
      } else {
        var innerSegments = parseMarkdownLine(title);
        innerSegments.forEach(function(s) { segments.push({ ...s, link: url }); });
      }
    } else if (part.startsWith('***') && part.endsWith('***')) {
      var innerSegments = parseMarkdownLine(part.slice(3, -3));
      innerSegments.forEach(function(s) { segments.push({ ...s, bold: true, italic: true }); });
    } else if (part.startsWith('**') && part.endsWith('**')) {
      var innerSegments = parseMarkdownLine(part.slice(2, -2));
      innerSegments.forEach(function(s) { segments.push({ ...s, bold: true }); });
    } else if (part.startsWith('*') && part.endsWith('*')) {
      var innerSegments = parseMarkdownLine(part.slice(1, -1));
      innerSegments.forEach(function(s) { segments.push({ ...s, italic: true }); });
    } else if (part.startsWith('~~') && part.endsWith('~~')) {
      var innerSegments = parseMarkdownLine(part.slice(2, -2));
      innerSegments.forEach(function(s) { segments.push({ ...s, strikethrough: true }); });
    } else if (part.startsWith('~') && part.endsWith('~')) {
      segments.push({ text: part.slice(1, -1), subscript: true });
    } else if (part.startsWith('^') && part.endsWith('^')) {
      segments.push({ text: part.slice(1, -1), superscript: true });
    } else if (part.startsWith('==') && part.endsWith('==')) {
      var innerSegments = parseMarkdownLine(part.slice(2, -2));
      innerSegments.forEach(function(s) { segments.push({ ...s, highlight: true }); });
    } else if (reA.test(part)) {
      var match = part.match(reA);
      var url = match ? match[1] : '';
      var text = match ? match[2] : '';
      var innerSegments = parseMarkdownLine(text);
      innerSegments.forEach(function(s) { segments.push({ ...s, link: url }); });
    } else if (reSub.test(part)) {
      var innerSegments = parseMarkdownLine(part.replace(reSub, '$1'));
      innerSegments.forEach(function(s) { segments.push({ ...s, subscript: true }); });
    } else if (reSup.test(part)) {
      var innerSegments = parseMarkdownLine(part.replace(reSup, '$1'));
      innerSegments.forEach(function(s) { segments.push({ ...s, superscript: true }); });
    } else if (reKbd.test(part)) {
      segments.push({ text: part.replace(reKbd, '$1'), keyboard: true });
    } else if (reCode.test(part)) {
      segments.push({ text: part.replace(reCode, '$1'), keyboard: true });
    } else if (reMark.test(part)) {
      var innerSegments = parseMarkdownLine(part.replace(reMark, '$1'));
      innerSegments.forEach(function(s) { segments.push({ ...s, highlight: true }); });
    } else if (reU.test(part)) {
      var innerSegments = parseMarkdownLine(part.replace(reU, '$1'));
      innerSegments.forEach(function(s) { segments.push({ ...s, underline: true }); });
    } else if (reCenter.test(part)) {
      var innerSegments = parseMarkdownLine(part.replace(reCenter, '$1'));
      innerSegments.forEach(function(s) { segments.push({ ...s, center: true }); });
    } else if (reH.test(part)) {
      var match = part.match(reH);
      var level = parseInt(match[1]);
      var text = match[2];
      var innerSegments = parseMarkdownLine(text);
      innerSegments.forEach(function(s) { segments.push({ ...s, heading: level }); });
    } else if (reDetails.test(part)) {
      segments.push({
        text: part.replace(reDetailsSum, function(_, p1) { return p1 || 'Details'; }),
        details: true,
      });
    } else if (reList.test(part)) {
      var match = part.match(reList);
      var tag = match ? match[1].toLowerCase() : '';
      var text = match ? match[2] : '';
      
      if (tag === 'li') {
        segments.push({ text: ' \u2022 ', bullet: true });
        var innerSegments = parseMarkdownLine(text);
        segments.push(...innerSegments);
      } else {
        var innerSegments = parseMarkdownLine(text);
        segments.push(...innerSegments);
      }
    } else if (reListClose.test(part)) {
      segments.push({ text: '' });
    } else if (reSpan.test(part)) {
      var match = part.match(reSpan);
      var tag = match ? match[1].toLowerCase() : '';
      var text = match ? match[2] : '';
      var isBold = tag === 'strong' || tag === 'b';
      var isItalic = tag === 'em' || tag === 'i';
      var innerSegments = parseMarkdownLine(text);
      innerSegments.forEach(function(s) {
        segments.push({
          ...s,
          bold: s.bold || isBold,
          italic: s.italic || isItalic,
        });
      });
    } else if (reImg.test(part)) {
      segments.push({ text: '' });
    } else if (reCheckbox.test(part)) {
      var match = part.match(reCheckbox);
      segments.push({ text: '', checkbox: true, checked: match[1].toLowerCase() === 'x' });
    } else {
      segments.push({ text: part });
    }
  });
  
  return segments;
}

function measureRichTextWidth(line, fontSize, fontWeight, measureFn) {
  if (!line) return 0;
  const segments = parseMarkdownLine(line);
  let totalWidth = 0;
  segments.forEach(function(seg) {
    const font = (seg.bold ? 'bold ' : fontWeight + ' ') + (seg.italic ? 'italic ' : '') + fontSize + 'px Inter, sans-serif';
    const textToMeasure = seg.checkbox ? '☑ ' : seg.text;
    totalWidth += measureFn(textToMeasure, font);
  });
  return totalWidth;
}

function wrapText(text, maxWidth, fontSize, fontWeight, measureFn, fontFamily, literal) {
  if (text === undefined || text === null) return [''];
  var NL = String.fromCharCode(10);
  var BS = String.fromCharCode(92);
  
  let processedText = text.replace(new RegExp('<br' + BS + 's*' + BS + '/?>', 'gi'), NL);
  const cleanText = literal ? processedText : processedText.replace(new RegExp(BS + '[(codeblock|quoteblock|image|tableblock):' + BS + 'd+' + BS + ']', 'g'), '').trim();
  
  if (!cleanText && !processedText.includes(NL)) return [];
  
  const rawLines = processedText.split(NL);
  const wrapped = [];
  const font = fontWeight + ' ' + fontSize + 'px ' + fontFamily;
  
  rawLines.forEach((rawLine) => {
    const line = literal ? rawLine : rawLine.replace(new RegExp(BS + '[(codeblock|quoteblock|image|tableblock):' + BS + 'd+' + BS + ']', 'g'), '').trimEnd();
    
    if (!literal && !line && rawLine.match(new RegExp(BS + '[(codeblock|quoteblock|image|tableblock):' + BS + 'd+' + BS + ']'))) return;
    
    if (!line) {
      if (wrapped.length > 0 && wrapped[wrapped.length - 1] === '') return;
      wrapped.push('');
      return;
    }
    
    const words = line.split(new RegExp('(\\s+)')).filter(Boolean);
    let currentLine = '';
    
    words.forEach((token) => {
      if (!token) return;
      
      const testLine = currentLine + token;
      let measureText = testLine;
      const linkMatch = measureText.match(new RegExp('(!?\\\\[)(.*?)(\\\\](?:\\\\[.*?\\\\])?\\\\([^)]*\\\\))'));
      if (linkMatch) measureText = linkMatch[2];
      var BS = String.fromCharCode(92);
      measureText = measureText.replace(new RegExp(BS+'\\*'+BS+'\\*'+BS+'\\*', 'g'), '').replace(new RegExp(BS+'\\*'+BS+'\\*', 'g'), '').replace(new RegExp(BS+'\\*', 'g'), '').replace(new RegExp('~~', 'g'), '').replace(new RegExp('==', 'g'), '').replace(new RegExp(BS+'\\^', 'g'), '').replace(new RegExp('~', 'g'), '').replace(new RegExp(BS+'\\$', 'g'), '');
      measureText = measureText.replace(new RegExp(BS+'[[ xX]'+BS+']'), '☑ ');
      measureText = measureText.replace(new RegExp('<[^>]+>', 'g'), '');

      const testWidth = measureFn(measureText, font);

      if (testWidth > maxWidth && currentLine) {
        wrapped.push(currentLine.trimEnd());
        currentLine = token;
      } else {
        currentLine = testLine;
      }
    });

    if (currentLine) {
      const visibleText = literal ? currentLine : currentLine.replace(new RegExp('<[^>]+>', 'g'), '').trim();
      if (visibleText || literal) {
        wrapped.push(currentLine.trimEnd());
      } else if (line === '') {
        wrapped.push('');
      }
    }
  });
  
  while (wrapped.length > 0 && wrapped[0] === '') wrapped.shift();
  while (wrapped.length > 0 && wrapped[wrapped.length - 1] === '') wrapped.pop();
  
  return wrapped.length === 0 ? [''] : wrapped;
}

const mathSymbolMap = (function() {
  var BS = String.fromCharCode(92);
  var map = {};
  map[BS+'neq']='≠'; map[BS+'pm']='±'; map[BS+'approx']='≈'; map[BS+'infty']='∞';
  map[BS+'sum']='∑'; map[BS+'prod']='∏'; map[BS+'int']='∫';
  map[BS+'le']='≤'; map[BS+'leq']='≤'; map[BS+'ge']='≥'; map[BS+'geq']='≥';
  map[BS+'times']='×'; map[BS+'div']='÷'; map[BS+'cdot']='·';
  map[BS+'mp']='∓'; map[BS+'oplus']='⊕'; map[BS+'otimes']='⊗';
  map[BS+'deg']='°'; map[BS+'perp']='⊥'; map[BS+'parallel']='∥';
  map[BS+'cong']='≅'; map[BS+'equiv']='≡'; map[BS+'sim']='∼'; map[BS+'propto']='∝';
  map[BS+'in']='∈'; map[BS+'notin']='∉';
  map[BS+'subset']='⊂'; map[BS+'supset']='⊃'; map[BS+'subseteq']='⊆'; map[BS+'supseteq']='⊇';
  map[BS+'cup']='∪'; map[BS+'cap']='∩';
  map[BS+'forall']='∀'; map[BS+'exists']='∃'; map[BS+'nexists']='∄';
  map[BS+'emptyset']='∅'; map[BS+'nabla']='∇'; map[BS+'partial']='∂';
  map[BS+'alpha']='α'; map[BS+'beta']='β'; map[BS+'gamma']='γ'; map[BS+'delta']='δ';
  map[BS+'epsilon']='ε'; map[BS+'zeta']='ζ';
  map[BS+'eta']='η'; map[BS+'theta']='θ'; map[BS+'iota']='ι'; map[BS+'kappa']='κ';
  map[BS+'lambda']='λ'; map[BS+'mu']='μ';
  map[BS+'nu']='ν'; map[BS+'xi']='ξ'; map[BS+'pi']='π'; map[BS+'rho']='ρ';
  map[BS+'sigma']='σ'; map[BS+'tau']='τ';
  map[BS+'upsilon']='υ'; map[BS+'phi']='φ'; map[BS+'chi']='χ'; map[BS+'psi']='ψ'; map[BS+'omega']='ω';
  map[BS+'Gamma']='Γ'; map[BS+'Delta']='Δ'; map[BS+'Theta']='Θ'; map[BS+'Lambda']='Λ';
  map[BS+'Xi']='Ξ'; map[BS+'Pi']='Π';
  map[BS+'Sigma']='Σ'; map[BS+'Phi']='Φ'; map[BS+'Psi']='Ψ'; map[BS+'Omega']='Ω';
  return map;
})();

function renderMathToUnicode(latex) {
  if (!latex) return '';
  let result = latex;
  
  Object.entries(mathSymbolMap).forEach(([cmd, unicode]) => {
    const regex = new RegExp(cmd + '(?![a-zA-Z])', 'g');
    result = result.replace(regex, unicode);
  });
  
  var BS2 = String.fromCharCode(92);
  result = result.replace(new RegExp(BS2+'sqrt\\{([^}]+)\\}', 'g'), '√($1)');
  result = result.replace(new RegExp(BS2+'sqrt\\s+([a-zA-Z0-9])', 'g'), '√$1');
  result = result.replace(new RegExp(BS2+'frac\\{([^}]+)\\}\\{([^}]+)\\}', 'g'), '($1/$2)');
  
  return result;
}

const treeData = ${jsonTree};
let isDark = ${isDarkMode};
const svg = d3.select("#canvas").append("svg").attr("width", "100%").attr("height", "100%");
const g = svg.append("g").attr("class", "mindmap-content");
const linkLayer = g.append("g").attr("class", "links-layer");
const nodeLayer = g.append("g").attr("class", "nodes-layer");

const zoom = d3.zoom().scaleExtent([0.1, 4])
  .translateExtent([[-5000, -5000], [5000, 5000]])
  .filter((event) => {
    const isAllowedButton = event.button === 0 || event.button === 1 || event.button === undefined;
    return !event.ctrlKey && !event.altKey && !event.metaKey && isAllowedButton;
  })
  .on("start", () => svg.style('cursor', 'grabbing'))
  .on("zoom", (e) => g.attr("transform", e.transform))
  .on("end", () => { svg.style('cursor', 'grab'); });

svg.call(zoom).style('cursor', 'grab')
  .on('click', () => {})
  .filter(() => true)
  .on('wheel.zoom', (event) => {
    event.preventDefault();
    const isZoom = event.ctrlKey || event.altKey || event.metaKey;
    if (isZoom) {
      const delta = -event.deltaY * (event.deltaMode === 1 ? 0.05 : event.deltaMode === 2 ? 1 : 0.002);
      const factor = Math.pow(2, delta);
      const [mx, my] = d3.pointer(event, svg.node());
      zoom.scaleBy(svg, factor, [mx, my]);
    } else {
      let dx = event.deltaX, dy = event.deltaY;
      if (event.shiftKey && Math.abs(dy) > Math.abs(dx)) { dx = dy; dy = 0; }
      if (event.deltaMode === 1) { dx *= 20; dy *= 20; } else if (event.deltaMode === 2) { dx *= 200; dy *= 200; }
      zoom.translateBy(svg, -dx, -dy);
    }
  }, { passive: false });

const measureCtx = document.createElement('canvas').getContext('2d');
const posMap = new Map();
let isVertical = false;

function measureNode(node) {
  const depth = node.depth || 0;
  const fontSize = getNoteBlockFontSize(depth);
  const fontWeight = getNoteBlockFontWeight(depth);
  const lineHeight = getNoteBlockLineHeight(depth);
  const rootMaxW = depth === 0 ? LAYOUT_CONFIG.ROOT_MAX_WIDTH - PADDING * 2 : Infinity;
  var NL = String.fromCharCode(10);
  var BS = String.fromCharCode(92);

  let displayContent = node.displayContent || node.content || '';
  displayContent = displayContent.replace(new RegExp(BS + '[(codeblock|quoteblock|image|tableblock):' + BS + 'd+' + BS + ']', 'gi'), '');
  displayContent = displayContent.split(NL).map(l => l.replace(new RegExp('^(' + BS + 's*)[-*+]' + BS + 's*' + BS + '[([ xX])' + BS + ']'), '$1[$2]')).join(NL).trim();

  const measure = (t, f) => {
    if (measureCtx) {
      measureCtx.font = f;
      return measureCtx.measureText(t).width;
    }
    return t.length * (fontSize * 0.6);
  };

  const displayLines = wrapText(displayContent, rootMaxW, fontSize, fontWeight, measure, 'Inter, sans-serif');
  let maxWidth = 0;

  displayLines.forEach(line => {
    const segments = parseMarkdownLine(line);
    let lineWidth = 0;
    segments.forEach(seg => {
      if (measureCtx) {
        const segFontSize = seg.heading ? getHeadingFontSize(seg.heading) : ((seg.subscript || seg.superscript) ? fontSize * 0.7 : fontSize);
        const segFontFamily = seg.keyboard ? LAYOUT_CONFIG.NOTE_BLOCK.MONO_FONT : 'Inter, sans-serif';
        const textToMeasure = seg.checkbox ? '☑ ' : seg.text;
        measureCtx.font = ((seg.bold || (seg.heading && seg.heading <= 3)) ? 'bold ' : fontWeight + ' ') + (seg.italic ? 'italic ' : '') + segFontSize + 'px ' + segFontFamily;
        lineWidth += measureCtx.measureText(textToMeasure).width;
      } else {
        const segFontSize = seg.heading ? getHeadingFontSize(seg.heading) : ((seg.subscript || seg.superscript) ? fontSize * 0.7 : fontSize);
        lineWidth += seg.text.length * (segFontSize * 0.6);
      }
    });
    maxWidth = Math.max(maxWidth, lineWidth);
  });

  const hasText = displayContent.length > 0;
  node.width = maxWidth + PADDING * 2;

  let totalTextHeight = 0;
  displayLines.forEach(line => {
    const lineSegments = parseMarkdownLine(line);
    const maxLineH = lineSegments.reduce((max, seg) => {
      const h = seg.heading ? getHeadingLineHeight(seg.heading) : lineHeight;
      return Math.max(max, h);
    }, 0);
    totalTextHeight += maxLineH || lineHeight;
  });
  node.height = (hasText ? totalTextHeight : 0) + PADDING * 2;
  node.displayLines = displayLines;
  node.displayContent = displayContent;
  node.hasText = hasText;
  node.fontSize = fontSize;
  node.fontWeight = fontWeight;
  node.lineHeight = lineHeight;

  if (node.image) {
    const img = node.image;
    const imgConfig = LAYOUT_CONFIG.IMAGE;
    // Use pre-computed thumb dimensions from the serialized renderer data when available.
    // Only recompute from raw width/height if they aren't already set.
    if (!img.thumbWidth || !img.thumbHeight) {
      const w = img.width || 0, h = img.height || 0;
      let scale = 1;
      if (w > 0 && h > 0) {
        const ratioW = imgConfig.MAX_WIDTH / w, ratioH = imgConfig.MAX_HEIGHT / h;
        if (w > imgConfig.MAX_WIDTH || h > imgConfig.MAX_HEIGHT) scale = Math.min(ratioW, ratioH);
        img.thumbWidth = w * scale; img.thumbHeight = h * scale;
      } else {
        img.thumbWidth = 40; img.thumbHeight = 30; img.failed = true;
      }
    }
    const thumbH = img.thumbHeight || 0, thumbW = img.thumbWidth || 0;
    node.height += thumbH;
    const codeBlocks = node.codeBlocks || [], quoteBlocks = node.quoteBlocks || [], tableBlocks = node.tableBlocks || [];
    const hasNoteBlocks = codeBlocks.length > 0 || quoteBlocks.length > 0 || tableBlocks.length > 0;
    if (thumbH > 0 && (hasText || hasNoteBlocks)) node.height += imgConfig.PADDING;
    // Track image width — final node.width is resolved after all phases.
    if (thumbW > maxWidth) maxWidth = thumbW;
  }

  const NB = LAYOUT_CONFIG.NOTE_BLOCK;
  const codeBlocks = node.codeBlocks || [];
  const quoteBlocks = node.quoteBlocks || [];
  const tableBlocks = node.tableBlocks || [];
  const allNoteBlocks = [
    ...codeBlocks.map(b => ({ expanded: b.expanded, content: b.code, isQuote: false, isTable: false })),
    ...quoteBlocks.map(b => ({ expanded: b.expanded, content: b.text, isQuote: true, isTable: false })),
    ...tableBlocks.map(b => ({ expanded: b.expanded, content: '', isQuote: false, isTable: true, headers: b.headers, rows: b.rows }))
  ];

  if (allNoteBlocks.length > 0) {
    let maxNoteWidth = 135;
    allNoteBlocks.forEach((block, idx) => {
      if (hasText || node.image || idx > 0) node.height += NB.PILL_GAP;
      if (!block.expanded) {
        node.height += NB.PILL_HEIGHT;
      } else if (block.isTable) {
        let totalTableHeight = NB.TABLE_HEADER_HEIGHT + NB.TABLE_V_PADDING * 2;
        const colCount = Math.max(block.headers?.length || 0, ...(block.rows?.map(r => r.length) || [0]));
        const colWidths = new Array(colCount).fill(0);
        if (colCount > 0) {
          const getCellLines = (txt, mw) => {
            var NL = String.fromCharCode(10);
            const raw = (txt||'').replace(new RegExp('<br'+BS+'s*'+BS+'/?>','gi'),NL).replace(new RegExp(BS+BS+'n','g'),NL).replace(new RegExp(BS+BS+'t','g'),'    ').replace(new RegExp(BS+'t','g'),'    ').split(new RegExp(BS+'r?'+BS+'n','g'));
            if (mw === undefined) return raw;
            const mFn = (t, f) => { if (measureCtx) { measureCtx.font = f; return measureCtx.measureText(t).width; } return t.length * (NB.TABLE_LINE_HEIGHT * 0.6); };
            return raw.flatMap(l => wrapText(l, mw, NB.TABLE_LINE_HEIGHT, '400', mFn, 'Inter, sans-serif'));
          };
          if (block.headers) block.headers.forEach((h, i) => {
            const lines = getCellLines(h);
            lines.forEach(l => { 
                const w = measureRichTextWidth(l, NB.TABLE_LINE_HEIGHT, 'bold', (t, f) => {
                    if (measureCtx) { measureCtx.font = f; return measureCtx.measureText(t).width; }
                    return t.length * (NB.TABLE_LINE_HEIGHT * 0.6);
                });
                colWidths[i] = Math.max(colWidths[i], w + 60 + 4); 
              });
            });
            block.rows?.forEach(row => row.forEach((cell, i) => {
              const lines = getCellLines(cell);
              lines.forEach(l => { 
                  const w = measureRichTextWidth(l, NB.TABLE_LINE_HEIGHT, '400', (t, f) => {
                      if (measureCtx) { measureCtx.font = f; return measureCtx.measureText(t).width; }
                      return t.length * (NB.TABLE_LINE_HEIGHT * 0.6);
                  });
                  colWidths[i] = Math.max(colWidths[i], w + 60 + 4); 
              });
            }));
            if (block.headers?.length) {
              let maxL = 1;
              block.headers.forEach((h, i) => { maxL = Math.max(maxL, getCellLines(h, Math.max(500, colWidths[i]-60)).length); });
              totalTableHeight += NB.TABLE_HEADER_HEIGHT + (maxL-1)*NB.TABLE_LINE_HEIGHT;
            }
            block.rows?.forEach(row => {
              let maxL = 1;
              row.forEach((cell, i) => { maxL = Math.max(maxL, getCellLines(cell, Math.max(500, colWidths[i]-60)).length); });
            totalTableHeight += NB.TABLE_ROW_HEIGHT + (maxL-1)*NB.TABLE_LINE_HEIGHT;
          });
          node.height += totalTableHeight;
          node.tableColWidths = colWidths;
          const tw = colWidths.reduce((s,w) => s+w, 0);
          if (tw > maxNoteWidth) maxNoteWidth = tw;
        }
      } else {
        const lineH = block.isQuote ? NB.QUOTE_LINE_HEIGHT : NB.CODE_LINE_HEIGHT;
        const blockFontFamily = block.isQuote ? 'Inter, sans-serif' : NB.MONO_FONT.replace(new RegExp("'", 'g'), "");
        const wrapW = NB.MAX_WIDTH - (block.isQuote ? 24 : 16);
        const mFn2 = (t, f) => { if (measureCtx) { measureCtx.font = f; return measureCtx.measureText(t).width; } return t.length * (lineH * 0.6); };
        const lines = (block.content || '').split(new RegExp(BS+'r?'+BS+'n','g')).flatMap(l => wrapText(l, wrapW, lineH, 'normal', mFn2, blockFontFamily));
        if (measureCtx) measureCtx.font = lineH + 'px ' + blockFontFamily;
        lines.forEach(l => {
          let lw = measureCtx ? measureCtx.measureText(l).width + (block.isQuote ? NB.QUOTE_BORDER_WIDTH+16 : 16) : l.length*(lineH*0.6)+16;
          if (lw > maxNoteWidth) maxNoteWidth = lw;
        });
        const vPad = block.isQuote ? NB.QUOTE_V_PADDING : NB.CODE_V_PADDING;
        node.height += NB.CODE_HEADER_HEIGHT + vPad + lines.length * lineH + vPad;
      }
    });
    if (maxNoteWidth > maxWidth) maxWidth = maxNoteWidth;
  }
  // Final: node width = widest of (text, image, note blocks) + padding on both sides.
  node.width = maxWidth + PADDING * 2;
}

function flattenTree(node) {
  const nodes = [];
  const traverse = n => { nodes.push(n); if (!n.collapsed && n.children) n.children.forEach(traverse); };
  traverse(node);
  return nodes;
}

function getLinks(nodes) {
  const links = [];
  nodes.forEach(n => { if (!n.collapsed && n.children) n.children.forEach(c => links.push({ source: n, target: c })); });
  return links;
}

function getSubtreeHeight(node) {
  if (node.collapsed || !node.children || !node.children.length) return node.height || 0;
  let h = node.children.reduce((acc, c) => acc + getSubtreeHeight(c), 0);
  h += (node.children.length - 1) * LAYOUT_CONFIG.SIBLING_SPACING;
  return Math.max(node.height || 0, h);
}

function layoutSide(nodes, boundaryX, parentY, side) {
  if (!nodes || !nodes.length) return;
  const branchHeights = nodes.map(n => getSubtreeHeight(n));
  const totalHeight = branchHeights.reduce((s, h) => s + h, 0) + (nodes.length - 1) * LAYOUT_CONFIG.SIBLING_SPACING;
  let currentY = parentY - totalHeight / 2;
  const dir = side === 'right' ? 1 : -1;

  for (let i = 0; i < nodes.length; i++) {
    const node = nodes[i];
    const branchHeight = branchHeights[i];
    const nodeY = currentY + branchHeight / 2;
    const nodeX = boundaryX;
    const nodeWidth = node.width || 0;

    posMap.set(node.id, { x: nodeX, y: nodeY, direction: dir });

    if (!node.collapsed && node.children && node.children.length > 0) {
      const nextBoundary = nodeX + dir * (nodeWidth + LAYOUT_CONFIG.LEVEL_SPACING);
      layoutSide(node.children, nextBoundary, nodeY, side);
    }

    currentY += branchHeight + LAYOUT_CONFIG.SIBLING_SPACING;
  }
}

function calculateLayout(root) {
  posMap.clear();
  const nodes = flattenTree(root);
  nodes.forEach(measureNode);

  isVertical = layoutDir === 'vertical' || layoutDir === 'top-to-bottom' || layoutDir === 'bottom-to-top';

  posMap.set(root.id, { x: 0, y: 0, direction: 0 });

  if (root.collapsed || !root.children || !root.children.length) return;

  const rootWidth = root.width || 0;

  if (layoutDir === 'left-to-right') {
    layoutSide(root.children, rootWidth / 2 + LAYOUT_CONFIG.LEVEL_SPACING, 0, 'right');
  } else if (layoutDir === 'right-to-left') {
    layoutSide(root.children, -rootWidth / 2 - LAYOUT_CONFIG.LEVEL_SPACING, 0, 'left');
  } else {
    const left = [], right = [];
    let leftTotalHeight = 0, rightTotalHeight = 0;

    root.children.forEach(child => {
      const height = getSubtreeHeight(child);
      const countDiff = right.length - left.length;

      if (countDiff === 0) {
        if (rightTotalHeight <= leftTotalHeight) {
          right.push(child);
          rightTotalHeight += height + LAYOUT_CONFIG.SIBLING_SPACING;
        } else {
          left.push(child);
          leftTotalHeight += height + LAYOUT_CONFIG.SIBLING_SPACING;
        }
      } else if (countDiff > 0) {
        left.push(child);
        leftTotalHeight += height + LAYOUT_CONFIG.SIBLING_SPACING;
      } else {
        right.push(child);
        rightTotalHeight += height + LAYOUT_CONFIG.SIBLING_SPACING;
      }
    });

    layoutSide(left, -rootWidth / 2 - LAYOUT_CONFIG.LEVEL_SPACING, 0, 'left');
    layoutSide(right, rootWidth / 2 + LAYOUT_CONFIG.LEVEL_SPACING, 0, 'right');
  }
}

function render() {
  calculateLayout(treeData);
  const nodes = flattenTree(treeData);
  const links = getLinks(nodes);

  renderLinks(links);
  renderNodes(nodes);
}

function getDir(d) {
  const p = posMap.get(d.id);
  return p ? (p.direction || 0) : 0;
}

function getRectX(d, w) {
  const dir = getDir(d);
  if (isVertical || dir === 0) return -w/2;
  return dir === -1 ? -w : 0;
}

function getLinkSourceX(source, target) {
  const sPos = posMap.get(source.id), tPos = posMap.get(target.id);
  const sWidth = source.width || 0;
  const sDir = sPos ? (sPos.direction || 0) : 0;
  if (!source.parentId) return tPos.x < sPos.x ? sPos.x - sWidth/2 : sPos.x + sWidth/2;
  if (sDir === -1) return sPos.x - sWidth;
  if (sDir === 1) return sPos.x + sWidth;
  return sPos.x;
}

function renderLinks(links) {
  const linkPaths = linkLayer.selectAll("path.link").data(links, d => d.target.id);
  linkPaths.exit().remove();

  const enter = linkPaths.enter().append("path").attr("class", "link").attr("fill", "none").attr("stroke-width", 2);
  const update = enter.merge(linkPaths);

  const sideAwareDiagonal = (d) => {
    const sPos = posMap.get(d.source.id), tPos = posMap.get(d.target.id);
    const sDir = sPos ? (sPos.direction || 0) : 0;
    const tDir = tPos ? (tPos.direction || 0) : 0;

    if (isVertical) {
      const sH = d.source.height || 0;
      const sY = tPos.y < sPos.y ? sPos.y - sH/2 : sPos.y + sH/2;
      const tY = tPos.y < sPos.y ? tPos.y + (d.target.height||0)/2 : tPos.y - (d.target.height||0)/2;
      const cp1y = sY + (tY - sY) / 2;
      return 'M' + sPos.x + ',' + sY + 'C' + sPos.x + ',' + cp1y + ' ' + tPos.x + ',' + cp1y + ' ' + tPos.x + ',' + tY;
    }

    const sWidth = d.source.width || 0;
    let sX;
    if (!d.source.parentId) {
      sX = tDir === 1 ? sPos.x + sWidth/2 : sPos.x - sWidth/2;
    } else if (sDir === -1) {
      sX = sPos.x - sWidth;
    } else {
      sX = sPos.x + sWidth;
    }

    const tX = tPos.x;

    const sY = sPos.y;
    const cp1x = sX + (tX - sX) / 2;
    return 'M' + sX + ',' + sY + 'C' + cp1x + ',' + sY + ' ' + cp1x + ',' + tPos.y + ' ' + tX + ',' + tPos.y;
  };

  update.attr("d", sideAwareDiagonal)
    .attr("stroke-opacity", 0.55)
    .attr("stroke", d => ColorManager.getThemeShade(d.target.color, false) || 'currentColor');
}

function renderNodes(nodes) {
  const nodeGroups = nodeLayer.selectAll("g.node").data(nodes, d => d.id);
  nodeGroups.exit().remove();

  const enter = nodeGroups.enter().append("g").attr("class", "node")
    .attr("cursor", "pointer").attr("opacity", 1);

  enter.append("defs").append("clipPath").attr("id", d => "clip-" + d.id).append("rect").attr("rx", 6).attr("ry", 6);
  enter.append("rect").attr("class", "node-bg").attr("rx", 6).attr("ry", 6).attr("stroke", "none").attr("stroke-width", 0);
  enter.append("text").attr("font-family", "Inter, sans-serif").attr("xml:space", "preserve");
  enter.append("g").attr("class", "image-container").append("image");

  const update = enter.merge(nodeGroups);

  update.attr("data-id", d => d.id)
    .on("click", (e, d) => { e.stopPropagation(); toggleNode(d); })
    .attr("transform", d => {
      const p = posMap.get(d.id);
      return p ? "translate(" + p.x + "," + p.y + ")" : "";
    });

  update.select("text").each(function(d) {
    const textEl = d3.select(this);
    const depth = d.depth || 0;
    const fontSize = getNoteBlockFontSize(depth);
    const fontWeight = getNoteBlockFontWeight(depth);
    const displayLines = d.displayLines || [];
    const width = d.width || 0, height = d.height || 0;

    let x;
    const dir = getDir(d);
    if (isVertical || dir === 0) x = -width/2 + PADDING;
    else if (dir === -1) x = -width + PADDING;
    else x = PADDING;

    const tspanJoin = textEl.selectAll("tspan.line").data(displayLines, (l, i) => i);
    tspanJoin.exit().remove();
    const tspanEnter = tspanJoin.enter().append("tspan").attr("class", "line");
    const tspanUpdate = tspanEnter.merge(tspanJoin);

    const nodeFill = isDark ? (depth === 0 ? RendererColors.node.rootFillDark : ColorManager.getThemeShade(d.color, true) || RendererColors.node.branchFallbackDark) : (depth === 0 ? RendererColors.node.rootFillLight : d.color || RendererColors.node.branchFallbackLight);

    const lineHeight = getNoteBlockLineHeight(depth);
    let totalTextHeight = 0;
    const lineHeights = [];
    displayLines.forEach(line => {
      const segs = parseMarkdownLine(line);
      const maxH = segs.reduce((m, s) => Math.max(m, s.heading ? getHeadingLineHeight(s.heading) : lineHeight), 0);
      const h = maxH || lineHeight;
      totalTextHeight += h;
      lineHeights.push(h);
    });
    const textH = totalTextHeight;
    let yOffset = -height/2 + PADDING;
    const img = d.image;
    const imgH = (img && img.thumbHeight > 0) ? img.thumbHeight : 0;
    const hasText = displayLines.length > 0;
    const imgGap = (imgH > 0 && hasText) ? LAYOUT_CONFIG.IMAGE.PADDING : 0;
    yOffset += imgH + imgGap;
    const textOffset = yOffset + textH / 2;

    textEl.attr("y", textOffset).attr("x", x);

    const lineSegments = new Map();
    displayLines.forEach(line => lineSegments.set(line, parseMarkdownLine(line)));

    const totalLines = displayLines.length;
    tspanUpdate
      .attr("x", line => {
        const segs = lineSegments.get(line) || [];
        if (segs.some(s => s.center)) {
          if (isVertical || dir === 0) return 0;
          const w = d.width || 0;
          return dir === -1 ? -w/2 : w/2;
        }
        return x;
      })
      .style("text-anchor", line => {
        const segs = lineSegments.get(line) || [];
        return segs.some(s => s.center) ? "middle" : null;
      })
      .attr("dy", (line, i) => {
        if (i === 0) {
          const dy = -totalTextHeight / 2 + lineHeights[0] * 0.78;
          return (dy / fontSize) + "em";
        } else {
          const dy = lineHeights[i - 1] * 0.22 + lineHeights[i] * 0.78;
          return (dy / fontSize) + "em";
        }
      })
      .style("visibility", line => {
        const t = line.trim();
        return (t === '---' || t === '***' || t === '___') ? 'hidden' : 'visible';
      });

    const nodeG = d3.select(this.parentNode);
    const dividersData = displayLines.map((l, i) => ({ line: l.trim(), i })).filter(d => d.line === '---' || d.line === '***' || d.line === '___');
    const dividers = nodeG.selectAll("line.hr-divider").data(dividersData, d => d.line + "-" + d.i);
    dividers.exit().remove();
    dividers.enter().append("line").attr("class", "hr-divider").merge(dividers)
      .each(function(dInfo) {
        const w = d.width || 0;
        const isCentered = isVertical || depth === 0;
        const blockTop = -height/2 + PADDING + imgH + imgGap;
        const lineY = blockTop + dInfo.i * lineHeight + lineHeight/2;
        let startX;
        if (isCentered) { startX = -w/2; }
        else { startX = getRectX(d, w); }
        d3.select(this).style("pointer-events", "none")
          .attr("x1", startX+12).attr("x2", startX+w-12).attr("y1", lineY).attr("y2", lineY)
          .attr("stroke", "white").attr("stroke-opacity", 0.9).attr("stroke-width", 1.5)
          .attr("stroke-dasharray", (dInfo.line === '***' || dInfo.line === '___') ? '3,3' : 'none');
      });

    tspanUpdate.each(function(line) {
      const tspan = d3.select(this);
      const segments = lineSegments.get(line) || parseMarkdownLine(line);
      const segJoin = tspan.selectAll("tspan.segment").data(segments, (s, i) => s.text + "-" + i);
      segJoin.exit().remove();
      const segEnter = segJoin.enter().append("tspan").attr("class", "segment");
      const segUpdate = segEnter.merge(segJoin);

      segUpdate.text(s => s.checkbox ? (s.checked ? '☑ ' : '☐ ') : s.text)
        .style("font-weight", s => s.bold || (s.heading && s.heading <= 3) ? 'bold' : fontWeight)
        .style("font-style", s => s.italic ? 'italic' : 'normal')
        .style("text-decoration", s => (s.underline || s.link) ? 'underline' : (s.strikethrough ? 'line-through' : 'none'))
        .style("font-size", s => s.heading ? getHeadingFontSize(s.heading)+'px' : ((s.subscript || s.superscript) ? fontSize*0.7+'px' : fontSize+'px'))
        .style("fill", s => {
          if (s.checkbox || s.bullet) return RendererColors.inline.bullet;
          if (s.link) return ColorManager.getLinkColor(nodeFill);
          if (s.highlight) return RendererColors.inline.highlightText;
          return null;
        })
        .attr("baseline-shift", s => s.subscript ? 'sub' : (s.superscript ? 'super' : 'baseline'))
        .style("cursor", s => (s.link) ? 'pointer' : 'default')
        .each(function(s) {
          const seg = d3.select(this);
          if (s.math) {
            seg.style("font-family", "serif, STIXGeneral, 'Times New Roman'").text(renderMathToUnicode(s.text));
            if (!s.subscript && !s.superscript) seg.style("font-size", fontSize*1.1+'px');
          }
          if (s.highlight) {
            seg.style("fill", RendererColors.inline.highlightText).style("font-weight", "semibold")
              .style("stroke", RendererColors.inline.highlightFill).style("stroke-width", "2.5px")
              .style("stroke-opacity", 1).style("stroke-linecap", "round").style("stroke-linejoin", "round")
              .style("paint-order", "stroke fill");
          }
          if (s.keyboard) {
            seg.style("font-family", LAYOUT_CONFIG.NOTE_BLOCK.MONO_FONT);
            if (!isDark) seg.style("fill", depth === 0 ? '#e2e8f0' : ColorManager.getLinkColor(nodeFill));
            else seg.style("fill", RendererColors.inline.kbdDark);
          }
        });
    });
  })
  .attr("font-size", d => getNoteBlockFontSize(d.depth || 0) + "px")
  .attr("font-weight", d => getNoteBlockFontWeight(d.depth || 0))
  .attr("fill", d => isDark ? (d.depth === 0 ? RendererColors.node.rootTextDark : 'white') : 'white');

  update.each(function(d) {
    const image = d.image;
    const container = d3.select(this).select("g.image-container");
    if (!image) { container.attr("opacity", 0); return; }

    const width = d.width || 0, height = d.height || 0;
    const imgW = image.thumbWidth || 0, imgH = image.thumbHeight || 0;
    let rectX = getRectX(d, width);

    container.attr("opacity", 1).attr("transform", "translate(" + (rectX+(width-imgW)/2) + "," + (-height/2+PADDING) + ")");
    container.select("image")
      .attr("width", imgW).attr("height", imgH)
      .attr("href", image.failed ? '' : image.url)
      .attr("opacity", image.failed ? 0 : 1);

    const errData = image.failed ? [image] : [];
    const errSel = container.selectAll("g.error-placeholder").data(errData);
    errSel.exit().remove();
    const errEnter = errSel.enter().append("g").attr("class", "error-placeholder");
    errEnter.append("rect").attr("width", imgW).attr("height", imgH).attr("rx", 4).attr("fill", isDark ? '#450a0a' : '#fef2f2').attr("stroke", "#ef4444").attr("stroke-width", 1);
    errEnter.append("text").attr("x", imgW/2).attr("y", imgH/2).attr("text-anchor", "middle").attr("dominant-baseline", "central").attr("fill", "#ef4444").style("font-size", "10px").style("font-weight", "bold").text("404");
  });

  update.select("clipPath rect")
    .attr("width", d => d.width || 0).attr("height", d => d.height || 0)
    .attr("x", function(d) {
      const w = d.width || 0;
      const dir = getDir(d);
      if (isVertical || dir === 0) return -w/2;
      return dir === -1 ? -w : 0;
    })
    .attr("y", d => -(d.height || 0)/2);

  update.select("rect.node-bg")
    .attr("rx", 6).attr("ry", 6)
    .attr("width", d => d.width || 0).attr("height", d => d.height || 0)
    .attr("x", d => {
      const w = d.width || 0;
      return getRectX(d, w);
    })
    .attr("y", d => -(d.height || 0)/2)
    .attr("fill", d => {
      if (isDark) return d.depth === 0 ? RendererColors.node.rootFillDark : ColorManager.getThemeShade(d.color, true) || RendererColors.node.branchFallbackDark;
      return d.depth === 0 ? RendererColors.node.rootFillLight : d.color || RendererColors.node.branchFallbackLight;
    })
    .style("stroke", "none")
    .attr("stroke-width", 0);

  const indicator = update.selectAll("circle.collapsible-indicator")
    .data(d => d.children && d.children.length > 0 ? [d] : [], d => d.id);
  indicator.exit().remove();

  indicator.enter().append("circle").attr("class", "collapsible-indicator")
    .attr("r", 6).attr("stroke-width", 2)
    .on("mouseover", function() { d3.select(this).attr("r", 8); })
    .on("mouseout", function() { d3.select(this).attr("r", 6); })
    .on("click", (e, d) => { e.stopPropagation(); toggleNode(d); })
    .merge(indicator)
    .attr("cx", d => {
      if (isVertical) return 0;
      const w = d.width || 0, dir = getDir(d);
      if (dir === 0) {
        const hasRight = d.children?.some(c => { const cp = posMap.get(c.id); return cp && cp.direction === 1; });
        const hasLeft = d.children?.some(c => { const cp = posMap.get(c.id); return cp && cp.direction === -1; });
        if (hasRight) return w/2;
        if (hasLeft) return -w/2;
        return w/2;
      }
      return dir === -1 ? -w : w;
    })
    .attr("cy", d => {
      if (!isVertical) return 0;
      const h = d.height || 0, pos = posMap.get(d.id);
      const fc = d.children?.[0], cp = fc ? posMap.get(fc.id) : null;
      return cp && cp.y < pos.y ? -h/2 : h/2;
    })
    .style("stroke", d => {
      const dir = getDir(d);
      if (!isDark) return dir === 0 ? RendererColors.border.rootLight : RendererColors.border.branchLight;
      return dir === 0 ? RendererColors.border.rootDark : RendererColors.border.branchDark;
    })
    .attr("fill", d => {
      if (d.collapsed) return 'white';
      if (isDark) return d.depth === 0 ? RendererColors.node.rootFillDark : ColorManager.getThemeShade(d.color, true) || RendererColors.node.branchFallbackDark;
      return d.depth === 0 ? RendererColors.node.rootFillLight : d.color || RendererColors.node.branchFallbackLight;
    });

  update.each(function(d) { renderNoteBlocks(d3.select(this), d); });
}

function renderNoteBlocks(nodeGroup, d) {
  var BS = String.fromCharCode(92);
  const NB = LAYOUT_CONFIG.NOTE_BLOCK;
  const width = d.width || 0, height = d.height || 0, depth = d.depth || 0;
  const codeBlocks = d.codeBlocks || [], quoteBlocks = d.quoteBlocks || [], tableBlocks = d.tableBlocks || [];
  if (codeBlocks.length === 0 && quoteBlocks.length === 0 && tableBlocks.length === 0) { nodeGroup.selectAll("g.note-blocks").remove(); return; }

  const pos = posMap.get(d.id);
  let rectX = getRectX(d, width);

  const displayContent = d.displayContent || '';
  const hasText = d.hasText;
  const img = d.image;
  const imgH = (img && img.thumbHeight > 0) ? img.thumbHeight : 0;

  let blockY = -height/2 + PADDING + (d.displayLines || []).reduce((sum, line) => {
    const segs = parseMarkdownLine(line);
    return sum + segs.reduce((m, s) => Math.max(m, s.heading ? getHeadingLineHeight(s.heading) : getNoteBlockLineHeight(depth)), 0) || getNoteBlockLineHeight(depth);
  }, 0);
  if (hasText || img) blockY += NB.PILL_GAP;
  if (img) blockY += imgH + LAYOUT_CONFIG.IMAGE.PADDING;

  let blocksGroup = nodeGroup.select("g.note-blocks");
  if (blocksGroup.empty()) blocksGroup = nodeGroup.append("g").attr("class", "note-blocks").attr("clip-path", "url(#clip-" + d.id + ")");
  else blocksGroup.attr("clip-path", "url(#clip-" + d.id + ")");

  const allBlocks = [
    ...codeBlocks.map((b, i) => ({ ref: b, type: 'code', id: 'code-' + i })),
    ...quoteBlocks.map((b, i) => ({ ref: b, type: 'quote', id: 'quote-' + i })),
    ...tableBlocks.map((b, i) => ({ ref: b, type: 'table', id: 'table-' + i }))
  ];

  const blockSel = blocksGroup.selectAll("g.note-block").data(allBlocks, b => b.id);
  blockSel.exit().remove();

  let currentY = blockY;
  const blockPositions = new Map();
  const innerW = width - PADDING * 2;

  allBlocks.forEach(block => {
    blockPositions.set(block.id, currentY);
    const isExpanded = block.ref.expanded;
    if (!isExpanded) { currentY += NB.PILL_HEIGHT + NB.PILL_GAP; }
    else if (block.type === 'table') {
      let th = NB.TABLE_HEADER_HEIGHT + NB.TABLE_V_PADDING * 2;
      const cw = block.ref.colWidths || [];
      if (block.ref.headers?.length) {
        let ml = 1;
        block.ref.headers.forEach((h, i) => { ml = Math.max(ml, (h||'').split(new RegExp(BS+'r?'+BS+'n','g')).length); });
        th += NB.TABLE_HEADER_HEIGHT + (ml-1)*NB.TABLE_LINE_HEIGHT;
      }
      block.ref.rows?.forEach(row => { let ml = 1; row.forEach(() => { ml = Math.max(ml, 1); }); th += NB.TABLE_ROW_HEIGHT + (ml-1)*NB.TABLE_LINE_HEIGHT; });
      currentY += th + NB.PILL_GAP;
    } else {
      const lineH = block.type === 'code' ? NB.CODE_LINE_HEIGHT : NB.QUOTE_LINE_HEIGHT;
      const bff = block.type === 'code' ? NB.MONO_FONT.replace(new RegExp("'", 'g'),"") : 'Inter, sans-serif';
      const wrapW = NB.MAX_WIDTH - (block.type === 'code' ? 16 : 24);
      const raw = block.type === 'code' ? block.ref.code : block.ref.text;
      const mFn3 = (t, f) => { if (measureCtx) { measureCtx.font = f; return measureCtx.measureText(t).width; } return t.length * (lineH * 0.6); };
      const lines = (raw||'').split(new RegExp(BS+'r?'+BS+'n','g')).flatMap(l => wrapText(l, wrapW, lineH, 'normal', mFn3, bff, block.type === 'code'));
      const vPad = block.type === 'code' ? NB.CODE_V_PADDING : NB.QUOTE_V_PADDING;
      currentY += NB.CODE_HEADER_HEIGHT + vPad + lines.length * lineH + vPad + NB.PILL_GAP;
    }
  });

  const enter = blockSel.enter().append("g").attr("class", b => "note-block note-block-" + b.type).attr("opacity", 1);
  const update = enter.merge(blockSel);

  const pillBg = isDark ? RendererColors.noteBlock.pillBgDark : RendererColors.noteBlock.pillBgLight;
  const pillText = isDark ? RendererColors.noteBlock.pillTextDark : RendererColors.noteBlock.pillTextLight;
  const expandedBg = isDark ? RendererColors.noteBlock.expandedBgDark : RendererColors.noteBlock.expandedBgLight;
  const codeLang = isDark ? RendererColors.noteBlock.codeLangDark : RendererColors.noteBlock.codeLangLight;
  const quoteAccent = isDark ? RendererColors.noteBlock.quoteAccentDark : RendererColors.noteBlock.quoteAccentLight;
  const quoteTextC = isDark ? RendererColors.noteBlock.quoteTextDark : RendererColors.noteBlock.quoteTextLight;

  update.attr("transform", b => "translate(" + (rectX+PADDING) + "," + (blockPositions.get(b.id) || blockY) + ")")
    .each(function(block) {
      const bg = d3.select(this).selectAll("rect.block-bg").data([block]);
      bg.exit().remove();
      const bgEnter = bg.enter().append("rect").attr("class", "block-bg").attr("rx", 4).attr("ry", 4);
      const bgUpdate = bgEnter.merge(bg);
      const isExpanded = block.ref.expanded;
      let expandedH = NB.PILL_HEIGHT;
      if (isExpanded && block.type === 'table') {
        let th = NB.TABLE_HEADER_HEIGHT + NB.TABLE_V_PADDING * 2;
        if (block.ref.headers?.length) th += NB.TABLE_HEADER_HEIGHT;
        block.ref.rows?.forEach(() => { th += NB.TABLE_ROW_HEIGHT; });
        expandedH = th;
      } else if (isExpanded && block.type !== 'table') {
        const lineH = block.type === 'code' ? NB.CODE_LINE_HEIGHT : NB.QUOTE_LINE_HEIGHT;
        const bff = block.type === 'code' ? NB.MONO_FONT.replace(new RegExp("'", 'g'),"") : 'Inter, sans-serif';
        const wrapW = NB.MAX_WIDTH - (block.type === 'code' ? 16 : 24);
        const raw = block.type === 'code' ? block.ref.code : block.ref.text;
        const mFn4 = (t, f) => { if (measureCtx) { measureCtx.font = f; return measureCtx.measureText(t).width; } return t.length * (lineH * 0.6); };
        const lines = (raw||'').split(new RegExp(BS+'r?'+BS+'n','g')).flatMap(l => wrapText(l, wrapW, lineH, 'normal', mFn4, bff, block.type === 'code'));
        const vPad = block.type === 'code' ? NB.CODE_V_PADDING : NB.QUOTE_V_PADDING;
        expandedH = NB.CODE_HEADER_HEIGHT + vPad + lines.length * lineH + vPad;
      }
      bgUpdate.attr("width", innerW).attr("height", expandedH).attr("fill", isExpanded ? expandedBg : pillBg)
        .style("cursor", "pointer").on("click", (e) => { e.stopPropagation(); block.ref.expanded = !isExpanded; updateBlocks(); });

      const pillData = !isExpanded ? [block] : [];
      const pill = d3.select(this).selectAll("g.pill-content").data(pillData);
      pill.exit().remove();
      const pillEnter = pill.enter().append("g").attr("class", "pill-content");
      pillEnter.append("text").attr("class", "caret").attr("x", 10).attr("y", NB.PILL_HEIGHT/2).attr("font-size", "9px").attr("fill", pillText).attr("dominant-baseline", "central").style("pointer-events", "none").text("▶");
      pillEnter.append("text").attr("class", "label").attr("x", 26).attr("y", NB.PILL_HEIGHT/2).attr("font-size", "10px").attr("dominant-baseline", "central").style("pointer-events", "none");
      pillEnter.append("text").attr("class", "count").attr("x", innerW-8).attr("y", NB.PILL_HEIGHT/2).attr("text-anchor", "end").attr("font-size", "9px").attr("fill", pillText).attr("dominant-baseline", "central").style("pointer-events", "none");
      const pillUpdate = pillEnter.merge(pill);
      pillUpdate.select("text.label")
        .attr("font-family", block.type === 'code' ? NB.MONO_FONT : 'Inter, sans-serif')
        .attr("font-style", block.type === 'quote' ? 'italic' : 'normal')
        .attr("fill", block.type === 'table' ? RendererColors.noteBlock.tableAccent : (block.type === 'code' ? codeLang : quoteAccent))
        .text(block.type === 'code' ? (block.ref.language || 'code') : block.type);
      pillUpdate.select("text.count")
        .text(block.type === 'table' ? (block.ref.rows?.length||0) + ' row' + ((block.ref.rows?.length||0) !== 1 ? 's' : '') : ((block.type === 'code' ? block.ref.code : block.ref.text || '').split(String.fromCharCode(10)).length) + ' line' + ((block.type === 'code' ? block.ref.code : block.ref.text || '').split(String.fromCharCode(10)).length !== 1 ? 's' : ''));

      const headerData = isExpanded ? [block] : [];
      const header = d3.select(this).selectAll("g.block-header").data(headerData);
      header.exit().remove();
      const headerEnter = header.enter().append("g").attr("class", "block-header");
      const headerH = block.type === 'table' ? NB.TABLE_HEADER_HEIGHT : NB.CODE_HEADER_HEIGHT;
      headerEnter.append("path").attr("class", "header-bg");
      headerEnter.append("text").attr("class", "caret").attr("x", 10).attr("y", headerH/2).attr("font-size", "9px").attr("fill", pillText).attr("dominant-baseline", "central").style("pointer-events", "none").text("▼");
      headerEnter.append("text").attr("class", "label").attr("x", 26).attr("y", headerH/2).attr("font-size", "10px").attr("dominant-baseline", "central").style("pointer-events", "none");
      const headerUpdate = headerEnter.merge(header);
      headerUpdate.select("path.header-bg")
        .attr("d", "M 0 4 Q 0 0 4 0 L " + (innerW-4) + " 0 Q " + innerW + " 0 " + innerW + " 4 L " + innerW + " " + headerH + " L 0 " + headerH + " Z")
        .attr("fill", isDark ? RendererColors.noteBlock.headerBgDark : RendererColors.noteBlock.headerBgLight)
        .style("cursor", "pointer").on("click", (e) => { e.stopPropagation(); block.ref.expanded = false; updateBlocks(); });
      headerUpdate.select("text.label")
        .attr("font-family", block.type === 'code' ? NB.MONO_FONT : 'Inter, sans-serif')
        .attr("font-style", block.type === 'quote' ? 'italic' : 'normal')
        .attr("fill", block.type === 'table' ? RendererColors.noteBlock.tableAccent : (block.type === 'code' ? codeLang : quoteAccent))
        .text(block.type === 'code' ? (block.ref.language || 'code') : block.type);

      if (isExpanded && block.type !== 'table') {
        const lineH = block.type === 'code' ? NB.CODE_LINE_HEIGHT : NB.QUOTE_LINE_HEIGHT;
        const bff = block.type === 'code' ? NB.MONO_FONT.replace(new RegExp("'", 'g'),"") : 'Inter, sans-serif';
        const wrapW = NB.MAX_WIDTH - (block.type === 'code' ? 16 : 24);
        const raw = block.type === 'code' ? block.ref.code : block.ref.text;
        const mFn5 = (t, f) => { if (measureCtx) { measureCtx.font = f; return measureCtx.measureText(t).width; } return t.length * (lineH * 0.6); };
        const contentLines = (raw||'').split(new RegExp(BS+'r?'+BS+'n','g')).flatMap(l => wrapText(l, wrapW, lineH, 'normal', mFn5, bff, block.type === 'code'));
        const vPad = block.type === 'code' ? NB.CODE_V_PADDING : NB.QUOTE_V_PADDING;

        const content = d3.select(this).selectAll("text.block-content").data([block]);
        content.exit().remove();
        const contentEnter = content.enter().append("text").attr("class", "block-content").attr("x", 0).attr("y", 0);
        const contentUpdate = contentEnter.merge(content);
        contentUpdate.attr("font-family", block.type === 'code' ? NB.MONO_FONT : 'Inter, sans-serif')
          .attr("font-size", lineH + "px")
          .attr("font-style", block.type === 'quote' ? 'italic' : 'normal')
          .attr("fill", block.type === 'code' ? (isDark ? RendererColors.noteBlock.codeTextDark : RendererColors.noteBlock.codeTextLight) : quoteTextC)
          .style("white-space", "pre");
        const tspans = contentUpdate.selectAll("tspan").data(contentLines);
        tspans.join("tspan")
          .attr("x", block.type === 'code' ? 8 : (NB.QUOTE_BORDER_WIDTH + 8))
          .attr("dy", (l, i) => i === 0 ? (headerH + vPad + lineH/2) : lineH)
          .attr("dominant-baseline", "central")
          .text(l => l.length === 0 ? '\\u00A0' : l);
      } else {
        d3.select(this).selectAll("text.block-content").remove();
      }

      if (isExpanded && block.type === 'table') {
        const table = d3.select(this).selectAll("g.table-content").data([block]);
        table.exit().remove();
        const tableEnter = table.enter().append("g").attr("class", "table-content");
        const tableUpdate = tableEnter.merge(table);
        tableUpdate.each(function(b) {
          const tg = d3.select(this);
          tg.selectAll("*").remove();
          const defs = tg.append("defs");
          let clipCount = 0;
          const headers = b.ref.headers || [], rows = b.ref.rows || [], alignments = b.ref.alignments || [];
          const colCount = Math.max(headers.length, ...rows.map(r => r.length));
          const getCellLines = (txt, mw) => {
            const NL = String.fromCharCode(10);
            const raw = (txt||'').replace(new RegExp('<br'+BS+'s*'+BS+'/?>','gi'),NL).replace(new RegExp(BS+BS+'n','g'),NL).replace(new RegExp(BS+BS+'t','g'),'    ').replace(new RegExp(BS+'t','g'),'    ').split(new RegExp(BS+'r?'+BS+'n','g'));
            if (mw === undefined) return raw;
            const mFn = (t, f) => { if (measureCtx) { measureCtx.font = f; return measureCtx.measureText(t).width; } return t.length * (NB.TABLE_LINE_HEIGHT * 0.6); };
            return raw.flatMap(l => wrapText(l, Math.max(10, mw), NB.TABLE_LINE_HEIGHT, 'normal', mFn, 'Inter, sans-serif'));
          };

          const rawCols = new Array(colCount).fill(0);
          const allRows = headers.length > 0 ? [headers, ...rows] : rows;
          allRows.forEach(row => {
            (row || []).forEach((cell, ci) => {
              if (ci >= colCount) return;
              const lines = getCellLines(cell);
              lines.forEach(l => {
                let w = l.length * NB.TABLE_LINE_HEIGHT * 0.55;
                if (measureCtx) {
                  measureCtx.font = NB.TABLE_LINE_HEIGHT + 'px Inter, sans-serif';
                  w = measureCtx.measureText(l).width;
                }
                rawCols[ci] = Math.max(rawCols[ci], w + 18);
              });
            });
          });
          const totalRawW = rawCols.reduce((s, w) => s + w, 0);
          const finalColWidths = totalRawW > 0
            ? rawCols.map(w => w * innerW / totalRawW)
            : new Array(colCount).fill(innerW / colCount);
          let runningY = headerH + NB.TABLE_V_PADDING;
          const startY = runningY;

          const drawRow = (data, isHeader) => {
            let currentX = 0;
            let maxLinesInRow = 1;
            const wrappedCells = data.map((cell, i) => {
               const lines = getCellLines(cell, finalColWidths[i] - 18);
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
              const cellStartY = runningY + (rowH - (numLines-1)*NB.TABLE_LINE_HEIGHT) / 2;

              const clipId = 'tc-' + d.id + '-' + (clipCount++);
              defs.append("clipPath").attr("id", clipId).append("rect")
                .attr("x", currentX).attr("y", runningY).attr("width", cw + NB.TABLE_CELL_HPADDING).attr("height", rowH);
              const cellG = tg.append("g").attr("clip-path", "url(#" + clipId + ")");

              lines.forEach((line, li) => {
                let textX = currentX + NB.TABLE_CELL_HPADDING;
                if (align === 'center') textX = currentX + cw/2;
                else if (align === 'right') textX = currentX + cw - NB.TABLE_CELL_HPADDING;
                const lineY = cellStartY + li * NB.TABLE_LINE_HEIGHT;
                const textEl = cellG.append("text").attr("x", textX).attr("y", lineY)
                  .attr("font-size", NB.TABLE_LINE_HEIGHT + "px")
                  .attr("fill", isHeader ? (isDark ? RendererColors.noteBlock.tableHeaderDark : RendererColors.noteBlock.tableHeaderLight) : (isDark ? RendererColors.noteBlock.tableCellDark : RendererColors.noteBlock.tableCellLight))
                  .attr("text-anchor", align === 'center' ? 'middle' : align === 'right' ? 'end' : 'start')
                  .attr("dominant-baseline", "central");
                const segs = parseMarkdownLine(line);
                segs.forEach(seg => {
                  textEl.append("tspan").text(seg.text)
                    .style("font-weight", (isHeader || seg.bold) ? 'bold' : 'normal')
                    .style("font-style", seg.italic ? 'italic' : 'normal')
                    .style("text-decoration", seg.strikethrough ? 'line-through' : (seg.underline || seg.link ? 'underline' : 'none'))
                    .style("fill", seg.link ? ColorManager.getLinkColor(d.color || RendererColors.node.branchFallbackLight) : (seg.highlight ? RendererColors.inline.highlightText : ''));
                });
              });
              currentX += cw;
            });

            if (isHeader) {
              tg.append("line").attr("x1", 0).attr("y1", runningY + rowH).attr("x2", innerW).attr("y2", runningY + rowH)
                .attr("stroke", isDark ? RendererColors.noteBlock.tableDividerDark : RendererColors.noteBlock.tableDividerLight).attr("stroke-width", 1.5);
            }
            runningY += rowH;
          };

          if (headers.length > 0) drawRow(headers, true);
          rows.forEach(r => drawRow(r, false));

          let runningX = 0;
          finalColWidths.forEach((cw, i) => {
            if (i === finalColWidths.length - 1) return;
            runningX += cw;
            tg.append("line").attr("x1", runningX).attr("y1", startY).attr("x2", runningX).attr("y2", runningY)
              .attr("stroke", isDark ? RendererColors.noteBlock.tableDividerDark : RendererColors.noteBlock.tableDividerLight)
              .attr("stroke-width", 1).style("stroke-dasharray", "2,2").attr("opacity", 0.5);
          });
          bgUpdate.attr("height", runningY + NB.TABLE_V_PADDING);
        });
      } else {
        d3.select(this).selectAll("g.table-content").remove();
      }
    });
}

function toggleNode(d) { d.collapsed = !d.collapsed; updateBlocks(); }
function updateBlocks() { render(); }
function expandAll() { (function ex(n) { n.collapsed = false; n.children?.forEach(ex); })(treeData); render(); }
function collapseAll() { (function col(n, d) { n.collapsed = d >= 1; n.children?.forEach(c => col(c, d+1)); })(treeData, 0); render(); }

function fitView() {
  const bounds = g.node().getBBox();
  if (bounds.width === 0) return;
  const w = window.innerWidth, h = window.innerHeight;
  const s = 0.85 / Math.max(bounds.width/w, bounds.height/h);
  svg.transition().duration(750).call(zoom.transform, d3.zoomIdentity
    .translate(w/2, h/2).scale(Math.min(s, 2))
    .translate(-(bounds.x + bounds.width/2), -(bounds.y + bounds.height/2)));
}

function zoomIn() { svg.transition().call(zoom.scaleBy, 1.4); }
function zoomOut() { svg.transition().call(zoom.scaleBy, 0.7); }

function toggleTheme() {
  isDark = !isDark;
  document.body.className = isDark ? 'dark' : 'light';
  render();
}

async function exportPNG() {
  const MAX_CANVAS_DIM = 16384;
  const MAX_CANVAS_AREA = MAX_CANVAS_DIM * MAX_CANVAS_DIM;
  const idealScale = 4.0, padding = 100;

  const currT = g.attr("transform");
  g.attr("transform", null);
  const bb = g.node().getBBox();
  g.attr("transform", currT);

  if (bb.width === 0 || bb.height === 0) {
    alert("Nothing to export — the mind map appears empty.");
    return;
  }

  const contentW = bb.width + padding * 2;
  const contentH = bb.height + padding * 2;

  const maxScaleByDim = Math.min(MAX_CANVAS_DIM / contentW, MAX_CANVAS_DIM / contentH);
  const maxScaleByArea = Math.sqrt(MAX_CANVAS_AREA / (contentW * contentH));
  const scale = Math.min(idealScale, maxScaleByDim, maxScaleByArea);

  const canvasW = Math.max(1, Math.round(contentW * scale));
  const canvasH = Math.max(1, Math.round(contentH * scale));

  const canvas = document.createElement("canvas");
  canvas.width = canvasW;
  canvas.height = canvasH;
  const ctx = canvas.getContext("2d");
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";

  const clone = svg.node().cloneNode(true);
  const styleEl = document.createElementNS("http://www.w3.org/2000/svg", "style");
  styleEl.textContent = document.querySelector("style").textContent;
  clone.insertBefore(styleEl, clone.firstChild);
  clone.querySelectorAll("path").forEach(p => p.style.fill = "none");

  const imageTasks = [];
  clone.querySelectorAll("image").forEach((img) => {
    const href = img.getAttribute("href") || img.getAttribute("xlink:href");
    if (!href || href.startsWith("data:")) return;
    imageTasks.push(
      fetch(href)
        .then(r => r.ok ? r.blob() : Promise.reject())
        .then(blob => new Promise((res) => {
          const reader = new FileReader();
          reader.onload = () => { img.setAttribute("href", reader.result); res(null); };
          reader.onerror = () => res(null);
          reader.readAsDataURL(blob);
        }))
        .catch(() => { /* leave original href if inlining fails */ })
    );
  });
  await Promise.all(imageTasks);

  const cg = clone.querySelector("g");
  cg.setAttribute("transform", "translate(" + (-bb.x + padding) + "," + (-bb.y + padding) + ")");
  clone.setAttribute("width", contentW);
  clone.setAttribute("height", contentH);
  clone.removeAttribute("viewBox");

  await document.fonts.ready;

  const svgStr = new XMLSerializer().serializeToString(clone).replace(/&nbsp;/g, '&#160;');
  const svgBlob = new Blob([svgStr], { type: "image/svg+xml;charset=utf-8" });
  const url = URL.createObjectURL(svgBlob);

  const img = new Image();
  const cleanup = () => URL.revokeObjectURL(url);

  img.onerror = () => {
    cleanup();
    alert("Failed to render the mind map image. The map may be too large.");
  };

  img.onload = () => {
    cleanup();
    ctx.fillStyle = isDark ? "#1e1e1e" : "#f8fafc";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.save();
    ctx.scale(scale, scale);
    ctx.drawImage(img, 0, 0);
    ctx.restore();

    canvas.toBlob((blob) => {
      if (!blob || blob.size === 0) {
        alert("Export produced an empty file — the mind map may be too large.");
        return;
      }
      const a = document.createElement("a");
      a.download = "${title}.png";
      a.href = URL.createObjectURL(blob);
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 100);
    }, "image/png", 1.0);
  };

  img.src = url;
}

document.fonts.ready.then(() => {
  render();
  setTimeout(fitView, 150);
});
<\/script>
</body>
</html>`;
  }

  // ── Helper Methods ────────────────────────────────────────────────

  private collapseToDepth(node: TreeNode, maxDepth: number): TreeNode {
    const clone: TreeNode = {
      ...node,
      children: [],
      collapsed: false,
    };
    if (node.children && node.children.length > 0) {
      if (node.depth < maxDepth) {
        clone.children = node.children.map(c => this.collapseToDepth(c, maxDepth));
      } else {
        clone.collapsed = true;
        clone.children = node.children.map(c => this.collapseToDepth(c, maxDepth));
      }
    }
    return clone;
  }

  private stripCircular(node: TreeNode, parentId: string | null = null): any {
    return {
      id: node.id,
      parentId: parentId,
      content: node.content,
      color: node.color,
      depth: node.depth,
      displayContent: (node as any).metadata?.displayContent ?? node.content,
      image: node.metadata?.image
        ? (() => {
            const i = node.metadata.image;
            console.log(`[Export] stripCircular image: url=${i.url?.substring(0, 40)} w=${i.width} h=${i.height} failed=${(i as any).failed}`);
            return {
              url: i.url,
              alt: i.alt,
              link: i.link,
              width: i.width,
              height: i.height,
              thumbWidth: i.thumbWidth,
              thumbHeight: i.thumbHeight,
              failed: (i as any).failed,
            };
          })()
        : null,
      codeBlocks:
        node.metadata?.codeBlocks?.map((b: any) => ({
          expanded: false,
          code: b.code,
          language: b.language,
        })) || [],
      quoteBlocks:
        node.metadata?.quoteBlocks?.map((b: any) => ({
          expanded: false,
          text: b.text,
        })) || [],
      tableBlocks:
        node.metadata?.tableBlocks?.map((b: any) => ({
          expanded: false,
          headers: b.headers,
          rows: b.rows,
          alignments: b.alignments,
          colWidths: b.colWidths,
        })) || [],
      collapsed: node.collapsed || false,
      children: node.children ? node.children.map((c) => this.stripCircular(c, node.id)) : [],
    };
  }

  private async inlineTreeImages(node: TreeNode): Promise<void> {
    const img = node.metadata?.image;
    if (img && img.url && !img.url.startsWith('data:')) {
      const dataUrl = await this.imageToDataURL(img.url);
      if (dataUrl) {
        img.url = dataUrl;
      } else {
        console.warn(`[Export] Could not inline image for node ${node.id}: ${img.url}`);
      }
    }
    for (const child of node.children) {
      await this.inlineTreeImages(child);
    }
  }

  public async waitForImageDimensions(node: TreeNode): Promise<void> {
    const nodesWithImages: TreeNode[] = [];
    const walk = (n: TreeNode) => {
      if (n.metadata?.image) nodesWithImages.push(n);
      n.children.forEach(walk);
    };
    walk(node);

    if (nodesWithImages.length === 0) return;

    console.log(`[Export] Waiting for ${nodesWithImages.length} image(s) to load dimensions...`);

    const tasks = nodesWithImages.map(async (n) => {
      const img = n.metadata!.image!;
      if (!img.url || img.url.startsWith('data:') || (img.width && img.height)) return;

      try {
        const image = new Image();
        image.crossOrigin = 'anonymous';
        await new Promise<void>((resolve, reject) => {
          image.onload = () => resolve();
          image.onerror = () => reject(new Error('load failed'));
          image.src = img.url;
        });
        if (image.naturalWidth && image.naturalHeight) {
          img.width = image.naturalWidth;
          img.height = image.naturalHeight;
          img.aspect = image.naturalWidth / image.naturalHeight;
          (img as any).failed = false;
        }
      } catch {
        try {
          const image = new Image();
          await new Promise<void>((resolve, reject) => {
            image.onload = () => resolve();
            image.onerror = () => reject(new Error('load failed'));
            image.src = img.url;
          });
          if (image.naturalWidth && image.naturalHeight) {
            img.width = image.naturalWidth;
            img.height = image.naturalHeight;
            img.aspect = image.naturalWidth / image.naturalHeight;
            (img as any).failed = false;
          }
        } catch {
          (img as any).failed = true;
        }
      }
    });

    await Promise.all(tasks);

    nodesWithImages.forEach(n => {
      const img = n.metadata!.image!;
      console.log(`[Export] Image ${img.url?.substring(0, 60)}: w=${img.width} h=${img.height} failed=${(img as any).failed}`);
    });
  }

  public async imageToDataURL(url: string): Promise<string | null> {
    if (url.startsWith('data:')) return url;

    try {
      const absoluteUrl = new URL(url, window.location.href).href;
      const response = await fetch(absoluteUrl);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const blob = await response.blob();
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = () => resolve(null);
        reader.readAsDataURL(blob);
      });
    } catch {
      try {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        await new Promise<void>((resolve, reject) => {
          img.onload = () => resolve();
          img.onerror = () => reject(new Error('Image load failed'));
          img.src = url;
        });
        if (!img.naturalWidth || !img.naturalHeight) return null;
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        const ctx = canvas.getContext('2d');
        if (!ctx) return null;
        ctx.drawImage(img, 0, 0);
        return canvas.toDataURL('image/png');
      } catch {
        console.error(`[Export] Failed to inline image: ${url}`);
        return null;
      }
    }
  }
}
