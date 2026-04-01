/**
 * Feature: Minimap Component
 * Purpose: Provides a high-level overview of the entire mind map with navigation
 * Dependencies: D3.js, React hooks, viewport-culler via render state
 */

"use client";

import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import { ViewIcon, ZoomInIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { globalState } from '@/core/state/state-manager';
import { cn } from '@/lib/utils';
import { ColorManager } from '@/core/theme/color-manager';

/**
 * Minimap provides a smaller navigation context for the main canvas
 */
export function Minimap() {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const [state, setState] = React.useState(globalState.getState());
  const [resizeToggle, setResizeToggle] = React.useState(0);

  useEffect(() => {
    const handleResize = () => setResizeToggle(prev => prev + 1);
    window.addEventListener('resize', handleResize);
    const unsubscribe = globalState.subscribe(setState);
    return () => {
      window.removeEventListener('resize', handleResize);
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!svgRef.current) return;
    
    const svg = d3.select(svgRef.current);
    if (!state.tree) {
      svg.selectAll('*').remove();
      return;
    }

    const { width, height } = containerRef.current?.getBoundingClientRect() || { width: 192, height: 128 };

    const nodes: any[] = [];
    const flatten = (n: any) => {
      const pos = state.layoutPositions.get(n.id);
      if (pos) {
        nodes.push({ ...n, x: pos.x, y: pos.y });
      }
      if (n.children && !n.collapsed) n.children.forEach(flatten);
    };
    if (state.tree) flatten(state.tree);

    // Calculate map bounds from positions to fit all nodes
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    nodes.forEach(n => {
      minX = Math.min(minX, n.x);
      maxX = Math.max(maxX, n.x);
      minY = Math.min(minY, n.y);
      maxY = Math.max(maxY, n.y);
    });

    if (nodes.length === 0) {
      minX = 0; maxX = width; minY = 0; maxY = height;
    } else {
      // Improved dynamic padding: use a percentage of content size with a reasonable cap
      const contentW = maxX - minX;
      const contentH = maxY - minY;
      const paddingX = Math.min(1000, Math.max(200, contentW * 0.2));
      const paddingY = Math.min(800, Math.max(150, contentH * 0.2));
      minX -= paddingX; maxX += paddingX; minY -= paddingY; maxY += paddingY;
    }

    const mapW = maxX - minX;
    const mapH = maxY - minY;
    let minimapScale = Math.min(width / mapW, height / mapH);
    // Safety check for scale
    if (!Number.isFinite(minimapScale) || minimapScale <= 0) minimapScale = 1;

    const offsetX = (width - mapW * minimapScale) / 2;
    const offsetY = (height - mapH * minimapScale) / 2;

    const scaleX = (x: number) => ((x - minX) * minimapScale) + offsetX;
    const scaleY = (y: number) => ((y - minY) * minimapScale) + offsetY;
    const invertX = (mx: number) => ((mx - offsetX) / minimapScale) + minX;
    const invertY = (my: number) => ((my - offsetY) / minimapScale) + minY;

    // --- NODE DOTS ---
    let nodesContainer = svg.select<SVGGElement>('g.nodes-dots');
    if (nodesContainer.empty()) nodesContainer = svg.append('g').attr('class', 'nodes-dots');

    const nodeDots = nodesContainer.selectAll<SVGCircleElement, any>('circle.node-dot')
      .data(nodes, d => d.id);

    nodeDots.exit().remove();
    nodeDots.enter()
      .append('circle')
      .attr('class', 'node-dot')
      .attr('r', 1.2)
      .merge(nodeDots as any)
      .attr('fill', d => ColorManager.getThemeShade(d.color, state.isDarkMode) || '#94a3b8')
      .attr('opacity', nodes.length > 50 ? 0.6 : 0.9) // Lower opacity for high density
      .attr('cx', d => scaleX(d.x))
      .attr('cy', d => scaleY(d.y));

    // --- LIGHTHOUSE OVERLAY (Dimm everything except viewport) ---
    let overlay = svg.select<SVGPathElement>('path.minimap-overlay');
    if (overlay.empty()) {
      overlay = svg.append('path')
        .attr('class', 'minimap-overlay')
        .attr('fill', state.isDarkMode ? 'rgba(0, 0, 0, 0.45)' : 'rgba(0, 0, 0, 0.15)')
        .attr('fill-rule', 'evenodd')
        .attr('pointer-events', 'none'); 
    }

    // --- VIEWPORT RECT (Persistent) ---
    let viewport = svg.select<SVGRectElement>('rect.viewport-rect');
    if (viewport.empty()) {
      viewport = svg.append('rect')
        .attr('class', 'viewport-rect')
        .attr('fill', 'rgba(59, 130, 246, 0.1)')
        .attr('stroke', '#3b82f6')
        .attr('stroke-width', 1.5)
        .attr('cursor', 'move');
    }

    // Capture dimensions and scale for transform updates
    const canvasRect = document.getElementById('inklink-mindmap-canvas')?.getBoundingClientRect();
    const canvasW = canvasRect?.width || window.innerWidth;
    const canvasH = canvasRect?.height || window.innerHeight;
    const currentScale = state.transform.scale;

    // Dimensions in world space
    const lx = (0 - state.transform.x) / currentScale;
    const ly = (0 - state.transform.y) / currentScale;
    const rw = canvasW / currentScale;
    const rh = canvasH / currentScale;

    // Dimensions in minimap space with MINIMUM SIZES for visibility
    const rawVW = rw * minimapScale;
    const rawVH = rh * minimapScale;
    const vw = Math.max(12, rawVW);
    const vh = Math.max(12, rawVH);
    
    // Centers
    const vx = scaleX(lx) - (vw - rawVW) / 2;
    const vy = scaleY(ly) - (vh - rawVH) / 2;

    // Update overlay path (Rect with hole)
    overlay.attr('d', `M 0 0 H ${width} V ${height} H 0 Z M ${vx} ${vy} V ${vy + vh} H ${vx + vw} V ${vy} Z`);

    // Update viewport rect
    viewport
      .attr('x', vx)
      .attr('y', vy)
      .attr('width', vw)
      .attr('height', vh);

    // --- CENTER GRABBER HANDLE ---
    let handle = svg.select<SVGCircleElement>('circle.viewport-handle');
    if (handle.empty()) {
      handle = svg.append('circle')
        .attr('class', 'viewport-handle')
        .attr('r', 3)
        .attr('fill', '#3b82f6')
        .attr('stroke', 'white')
        .attr('stroke-width', 1)
        .attr('pointer-events', 'none');
    }
    handle
      .attr('cx', vx + vw / 2)
      .attr('cy', vy + vh / 2)
      .attr('opacity', vw < 20 ? 1 : 0.5); // More prominent when viewport is small

    // --- DRAG BEHAVIOR ---
    const drag = d3.drag<SVGRectElement, unknown>()
      .subject(() => {
        return {
          x: parseFloat(viewport.attr('x')) || 0,
          y: parseFloat(viewport.attr('y')) || 0
        };
      })
      .on('drag', (event) => {
        // Correct for the min-size offset if any
        const adjustedX = event.x + (vw - rawVW) / 2;
        const adjustedY = event.y + (vh - rawVH) / 2;
        const worldX = invertX(adjustedX);
        const worldY = invertY(adjustedY);
        
        const currentTransform = globalState.getState().transform;
        globalState.setState({
          transform: {
            ...currentTransform,
            x: -worldX * currentTransform.scale,
            y: -worldY * currentTransform.scale
          }
        });
      });

    viewport.call(drag as any);

    // --- CLICK TO JUMP ---
    svg.on('click', (event) => {
      if (event.defaultPrevented) return;
      const [mx, my] = d3.pointer(event);
      const worldX = invertX(mx);
      const worldY = invertY(my);
      
      globalState.setState({
        transform: {
          ...state.transform,
          x: canvasW / 2 - worldX * currentScale,
          y: canvasH / 2 - worldY * currentScale
        }
      });
    });

  }, [state.transform, state.tree, state.layoutPositions, resizeToggle, state.isDarkMode]);

  return (
    <div 
      className={cn(
        "absolute bottom-4 right-4 z-20 flex flex-col items-end gap-2 transition-opacity duration-300",
        state.minimapVisible ? "opacity-100" : "opacity-0 pointer-events-none"
      )}
      id="inklink-minimap-container"
    >
      <div 
        ref={containerRef}
        className="h-32 w-48 overflow-hidden rounded-lg border bg-background shadow-lg"
      >
         <svg ref={svgRef} className="h-full w-full" />
      </div>
    </div>
  );
}
