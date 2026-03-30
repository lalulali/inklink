/**
 * Feature: Web Export Manager
 * Purpose: Handles application of export logic for various formats (HTML, PNG)
 * Style: High-fidelity standalone experience using core app logic
 */

import { TreeNode } from '@/core/types';

export class WebExportManager {
  /**
   * Helper to prepare an SVG clone with embedded CSS
   */
  private prepareSVG(svgElement: SVGSVGElement): SVGSVGElement {
    const clone = svgElement.cloneNode(true) as SVGSVGElement;
    
    // Embed document styles
    const styles = Array.from(document.styleSheets)
      .map(sheet => {
        try {
          return Array.from(sheet.cssRules).map(rule => rule.cssText).join("");
        } catch (e) { return ""; }
      })
      .join("\n");
      
    const styleElement = document.createElementNS("http://www.w3.org/2000/svg", "style");
    styleElement.textContent = styles;
    clone.prepend(styleElement);
    
    // Reset transform to get natural bounding box
    const mainG = svgElement.querySelector('g');
    const transform = mainG?.getAttribute('transform');
    mainG?.removeAttribute('transform');
    const bbox = svgElement.getBBox();
    if (transform) mainG?.setAttribute('transform', transform);

    const padding = 100;
    clone.setAttribute("width", (bbox.width + padding * 2).toString());
    clone.setAttribute("height", (bbox.height + padding * 2).toString());
    clone.setAttribute("viewBox", `${bbox.x - padding} ${bbox.y - padding} ${bbox.width + padding * 2} ${bbox.height + padding * 2}`);
    
    return clone;
  }

  /**
   * Export to high-fidelity standalone HTML
   */
  public exportToHTML(root: TreeNode, title: string, layoutDirection: string = 'two-sided'): string {
    const jsonTree = JSON.stringify(this.stripCircular(root));

    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>${title} | Inklink Interactive</title>
    <script src="https://d3js.org/d3.v7.min.js"></script>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
    <style>
        :root {
            --bg: #f8fafc;
            --fg: #0f172a;
            --primary: #3b82f6;
            --card-bg: white;
            --border: #e2e8f0;
        }
        @media (prefers-color-scheme: dark) {
            :root {
                --bg: #1e1e1e;
                --fg: #f1f5f9;
                --card-bg: #2d2d2d;
                --border: #444;
            }
        }
        body, html { margin: 0; padding: 0; width: 100%; height: 100%; overflow: hidden; background: var(--bg); font-family: 'Inter', sans-serif; color: var(--fg); }
        #canvas { width: 100%; height: 100%; cursor: grab; }
        #canvas:active { cursor: grabbing; }
        
        .nav-container {
            position: fixed;
            bottom: 32px;
            left: 50%;
            transform: translateX(-50%);
            display: flex;
            align-items: center;
            gap: 12px;
            padding: 10px 16px;
            background: rgba(255, 255, 255, 0.85);
            backdrop-filter: blur(12px);
            border: 1px solid var(--border);
            border-radius: 12px;
            box-shadow: 0 10px 25px -5px rgba(0,0,0,0.1);
            z-index: 1000;
        }
        @media (prefers-color-scheme: dark) {
            .nav-container { background: rgba(30, 30, 30, 0.85); }
        }
        
        .btn-group { display: flex; gap: 4px; }
        .btn {
            display: flex;
            align-items: center;
            justify-content: center;
            height: 32px;
            padding: 0 12px;
            border-radius: 8px;
            border: 1px solid var(--border);
            background: var(--card-bg);
            color: var(--fg);
            cursor: pointer;
            transition: all 0.2s;
            font-size: 12px;
            font-weight: 600;
            white-space: nowrap;
        }
        .btn:hover { background: var(--primary); color: white; border-color: var(--primary); }
        .btn.icon { width: 32px; padding: 0; font-size: 16px; }
        .btn.primary { background: var(--primary); color: white; border-color: var(--primary); }
        
        .title-badge { position: fixed; top: 24px; left: 24px; padding: 5px 14px; border-radius: 8px; background: rgba(59, 130, 246, 0.1); border: 1px solid rgba(59, 130, 246, 0.2); color: #3b82f6; font-size: 11px; font-weight: 700; text-transform: uppercase; z-index: 10; font-family: monospace; }
        
        .node text { pointer-events: none; user-select: none; }
        .node rect { stroke-width: 1.5; cursor: pointer; }
        .link { fill: none; stroke-opacity: 0.6; stroke-width: 2.5; transition: stroke-opacity 0.2s; }
        .collapsible-indicator { cursor: pointer; transition: all 0.2s; stroke: #fff; }
    </style>
</head>
<body>
    <div class="title-badge">${title}</div>
    <div id="canvas"></div>

    <div class="nav-container">
        <div class="btn-group">
            <button class="btn" onclick="expandAll()">Expand All</button>
            <button class="btn" onclick="collapseAll()">Collapse All</button>
        </div>
        <div style="width: 1px; height: 16px; background: var(--border);"></div>
        <div class="btn-group">
            <button class="btn icon" onclick="zoomIn()">+</button>
            <button class="btn icon" onclick="zoomOut()">−</button>
            <button class="btn" onclick="fitView()">Fit Screen</button>
        </div>
        <div style="width: 1px; height: 16px; background: var(--border);"></div>
        <button class="btn primary" onclick="exportPNG()">Export Image</button>
    </div>

    <script>
        const treeData = ${jsonTree};
        const layoutDirection = "${layoutDirection}";
        const svg = d3.select("#canvas").append("svg").attr("width", "100%").attr("height", "100%");
        const g = svg.append("g");
        const linkLayer = g.append("g").attr("class", "links-layer");
        const nodeLayer = g.append("g").attr("class", "nodes-layer");

        const zoom = d3.zoom().scaleExtent([0.01, 20]).on("zoom", (e) => g.attr("transform", e.transform));
        svg.call(zoom);

        const CONFIG = {
            scale: 0.75,
            siblingSpacing: 25 * 0.75,
            levelSpacing: 80 * 0.75,
            animationDuration: 0
        };

        const ctx = document.createElement('canvas').getContext('2d');
        const posMap = new Map();

        function measureNode(node) {
            const depth = node.depth;
            const fontSize = (depth === 0 ? 22 : depth === 1 ? 17 : depth === 2 ? 14 : 12) * CONFIG.scale;
            const fontWeight = depth === 0 ? '700' : depth === 1 ? '600' : '500';
            const lineHeight = Math.round(fontSize * 1.25);
            
            ctx.font = \`\${fontWeight} \${fontSize}px Inter, sans-serif\`;
            const lines = node.data.content.split('\\n');
            let maxW = 0;
            lines.forEach(l => maxW = Math.max(maxW, ctx.measureText(l).width));
            
            node.width = maxW + (24 * CONFIG.scale);
            if (node.data.children?.length) {
                node.width += (10 * CONFIG.scale);
            }
            node.height = (lines.length * lineHeight) + (12 * CONFIG.scale);
            node.fontSize = fontSize;
            node.fontWeight = fontWeight;
            node.lineHeight = lineHeight;
        }

        function getSubtreeHeight(node) {
            if (node.collapsed || !node.children?.length) return node.height;
            let h = node.children.reduce((acc, c) => acc + getSubtreeHeight(c), 0);
            return Math.max(node.height, h + (node.children.length - 1) * CONFIG.siblingSpacing);
        }

        function calculateVerticalLayout(nodes, startX, centerY, direction) {
            if (!nodes?.length) return;
            const heights = nodes.map(n => getSubtreeHeight(n));
            const totalH = heights.reduce((a, b) => a + b, 0) + (nodes.length - 1) * CONFIG.siblingSpacing;
            let currentY = centerY - totalH / 2;

            nodes.forEach((node, i) => {
                const branchH = heights[i];
                const nodeY = currentY + branchH / 2;
                
                const finalX = direction === 1 ? startX : startX - node.width;
                posMap.set(node.data.id, { x: finalX, y: nodeY, direction });
                
                if (!node.collapsed && node.children?.length) {
                    const nextX = direction === 1 
                        ? finalX + node.width + CONFIG.levelSpacing 
                        : finalX - CONFIG.levelSpacing;
                    calculateVerticalLayout(node.children, nextX, nodeY, direction);
                }
                currentY += branchH + CONFIG.siblingSpacing;
            });
        }

        function update() {
            const root = d3.hierarchy(treeData, d => d.collapsed ? null : d.children);
            root.descendants().forEach(measureNode);
            
            posMap.clear();
            const rootX = -root.width / 2;
            posMap.set(root.data.id, { x: rootX, y: 0, direction: 1 });
            
            if (root.children) {
                if (layoutDirection === 'left-to-right') {
                    calculateVerticalLayout(root.children, rootX + root.width + CONFIG.levelSpacing, 0, 1);
                } else if (layoutDirection === 'right-to-left') {
                    calculateVerticalLayout(root.children, rootX - CONFIG.levelSpacing, 0, -1);
                } else {
                    // Two-sided logic (Right-heavy, stable indexing)
                    const leftChildren = [];
                    const rightChildren = [];
                    root.children.forEach((child, index) => {
                        if (index % 2 === 0) {
                            rightChildren.push(child);
                        } else {
                            leftChildren.push(child);
                        }
                    });
                    calculateVerticalLayout(leftChildren, rootX - CONFIG.levelSpacing, 0, -1);
                    calculateVerticalLayout(rightChildren, rootX + root.width + CONFIG.levelSpacing, 0, 1);
                }
            }

            const nodes = root.descendants();
            const links = root.links();

            const link = linkLayer.selectAll(".link").data(links, d => d.target.data.id);
            link.exit().remove();
            link.enter().append("path").attr("class", "link")
                .merge(link).transition().duration(CONFIG.animationDuration)
                .attr("stroke", d => d.target.data.color || "#3b82f6")
                .attr("d", d => {
                    const s = posMap.get(d.source.data.id);
                    const t = posMap.get(d.target.data.id);
                    const dir = t.direction;
                    const sX = dir === 1 ? s.x + d.source.width : s.x;
                    const tX = dir === 1 ? t.x : t.x + d.target.width;
                    const cpX = (sX + tX) / 2;
                    return \`M\${sX},\${s.y} C\${cpX},\${s.y} \${cpX},\${t.y} \${tX},\${t.y}\`;
                });

            const node = nodeLayer.selectAll(".node").data(nodes, d => d.data.id);
            node.exit().remove();

            const nodeEnter = node.enter().append("g").attr("class", "node")
                .attr("transform", d => {
                    const p = d.parent ? posMap.get(d.parent.data.id) : posMap.get(d.data.id);
                    return \`translate(\${p.x}, \${p.y})\`;
                })
                .on("click", (e, d) => toggleNode(d));

            nodeEnter.append("rect").attr("rx", 4).attr("ry", 4);
            nodeEnter.append("text");

            const nodeUpdate = nodeEnter.merge(node);
            nodeUpdate.transition().duration(CONFIG.animationDuration)
                .attr("transform", d => {
                    const p = posMap.get(d.data.id);
                    return \`translate(\${p.x}, \${p.y})\`;
                });

            nodeUpdate.each(function(d) {
                const el = d3.select(this);
                const lines = d.data.content.split('\\n');
                const textY = -((lines.length - 1) * d.lineHeight) / 2;
                
                el.select("rect")
                    .attr("width", d.width).attr("height", d.height)
                    .attr("y", -d.height / 2)
                    .attr("fill", d.data.color || "#444")
                    .attr("stroke", "#ffffff33");

                const text = el.select("text")
                    .attr("x", 12 * CONFIG.scale)
                    .attr("y", textY);
                    
                text.selectAll("tspan").remove();
                lines.forEach((l, i) => {
                    text.append("tspan")
                        .attr("x", 12 * CONFIG.scale)
                        .attr("dy", i === 0 ? "0.35em" : "1.25em")
                        .attr("font-size", d.fontSize)
                        .attr("font-weight", d.fontWeight)
                        .attr("fill", "white")
                        .text(l);
                });

                const indicator = el.selectAll(".collapsible-indicator")
                    .data(d.data.children?.length ? [d] : []);
                indicator.exit().remove();
                
                indicator.enter().append("circle").attr("class", "collapsible-indicator")
                    .attr("r", 5).attr("stroke-width", 2)
                    .merge(indicator)
                    .attr("cx", d => {
                        const p = posMap.get(d.data.id);
                        return p.direction === 1 ? d.width : 0;
                    })
                    .attr("cy", 0)
                    .attr("fill", d => d.data.collapsed ? "white" : (d.data.color || "#444"));
            });
        }

        function toggleNode(d) { d.data.collapsed = !d.data.collapsed; update(); }
        function expandAll() { (function ex(n){ n.collapsed=false; n.children?.forEach(ex); })(treeData); update(); }
        function collapseAll() { (function col(n, d){ n.collapsed=d>=1; n.children?.forEach(c=>col(c,d+1)); })(treeData, 0); update(); }
        
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

        function exportPNG() {
            const scale = 4.0, padding = 100;
            const currT = g.attr("transform");
            g.attr("transform", null);
            const bb = g.node().getBBox();
            g.attr("transform", currT);

            const canvas = document.createElement("canvas");
            canvas.width = (bb.width + padding*2)*scale; canvas.height = (bb.height + padding*2)*scale;
            const ctx = canvas.getContext("2d");
            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = "high";
            
            const clone = svg.node().cloneNode(true);
            
            const styleEl = document.createElement("style");
            styleEl.innerHTML = "@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');\\n" +
                                "svg { font-family: 'Inter', sans-serif; }\\n" +
                                document.querySelector("style").innerHTML;
            clone.insertBefore(styleEl, clone.firstChild);
            
            clone.querySelectorAll("path").forEach(p => p.style.fill = "none");
            
            const cg = clone.querySelector("g");
            cg.setAttribute("transform", "translate(" + (-bb.x + padding) + "," + (-bb.y + padding) + ")");
            clone.setAttribute("width", bb.width + padding * 2);
            clone.setAttribute("height", bb.height + padding * 2);
            clone.removeAttribute("viewBox");
            const img = new Image();
            img.onload = () => {
                ctx.fillStyle = window.matchMedia("(prefers-color-scheme: dark)").matches ? "#1e1e1e" : "#f8fafc";
                ctx.fillRect(0, 0, canvas.width, canvas.height);
                ctx.save();
                ctx.scale(scale, scale); 
                ctx.drawImage(img, 0, 0);
                ctx.restore();
                const a = document.createElement("a"); a.download = "${title}.png";
                a.href = canvas.toDataURL("image/png", 1.0); a.click();
            };
            img.src = "data:image/svg+xml;base64," + btoa(unescape(encodeURIComponent(new XMLSerializer().serializeToString(clone))));
        }

        function initVisibility(n, depth) {
            n.collapsed = depth >= 2;
            if (n.children) n.children.forEach(c => initVisibility(c, depth + 1));
        }
        initVisibility(treeData, 0);

        document.fonts.ready.then(() => {
            update(); 
            setTimeout(fitView, 150);
        });
    </script>
</body>
</html>`;
  }

  private stripCircular(node: TreeNode): any {
    return {
      id: node.id,
      content: node.content,
      color: node.color,
      children: node.children ? node.children.map(c => this.stripCircular(c)) : [],
      collapsed: false
    };
  }

  /**
   * Export to PNG with full content measurement
   */
  public async exportToPNG(svgElement: SVGSVGElement, background: 'transparent' | 'white' | 'dark'): Promise<Blob> {
    return new Promise((res, rej) => {
      const scaleFactor = 3.0; // High fidelity
      const padding = 100;
      
      const mainG = svgElement.querySelector('g');
      const originalTransform = mainG?.getAttribute('transform');
      mainG?.removeAttribute('transform'); 
      const bbox = svgElement.getBBox();
      if (originalTransform) mainG?.setAttribute('transform', originalTransform);

      const contentWidth = bbox.width + padding * 2;
      const contentHeight = bbox.height + padding * 2;
      
      const canvas = document.createElement('canvas');
      canvas.width = contentWidth * scaleFactor;
      canvas.height = contentHeight * scaleFactor;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
      }
      
      const clone = svgElement.cloneNode(true) as SVGSVGElement;
      
      // Fix black path artifacts by ensuring fill is none
      clone.querySelectorAll("path").forEach(p => {
        p.setAttribute("fill", "none");
        if (p instanceof SVGPathElement) {
          p.style.fill = "none";
        }
      });

      const styles = Array.from(document.styleSheets)
        .map(sheet => { try { return Array.from(sheet.cssRules).map(r => r.cssText).join(""); } catch(e) {return "";} }).join("\n");
      const styleEl = document.createElementNS("http://www.w3.org/2000/svg", "style");
      styleEl.textContent = `
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
        ${styles}
      `;
      clone.prepend(styleEl);

      const cloneG = clone.querySelector('g');
      cloneG?.setAttribute('transform', `translate(${-bbox.x + padding}, ${-bbox.y + padding})`);
      clone.setAttribute("width", contentWidth.toString());
      clone.setAttribute("height", contentHeight.toString());
      clone.removeAttribute("viewBox");

      const img = new Image();
      img.onload = () => {
        if (!ctx) return rej(new Error('Canvas ctx null'));
        ctx.fillStyle = background === 'dark' ? '#1e1e1e' : (background === 'white' ? '#ffffff' : 'transparent');
        if (background !== 'transparent') ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        ctx.save();
        ctx.scale(scaleFactor, scaleFactor);
        ctx.drawImage(img, 0, 0);
        ctx.restore();
        
        canvas.toBlob(b => b ? res(b) : rej(new Error('Blob fail')), 'image/png', 1.0);
      };
      img.onerror = (e) => rej(e);
      img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(new XMLSerializer().serializeToString(clone))));
    });
  }
}
