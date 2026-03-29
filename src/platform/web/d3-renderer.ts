/**
 * Feature: D3.js Renderer Implementation
 * Purpose: Implements mind map visualization using D3.js
 * Dependencies: D3.js, RendererAdapter interface, core types
 */

import * as d3 from 'd3';
import { RendererAdapter } from '../adapters/renderer-adapter';
import { TreeNode, Position, NodeChange, Transform } from '@/core/types';
import { ViewportCuller } from './viewport-culler';
import { ColorManager } from '@/core/theme/color-manager';

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
  private isVertical: boolean = false; // Track layout orientation
  private isDarkMode: boolean = false; // Track theme mode


  public onTransform?: (transform: Transform) => void;

  /**
   * Node configuration
   */
  private readonly config = {
    padding: { 
      x: 12 * 0.75, // 9
      y: 6 * 0.75   // 4.5
    },
    margin: { 
      x: 40 * 0.75, // 30
      y: 20 * 0.75  // 15
    },
    borderRadius: 4,
    animationDuration: 250,
    staggerDelay: 25,       // ms per depth level for cascade effect
    highlightColor: '#2563eb',
  };

  /**
   * Helper to get font size based on node depth (Heading style)
   */
  private getFontSize(depth: number): number {
    const base = depth === 0 ? 22 : depth === 1 ? 17 : depth === 2 ? 14 : 12;
    return base * 0.75;
  }

  /**
   * Helper to get font weight based on node depth
   */
  private getFontWeight(depth: number): string {
    if (depth === 0) return '600';
    if (depth === 1) return '500';
    return '400';
  }

  /**
   * Helper to get line height based on depth
   */
  private getLineHeight(depth: number): number {
    return Math.round(this.getFontSize(depth) * 1.25);
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
        if (isNaN(pos.x) || isNaN(pos.y)) {
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

    // Get current transform for culling
    const d3Transform = d3.zoomTransform(this.svg.node() as SVGSVGElement);
    const transform: Transform = {
      x: d3Transform.x,
      y: d3Transform.y,
      scale: d3Transform.k,
    };
    const viewportBounds = this.getViewportBounds();

    const visibleNodes = this.culler.getVisibleNodes(
      root,
      positions,
      transform,
      viewportBounds.width,
      viewportBounds.height
    );

    // Text measurement using canvas
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    // Heuristic measurement for nodes
    allNodes.forEach(node => {
      const depth = node.depth || 0;
      const fontSize = this.getFontSize(depth);
      const fontWeight = this.getFontWeight(depth);
      const lineHeight = this.getLineHeight(depth);
      
      if (ctx) ctx.font = `${fontWeight} ${fontSize}px Inter, sans-serif`;

      // Always re-measure to ensure tidy appearance
      const lines = node.content.split('\n');
      let maxWidth = 0;
      lines.forEach(line => {
        const segments = this.parseMarkdownLine(line);
        let lineWidth = 0;
        segments.forEach(seg => {
          if (ctx) {
            ctx.font = `${seg.bold ? 'bold ' : fontWeight} ${seg.italic ? 'italic ' : ''}${fontSize}px Inter, sans-serif`;
            lineWidth += ctx.measureText(seg.text).width;
          } else {
            lineWidth += seg.text.length * (fontSize * 0.6);
          }
        });
        maxWidth = Math.max(maxWidth, lineWidth);
      });
      node.metadata.width = maxWidth + (this.config.padding.x * 2);
      node.metadata.height = (lines.length * lineHeight) + (this.config.padding.y * 2);
    });

    // Temporarily disabled culling to ensure reliable initial render
    const nodesToRender = allNodes;
    
    // Links are visible if target is visible
    const allLinks = this.getLinks(allNodes);
    const linksToRender = allLinks;

    this.renderLinks(linksToRender, positions);
    this.renderNodes(nodesToRender, positions);
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
   * Clear all rendered elements while preserving layer groups
   */
  clear(): void {
    if (this.g) {
      this.g.selectAll('g.nodes-layer *').remove();
      this.g.selectAll('g.links-layer *').remove();
    }
    this.lastRoot = null;
    this.lastPositions = null;
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

    if (!isFinite(minX)) return;

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

  private nodeClickCallback: (nodeId: string) => void = () => {};
  private nodeDoubleClickCallback: (nodeId: string) => void = () => {};
  private nodeToggleCallback: (nodeId: string) => void = () => {};

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
  onNodeToggle(callback: (nodeId: string) => void): void {
    this.nodeToggleCallback = callback;
  }

  /**
   * Highlight specified nodes
   */
  highlightNodes(nodeIds: string[]): void {
    this.highlightIds = new Set(nodeIds);
    if (this.lastRoot && this.lastPositions) {
      this.render(this.lastRoot, this.lastPositions, this.isDarkMode);
    }
  }

  /**
   * Set the selected node for highlighting and focus
   */
  setSelectedNode(nodeId: string | null): void {
    this.selectedNodeId = nodeId;
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
        // Start new nodes at their final position to avoid \"flying from (0,0)\"
        // Or start them at their parent's position for a \"growth\" effect
        const targetPos = positions.get(d.id) || { x: 0, y: 0 };
        if (d.parent) {
          const parentPos = positions.get(d.parent.id) || targetPos;
          return `translate(${parentPos.x}, ${parentPos.y})`;
        }
        return `translate(${targetPos.x}, ${targetPos.y})`;
      })
      .on('click', (event, d) => {
        event.stopPropagation();
        this.nodeClickCallback(d.id);
      })
      .on('dblclick', (event, d) => {
        event.stopPropagation();
        this.nodeDoubleClickCallback(d.id);
      })
      .on('focus', (event, d) => {
        // When focused via keyboard, trigger selection
        this.nodeClickCallback(d.id);
      });

    enter.append('rect')
      .attr('rx', this.config.borderRadius)
      .attr('ry', this.config.borderRadius)
      .attr('stroke-width', 2);

    enter.append('text')
      .attr('dy', '0.35em')
      .attr('font-family', 'Inter, sans-serif');

    // UPDATE with transition — staggered by depth for cascade feel
    const update = enter.merge(nodeGroups);

    update.attr('data-id', (d) => d.id)
      .transition()
      .duration(this.config.animationDuration)
      .ease(d3.easeCubicOut)
      .delay((d) => (d.depth || 0) * this.config.staggerDelay)
      .attr('opacity', 1)
      .attr('transform', (d) => {
        const pos = positions.get(d.id) || { x: 0, y: 0 };
        return `translate(${pos.x}, ${pos.y})`;
      });

    update.select('text')
      .each(function(d) {
        const textElement = d3.select(this);
        const lines = d.content.split('\n');
        
        // Calculate the target x (same as the .attr('x') logic below)
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

        // Clean up previous tspans
        textElement.selectAll('tspan').remove();
        
        // Add new tspans for each line
        lines.forEach((line, i) => {
          const tspan = textElement.append('tspan')
            .attr('x', x)
            .attr('dy', i === 0 ? '0.35em' : '1.2em');
            
          const segments = thisRenderer.parseMarkdownLine(line);
          segments.forEach(seg => {
            const span = tspan.append('tspan')
              .text(seg.text);
            
            if (seg.bold) span.style('font-weight', 'bold');
            else span.style('font-weight', thisRenderer.getFontWeight(d.depth));
            
            if (seg.italic) span.style('font-style', 'italic');
            if (seg.strikethrough) span.style('text-decoration', 'line-through');
          });
        });
      })
      .attr('font-size', (d) => `${thisRenderer.getFontSize(d.depth)}px`)
      .attr('font-weight', (d) => thisRenderer.getFontWeight(d.depth))
      .attr('fill', (d) => {
        if (thisRenderer.isDarkMode) {
          if (d.depth === 0) return '#1e1e1e'; // Dark text on light grey root
          return 'white'; // White text on colored branches
        }
        return 'white';
      })
      .transition()
      .duration(this.config.animationDuration)
      .ease(d3.easeCubicOut)
      .delay((d) => (d.depth || 0) * this.config.staggerDelay)
      .attr('x', (d) => {
        const width = (d as any).metadata?.width || 0;
        if (thisRenderer.isVertical) return -width / 2 + thisRenderer.config.padding.x;
        const pos = positions.get(d.id) || { x: 0, y: 0 };
        const parentPos = d.parent ? (positions.get(d.parent.id) || { x: 0, y: 0 }) : null;
        if (!parentPos) return -width / 2 + thisRenderer.config.padding.x;
        if (pos.x < parentPos.x) return -width + thisRenderer.config.padding.x;
        return thisRenderer.config.padding.x;
      })
      .attr('y', (d) => {
        const lines = d.content.split('\n');
        const fontSize = thisRenderer.getFontSize(d.depth);
        const lineHeight = thisRenderer.getLineHeight(d.depth);
        // Shift up by half the total extra height to center vertically
        return -((lines.length - 1) * lineHeight) / 2;
      });

    update.select('rect')
      .transition()
      .duration(this.config.animationDuration)
      .ease(d3.easeCubicOut)
      .delay((d) => (d.depth || 0) * this.config.staggerDelay)
      .attr('width', (d) => (d as any).metadata?.width || 0)
      .attr('height', (d) => (d as any).metadata?.height || 0)
      .attr('x', (d) => {
        const width = (d as any).metadata?.width || 0;
        if (thisRenderer.isVertical) return -width / 2;

        const pos = positions.get(d.id) || { x: 0, y: 0 };
        const parentPos = d.parent ? (positions.get(d.parent.id) || { x: 0, y: 0 }) : null;
        
        // Root is centered on the layout point
        if (!parentPos) {
          return -width / 2;
        }
        
        // Left side nodes are mirrored
        if (pos.x < parentPos.x) {
          return -width;
        }
        return 0; // Right side nodes grow from the pivot
      })
      .attr('y', (d) => -((d as any).metadata?.height || 0) / 2)
      .attr('fill', (d) => {
        if (thisRenderer.isDarkMode) {
          if (d.depth === 0) return '#d4d4d4'; // Visual Studio Light Grey Root in Dark Mode
          return ColorManager.getThemeShade(d.color, true) || '#1e293b'; 
        }
        if (d.depth === 0) return '#444444'; // Subtle Dark Grey Root in Light Mode
        return d.color || '#f1f5f9'; // Branches colored (500)
      })
      .style('stroke', (d) => {
        if (this.selectedNodeId === d.id) return '#ef4444'; // Red for selected
        if (this.highlightIds.has(d.id)) return this.config.highlightColor;
        
        if (thisRenderer.isDarkMode) {
          if (d.depth === 0) return '#ffffff'; // Root border for extra pop
          return '#444444'; // Subtle border in dark mode
        }
        if (d.depth === 0) return '#000000'; // Root border darker in light mode
        return '#cbd5e1'; // Slate 300 - consistent lightgrey border for all nodes
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
      .on('mouseover', function() { d3.select(this).attr('r', 8); })
      .on('mouseout', function() { d3.select(this).attr('r', 6); })
      .on('click', (event, d) => {
        event.stopPropagation();
        this.toggleNode(d);
      })
      .merge(indicator as any)
      .transition() // Use a new transition for enter/update
      .duration(280) // Reduced animation duration
      .ease(d3.easeCubicOut) // Apply easeCubicOut
      .delay((d) => (d.depth || 0) * 30) // Depth-based stagger delay
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
          // Use both parent-null check and depth check for robust root detection
          if (!d.parent || d.depth === 0) return '#000000'; 
          return '#cbd5e1'; // Consistent lightgrey border for children
        }
        if (!d.parent || d.depth === 0) return '#1e1e1e'; // Dark ring for root in dark mode
        return '#444444'; // Subtle border in dark mode
      })
      .attr('fill', (d) => {
        if (thisRenderer.isDarkMode) {
          if (d.collapsed) return 'white'; // Solid indicator when closed
          
          // Open: Follow the node background
          if (d.depth === 0) return '#d4d4d4'; // Match light grey root in dark mode
          return ColorManager.getThemeShade(d.color, true) || '#1e293b';
        }
        
        // Light mode
        if (d.collapsed) return 'white';
        if (d.depth === 0) return '#444444'; // Match the subtle root background
        return d.color || '#f1f5f9';
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
          const dy = tPos.y < sPos.y ? -sHeight/2 : sHeight/2;
          return `M${sX},${sPos.y + dy}C${sX},${sPos.y + dy} ${sX},${sPos.y + dy} ${sX},${sPos.y + dy}`;
        } else {
          // Robust source side detection
          if (!data.source.parent) {
             sX = tPos.x < sPos.x ? sPos.x - sWidth/2 : sPos.x + sWidth/2;
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
        const sPos = positions.get(d.source.id) || { x: 0, y: 0 };
        const sWidth = (d.source as any).metadata?.width || 0;
        const tPos = positions.get(d.target.id) || { x: 0, y: 0 };

        // Use the same edge calculation as sideAwareDiagonal for the initial (collapsed) state
        let sX: number;
        let sY: number = sPos.y;

        if (this.isVertical) {
          sX = sPos.x;
          const sHeight = (d.source as any).metadata?.height || 0;
          sY = tPos.y < sPos.y ? sPos.y - sHeight / 2 : sPos.y + sHeight / 2;
          return `M${sX},${sY}C${sX},${sY} ${sX},${sY} ${sX},${sY}`;
        } else {
          if (!d.source.parent) {
            sX = tPos.x < sPos.x ? sPos.x - sWidth / 2 : sPos.x + sWidth / 2;
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
      .attr('stroke-opacity', (d) => this.isDarkMode ? 0.8 : 0.55)
      .attr('stroke', (d) => ColorManager.getThemeShade(d.target.color, this.isDarkMode) || 'currentColor');
  }

  /**
   * Simple inline markdown parser
   */
  private parseMarkdownLine(line: string): { text: string; bold?: boolean; italic?: boolean; strikethrough?: boolean }[] {
    const segments: { text: string; bold?: boolean; italic?: boolean; strikethrough?: boolean }[] = [];
    
    // Support combination like ***bold and italic***
    // Support non-nested tags for simplicity
    // Regex matches: ***bolditalic***, **bold**, *italic*, ~~strike~~
    const regex = /(\*\*\*.*?\*\*\*|\*\*.*?\*\*|\*.*?\*|~~.*?~~)/g;
    const parts = line.split(regex);
    
    parts.forEach(part => {
      if (!part) return;
      if (part.startsWith('***') && part.endsWith('***')) {
        segments.push({ text: part.slice(3, -3), bold: true, italic: true });
      } else if (part.startsWith('**') && part.endsWith('**')) {
        segments.push({ text: part.slice(2, -2), bold: true });
      } else if (part.startsWith('*') && part.endsWith('*')) {
        segments.push({ text: part.slice(1, -1), italic: true });
      } else if (part.startsWith('~~') && part.endsWith('~~')) {
        segments.push({ text: part.slice(2, -2), strikethrough: true });
      } else {
        segments.push({ text: part });
      }
    });
    
    return segments;
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
