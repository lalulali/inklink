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

/**
 * Minimap provides a smaller navigation context for the main canvas
 */
export function Minimap() {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const [state, setState] = React.useState(globalState.getState());

  useEffect(() => {
    return globalState.subscribe(s => setState(s));
  }, []);

  useEffect(() => {
    if (!svgRef.current || !state.tree) return;
    
    const svg = d3.select(svgRef.current);
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
      minX -= 1000; maxX += 1000; minY -= 1000; maxY += 1000;
    }

    const mapW = maxX - minX;
    const mapH = maxY - minY;
    const mmW = width;
    const mmH = height;

    const scaleX = (x: number) => ((x - minX) / mapW) * mmW;
    const scaleY = (y: number) => ((y - minY) / mapH) * mmH;

    // Render nodes as dots
    svg.selectAll('circle.node-dot')
      .data(nodes)
      .enter()
      .append('circle')
      .attr('class', 'node-dot')
      .attr('r', 1.5)
      .attr('fill', d => d.color || '#94a3b8')
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
        const worldX = (event.x / mmW) * mapW + minX;
        const worldY = (event.y / mmH) * mapH + minY;
        
        const currentScale = state.transform.scale;
        const canvasW = window.innerWidth;
        const canvasH = window.innerHeight;

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
      const worldX = (mx / mmW) * mapW + minX;
      const worldY = (my / mmH) * mapH + minY;
      
      const currentScale = state.transform.scale;
      const canvasW = window.innerWidth;
      const canvasH = window.innerHeight;

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
    const canvasW = window.innerWidth;
    const canvasH = window.innerHeight;
    
    const lx = (0 - state.transform.x) / s;
    const ly = (0 - state.transform.y) / s;
    const rw = canvasW / s;
    const rh = canvasH / s;

    viewport
      .attr('x', scaleX(lx))
      .attr('y', scaleY(ly))
      .attr('width', mapW > 0 ? (rw / mapW) * mmW : 0)
      .attr('height', mapH > 0 ? (rh / mapH) * mmH : 0);

  }, [state.transform, state.tree, state.layoutPositions]);

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
