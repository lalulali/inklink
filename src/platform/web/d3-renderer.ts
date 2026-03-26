/**
 * Feature: D3.js Renderer Implementation
 * Purpose: Implements mind map visualization using D3.js
 * Dependencies: D3.js, RendererAdapter interface, core types
 */

import * as d3 from 'd3';
import { RendererAdapter } from '../adapters/renderer-adapter';
import { TreeNode, Position, NodeChange, Transform } from '@/core/types';
import { ViewportCuller } from './viewport-culler';

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
  
  public onTransform?: (transform: Transform) => void;

  /**
   * Node configuration
   */
  private readonly config = {
    padding: { x: 12, y: 6 },
    margin: { x: 40, y: 20 },
    borderRadius: 4,
    animationDuration: 500,
    highlightColor: '#2563eb', // Blue-600
  };

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
        // Allow left-click (0) and middle-click (1) for panning
        return !event.ctrlKey && (event.button === 0 || event.button === 1);
      })
      .on('zoom', (event) => {
        this.g?.attr('transform', event.transform);
        
        // Notify of transform changes
        this.onTransform?.({
          x: event.transform.x,
          y: event.transform.y,
          scale: event.transform.k,
        });

        if (this.lastRoot && this.lastPositions) {
          this.render(this.lastRoot, this.lastPositions);
        }
      });

    this.svg.call(this.zoom);
  }

  /**
   * Render the complete tree
   */
  render(root: TreeNode, positions: Map<string, Position>): void {
    if (!this.g || !this.svg) return;
    this.lastRoot = root;
    this.lastPositions = positions;

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
    if (ctx) ctx.font = '14px Inter, sans-serif';

    // Heuristic measurement for nodes
    const allNodes = this.flattenTree(root);
    allNodes.forEach(node => {
      // Always re-measure to ensure tidy appearance
      const textWidth = ctx ? ctx.measureText(node.content).width : node.content.length * 8;
      node.metadata.width = textWidth + (this.config.padding.x * 2);
      node.metadata.height = 14 + (this.config.padding.y * 2);
    });

    const nodesToRender = allNodes.filter(node => visibleNodes.has(node.id));
    
    // Links are visible if target is visible
    const allLinks = this.getLinks(allNodes);
    const linksToRender = allLinks.filter(link => visibleNodes.has(link.target.id));

    this.renderLinks(linksToRender, positions);
    this.renderNodes(nodesToRender, positions);
  }

  /**
   * Update specific nodes
   */
  update(changes: NodeChange[]): void {
    if (this.lastRoot && this.lastPositions) {
      this.render(this.lastRoot, this.lastPositions);
    }
  }

  /**
   * Clear all rendered elements
   */
  clear(): void {
    this.g?.selectAll('*').remove();
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
  focusNode(nodeId: string): void {
    if (!this.svg || !this.zoom || !this.g) return;
    
    // Find node elements
    const node = this.g.select(`g.node[data-id="${nodeId}"]`);
    if (node.empty()) return;

    const transform = d3.zoomTransform(this.svg.node() as SVGSVGElement);
    const bounds = this.getViewportBounds();
    
    // Get node position from D3 data or attribute
    const d = node.datum() as any;
    if (!d) return;

    // Center calculation
    const x = d.x || 0;
    const y = d.y || 0;
    
    this.svg.transition()
      .duration(750)
      .call(
        this.zoom.transform,
        d3.zoomIdentity
          .translate(bounds.width / 2, bounds.height / 2)
          .scale(1.5)
          .translate(-x, -y)
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

  private nodeClickCallback: (nodeId: string) => void = () => {};

  /**
   * Register callback for node click events
   */
  onNodeClick(callback: (nodeId: string) => void): void {
    this.nodeClickCallback = callback;
  }

  /**
   * Highlight specified nodes
   */
  highlightNodes(nodeIds: string[]): void {
    this.highlightIds = new Set(nodeIds);
    if (this.lastRoot && this.lastPositions) {
      this.render(this.lastRoot, this.lastPositions);
    }
  }

  /**
   * Render nodes using D3 data join
   */
  private renderNodes(nodes: TreeNode[], positions: Map<string, Position>): void {
    if (!this.g) return;
    const layer = this.g.select('g.nodes-layer');

    const nodeGroups = layer.selectAll<SVGGElement, TreeNode>('g.node')
      .data(nodes, (d) => d.id);

    // EXIT
    nodeGroups.exit()
      .transition()
      .duration(200)
      .attr('opacity', 0)
      .remove();

    // ENTER
    const enter = nodeGroups.enter()
      .append('g')
      .attr('class', 'node')
      .attr('cursor', 'pointer')
      .attr('opacity', 0)
      .on('click', (event, d) => {
        event.stopPropagation();
        this.nodeClickCallback(d.id);
      });

    enter.append('rect')
      .attr('rx', this.config.borderRadius)
      .attr('ry', this.config.borderRadius)
      .attr('fill', 'white')
      .attr('stroke-width', 2);

    enter.append('text')
      .attr('dy', '0.35em')
      .attr('font-size', '14px')
      .attr('font-family', 'Inter, sans-serif');

    // UPDATE with transition
    const update = enter.merge(nodeGroups);
    const t = this.g.transition().duration(this.config.animationDuration);

    update.attr('data-id', (d) => d.id)
      .transition(t as any)
      .attr('opacity', 1)
      .attr('transform', (d) => {
        const pos = positions.get(d.id) || { x: 0, y: 0 };
        return `translate(${pos.x}, ${pos.y})`;
      });

    update.select('text')
      .text((d) => d.content)
      .transition(t as any)
      .attr('x', (d) => {
        const width = (d as any).metadata?.width || 0;
        const pos = positions.get(d.id) || { x: 0, y: 0 };
        const parentPos = d.parent ? (positions.get(d.parent.id) || { x: 0, y: 0 }) : null;
        
        // Root centering
        if (!parentPos) {
           return -width / 2 + this.config.padding.x;
        }

        // Left side: right-aligned box, text starts at -width + padding
        if (pos.x < parentPos.x) {
          return -width + this.config.padding.x;
        }
        return this.config.padding.x;
      })
      .attr('y', 0);

    update.select('rect')
      .transition(t as any)
      .attr('width', (d) => (d as any).metadata?.width || 0)
      .attr('height', (d) => (d as any).metadata?.height || 0)
      .attr('x', (d) => {
        const width = (d as any).metadata?.width || 0;
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
      .attr('stroke', (d) => this.highlightIds.has(d.id) ? this.config.highlightColor : (d.color || '#ccc'))
      .attr('stroke-width', (d) => this.highlightIds.has(d.id) ? 3 : 1.5);

    // Indicators logic: dependent on side
    const indicator = update.selectAll<SVGCircleElement, TreeNode>('circle.collapsible-indicator')
      .data(d => d.children.length > 0 ? [d] : [], d => d.id);

    indicator.exit().remove();
    
    indicator.enter()
      .append('circle')
      .attr('class', 'collapsible-indicator')
      .attr('r', 6)
      .attr('fill', 'white')
      .attr('stroke-width', 2)
      .on('mouseover', function() { d3.select(this).attr('r', 8); })
      .on('mouseout', function() { d3.select(this).attr('r', 6); })
      .on('click', (event, d) => {
        event.stopPropagation();
        d.collapsed = !d.collapsed;
        if (this.lastRoot && this.lastPositions) {
            this.render(this.lastRoot, this.lastPositions);
        }
      })
      .merge(indicator as any)
      .transition(t as any)
      .attr('cx', (d) => {
        const width = (d as any).metadata?.width || 0;
        const pos = positions.get(d.id) || { x: 0, y: 0 };
        const parentPos = d.parent ? (positions.get(d.parent.id) || { x: 0, y: 0 }) : null;
        
        // Root is special: it doesn't usually have a single collapse point,
        // but if it does, let's put it on its right side or center?
        // Let's hide it for root to avoid confusion, or put it on the right edge.
        if (!parentPos) {
          return width / 2;
        }

        // Left side: indicator on the far left
        if (pos.x < parentPos.x) {
          return -width;
        }
        return width; // Far right
      })
      .attr('cy', 0)
      .attr('stroke', (d) => d.color || '#ccc')
      .attr('fill', (d) => d.collapsed ? (d.color || '#ccc') : 'white');
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
      .duration(200)
      .attr('stroke-opacity', 0)
      .remove();

    const enter = linkPaths.enter()
      .append('path')
      .attr('class', 'link')
      .attr('fill', 'none')
      .attr('stroke-opacity', 0)
      .attr('stroke-width', 2);

    const update = enter.merge(linkPaths);
    const t = this.g.transition().duration(this.config.animationDuration);

    const diagonal = d3.linkHorizontal<any, any>()
      .x((d) => {
        const pos = positions.get(d.id) || { x: 0, y: 0 };
        const width = (d as any).metadata?.width || 0;
        
        // Find if this is source or target
        // We need to know which side it's on to connect to correct edge
        return pos.x; // Default to left edge
      })
      .y((d) => (positions.get(d.id) || { x: 0, y: 0 }).y);

    // Custom diagonal generator to handle side-aware offsets
    const sideAwareDiagonal = (d: any) => {
      const sPos = positions.get(d.source.id) || { x: 0, y: 0 };
      const tPos = positions.get(d.target.id) || { x: 0, y: 0 };
      const sWidth = (d.source as any).metadata?.width || 0;
      const tWidth = (d.target as any).metadata?.width || 0;

      // Source side identification:
      // If source is root, we look at target's position
      let sX = sPos.x;
      if (!d.source.parent) {
        sX = tPos.x < sPos.x ? sPos.x : sPos.x + sWidth;
      } else {
        const pPos = positions.get(d.source.parent.id) || { x: 0, y: 0 };
        const isLeft = sPos.x < pPos.x;
        sX = isLeft ? sPos.x - sWidth : sPos.x + sWidth;
      }

      const sY = sPos.y;

      // Target side: connects to its inner edge (which is always 0 relative to pivot)
      // BUT for left nodes, pivot is the inner edge (right side). Correct.
      // For right nodes, pivot is the inner edge (left side). Correct.
      const tX = tPos.x;
      const tY = tPos.y;

      const cp1x = sX + (tX - sX) / 2;
      return `M${sX},${sY}C${cp1x},${sY} ${cp1x},${tY} ${tX},${tY}`;
    };

    update.transition(t as any)
      .attr('d', sideAwareDiagonal)
      .attr('stroke-opacity', 0.6)
      .attr('stroke', (d) => d.target.color || '#ccc');
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
