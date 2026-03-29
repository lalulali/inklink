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
      // Dynamic padding: use at least 1500px or 50% of content width to ensure center nodes have breathing room
      const contentW = maxX - minX;
      const contentH = maxY - minY;
      const paddingX = Math.max(1500, contentW * 0.5);
      const paddingY = Math.max(1000, contentH * 0.5);
      minX -= paddingX; maxX += paddingX; minY -= paddingY; maxY += paddingY;
    }

    const mapW = maxX - minX;
    const mapH = maxY - minY;
    const scale = Math.min(width / mapW, height / mapH);
    const offsetX = (width - mapW * scale) / 2;
    const offsetY = (height - mapH * scale) / 2;

    const scaleX = (x: number) => ((x - minX) * scale) + offsetX;
    const scaleY = (y: number) => ((y - minY) * scale) + offsetY;
    const invertX = (mx: number) => ((mx - offsetX) / scale) + minX;
    const invertY = (my: number) => ((my - offsetY) / scale) + minY;

    // --- NODE DOTS (Persistent) ---
    let nodesContainer = svg.select<SVGGElement>('g.nodes-dots');
    if (nodesContainer.empty()) nodesContainer = svg.append('g').attr('class', 'nodes-dots');

    const nodeDots = nodesContainer.selectAll<SVGCircleElement, any>('circle.node-dot')
      .data(nodes, d => d.id);

    nodeDots.exit().remove();
    nodeDots.enter()
      .append('circle')
      .attr('class', 'node-dot')
      .attr('r', 1.5)
      .merge(nodeDots as any)
      .attr('fill', d => ColorManager.getThemeShade(d.color, state.isDarkMode) || '#94a3b8')
      .attr('cx', d => scaleX(d.x))
      .attr('cy', d => scaleY(d.y));

    // --- VIEWPORT RECT (Persistent) ---
    let viewport = svg.select<SVGRectElement>('rect.viewport-rect');
    if (viewport.empty()) {
      viewport = svg.append('rect')
        .attr('class', 'viewport-rect')
        .attr('fill', 'rgba(59, 130, 246, 0.15)')
        .attr('stroke', 'rgba(59, 130, 246, 0.6)')
        .attr('stroke-width', 1.5)
        .attr('cursor', 'move');
    }

    // Capture dimensions and scale for transform updates
    const canvasRect = document.getElementById('inklink-mindmap-canvas')?.getBoundingClientRect();
    const canvasW = canvasRect?.width || window.innerWidth;
    const canvasH = canvasRect?.height || window.innerHeight;
    const currentScale = state.transform.scale;

    // --- DRAG BEHAVIOR ---
    const drag = d3.drag<SVGRectElement, unknown>()
      .subject(() => {
        // Use current rect position as the subject to maintain absolute pointer tracking
        return {
          x: parseFloat(viewport.attr('x')) || 0,
          y: parseFloat(viewport.attr('y')) || 0
        };
      })
      .on('drag', (event) => {
        // event.x/y are now the adjusted top-left coordinates in minimap space
        const worldX = invertX(event.x);
        const worldY = invertY(event.y);
        
        // Use latest state to avoid stale closure issues during rapid updates
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

    // --- UPDATE VIEWPORT DIMENSIONS ---
    const lx = (0 - state.transform.x) / currentScale;
    const ly = (0 - state.transform.y) / currentScale;
    const rw = canvasW / currentScale;
    const rh = canvasH / currentScale;

    viewport
      .attr('x', scaleX(lx))
      .attr('y', scaleY(ly))
      .attr('width', rw * scale)
      .attr('height', rh * scale);

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
        className="h-32 w-48 overflow-hidden rounded-lg border bg-background/80 shadow-lg backdrop-blur"
      >
         <svg ref={svgRef} className="h-full w-full" />
      </div>
    </div>
  );
}
