/**
 * Feature: Web Export Manager
 * Purpose: Handles application of export logic for various formats (HTML, SVG, PNG)
 * Dependencies: RendererAdapter, TreeNode, D3.js
 */

import { TreeNode, ExportFormat } from '@/core/types';

/**
 * Handles web-specific export operations
 */
export class WebExportManager {
  /**
   * Export the current mind map to HTML
   * Includes embedded CSS and minimalist standalone SVG
   */
  public exportToHTML(svgContent: string, title: string): string {
    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>${title}</title>
    <style>
        body, html { margin: 0; padding: 0; width: 100%; height: 100%; overflow: hidden; background: #f8fafc; }
        .container { display: flex; align-items: center; justify-content: center; width: 100%; height: 100%; }
        svg { max-width: 100%; max-height: 100%; }
    </style>
</head>
<body>
    <div class="container">
        ${svgContent}
    </div>
</body>
</html>`;
  }

  /**
   * Export to PNG via temporary canvas conversion
   */
  public async exportToPNG(svgElement: SVGSVGElement, background: 'transparent' | 'white'): Promise<Blob> {
    return new Promise((resolve, reject) => {
      const svgData = new XMLSerializer().serializeToString(svgElement);
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();

      const svgSize = svgElement.getBBox();
      canvas.width = Math.max(svgSize.width, 1920);
      canvas.height = Math.max(svgSize.height, 1080);

      img.onload = () => {
        if (!ctx) return reject(new Error('Canvas context not available'));
        
        if (background === 'white') {
          ctx.fillStyle = 'white';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
        }
        
        ctx.drawImage(img, 0, 0);
        canvas.toBlob((blob) => {
          if (blob) resolve(blob);
          else reject(new Error('PNG conversion failed'));
        }, 'image/png');
      };

      img.onerror = () => reject(new Error('Image loading failed'));
      img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
    });
  }
}
