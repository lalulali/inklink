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
    svg.selectAll('*').remove();

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
      // Dynamic padding: use at least 1500px or 50% of content width to ensure center nodes have breathing room
      const contentW = maxX - minX;
      const contentH = maxY - minY;
      const paddingX = Math.max(1500, contentW * 0.5);
      const paddingY = Math.max(1000, contentH * 0.5);
      minX -= paddingX; maxX += paddingX; minY -= paddingY; maxY += paddingY;
    }

    const mapW = Math.max(1, maxX - minX);
    const mapH = Math.max(1, maxY - minY);
    const mmW = width;
    const mmH = height;

    const scale = Math.min(mmW / mapW, mmH / mapH);
    const offsetX = (mmW - mapW * scale) / 2;
    const offsetY = (mmH - mapH * scale) / 2;

    const scaleX = (x: number) => ((x - minX) * scale) + offsetX;
    const scaleY = (y: number) => ((y - minY) * scale) + offsetY;
    const invertX = (mx: number) => ((mx - offsetX) / scale) + minX;
    const invertY = (my: number) => ((my - offsetY) / scale) + minY;

    // Render nodes as dots
    svg.selectAll('circle.node-dot')
      .data(nodes)
      .enter()
      .append('circle')
      .attr('class', 'node-dot')
      .attr('r', 1.5)
      .attr('fill', d => ColorManager.getThemeShade(d.color, state.isDarkMode) || '#94a3b8')
      .attr('cx', d => scaleX(d.x))
      .attr('cy', d => scaleY(d.y));

    const viewport = svg.append('rect')
      .attr('class', 'viewport-rect')
      .attr('fill', 'rgba(59, 130, 246, 0.15)')
      .attr('stroke', 'rgba(59, 130, 246, 0.6)')
      .attr('stroke-width', 1.5)
      .attr('cursor', 'move');

    // Drag behavior for viewport
    const drag = d3.drag<SVGRectElement, unknown>()
      .on('drag', (event) => {
        const currentScale = state.transform.scale;
        const canvasRect = document.getElementById('inklink-mindmap-canvas')?.getBoundingClientRect();
        const canvasW = canvasRect?.width || window.innerWidth;
        const canvasH = canvasRect?.height || window.innerHeight;
        
        const rw = canvasW / currentScale;
        const rh = canvasH / currentScale;

        // event.x is the top-left of the dragged rect, calculate center
        const mxCenter = event.x + (rw * scale) / 2;
        const myCenter = event.y + (rh * scale) / 2;

        const worldX = invertX(mxCenter);
        const worldY = invertY(myCenter);

        globalState.setState({
          transform: {
            ...state.transform,
            x: canvasW / 2 - worldX * currentScale,
            y: canvasH / 2 - worldY * currentScale
          }
        });
      });

    viewport.call(drag as any);

    // Click to navigate
    svg.on('click', (event) => {
      if (event.defaultPrevented) return;
      const [mx, my] = d3.pointer(event);
      
      // For clicks, the pointer is exactly where we want the center
      const worldX = invertX(mx);
      const worldY = invertY(my);
      
      const currentScale = state.transform.scale;
      const canvasRect = document.getElementById('inklink-mindmap-canvas')?.getBoundingClientRect();
      const canvasW = canvasRect?.width || window.innerWidth;
      const canvasH = canvasRect?.height || window.innerHeight;

      globalState.setState({
        transform: {
          ...state.transform,
          x: canvasW / 2 - worldX * currentScale,
          y: canvasH / 2 - worldY * currentScale
        }
      });
    });

    // Update viewport rect position/size
    const s = state.transform.scale;
    const canvasRect = document.getElementById('inklink-mindmap-canvas')?.getBoundingClientRect();
    const canvasW = canvasRect?.width || window.innerWidth;
    const canvasH = canvasRect?.height || window.innerHeight;
    
    const lx = (0 - state.transform.x) / s;
    const ly = (0 - state.transform.y) / s;
    const rw = canvasW / s;
    const rh = canvasH / s;

    viewport
      .attr('x', scaleX(lx))
      .attr('y', scaleY(ly))
      .attr('width', rw * scale)
      .attr('height', rh * scale);

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
        className="h-32 w-48 overflow-hidden rounded-lg border bg-background/80 shadow-lg backdrop-blur"
      >
         <svg ref={svgRef} className="h-full w-full" />
      </div>
    </div>
  );
}
