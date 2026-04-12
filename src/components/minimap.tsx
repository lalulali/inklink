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
import { LAYOUT_CONFIG } from '@/core/layout/layout-config';

/**
 * Minimap provides a smaller navigation context for the main canvas
 */
export function Minimap() {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const [state, setState] = React.useState(globalState.getState());
  const [resizeToggle, setResizeToggle] = React.useState(0);
  const [isDragging, setIsDragging] = React.useState(false);

  // Persistent camera state for smooth auto-focus transitions
  const cameraRef = useRef({ x: 0, y: 0, k: 1 });
  const layoutRef = useRef({ 
    scale: 1, oX: 0, oY: 0, minX: 0, minY: 0,
    limitMinX: -5000, limitMaxX: 5000, limitMinY: -5000, limitMaxY: 5000
  });

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
    if (!svgRef.current || !state.tree) return;
    
    const svg = d3.select(svgRef.current);
    const { width: mWidth, height: mHeight } = containerRef.current?.getBoundingClientRect() || { width: 192, height: 128 };
    
    // ... (rest of logic)

    // 1. FLATTEN VISIBLE TREE & CALCULATE CONTENT BOUNDS (for constraints)
    const nodes: any[] = [];
    const links: any[] = [];
    let contentMinX = 0, contentMaxX = 0, contentMinY = 0, contentMaxY = 0;
    const rootPos = state.layoutPositions.get(state.tree.id) || { x: 0, y: 0 };

    const flatten = (n: any) => {
      const pos = state.layoutPositions.get(n.id);
      if (pos) {
        nodes.push({ ...n, x: pos.x, y: pos.y });

        // Content Bounds Calculation (Sync with D3Renderer)
        const w = (n as any).metadata?.width || 100;
        const h = (n as any).metadata?.height || 40;
        if (pos.x > rootPos.x) { // Right side
          contentMinX = Math.min(contentMinX, pos.x);
          contentMaxX = Math.max(contentMaxX, pos.x + w);
        } else if (pos.x < rootPos.x) { // Left side
          contentMinX = Math.min(contentMinX, pos.x - w);
          contentMaxX = Math.max(contentMaxX, pos.x);
        } else { // Root
          contentMinX = Math.min(contentMinX, pos.x - w / 2);
          contentMaxX = Math.max(contentMaxX, pos.x + w / 2);
        }
        contentMinY = Math.min(contentMinY, pos.y - h / 2);
        contentMaxY = Math.max(contentMaxY, pos.y + h / 2);

        if (n.children && !n.collapsed) {
          n.children.forEach((c: any) => {
            const cPos = state.layoutPositions.get(c.id);
            if (cPos) {
              links.push({ source: pos, target: cPos });
            }
            flatten(c);
          });
        }
      }
    };
    flatten(state.tree);

    // 2. CALCULATE BOUNDS (GLOBAL vs LOCAL AUTO-FOCUS)
    const canvasRect = document.getElementById('inklink-mindmap-canvas')?.getBoundingClientRect();
    const canvasW = canvasRect?.width || window.innerWidth;
    const canvasH = canvasRect?.height || window.innerHeight;
    const currentScale = state.transform.scale;

    // Viewport in world coordinates
    const vWorldX = (0 - state.transform.x) / currentScale;
    const vWorldY = (0 - state.transform.y) / currentScale;
    const vWorldW = canvasW / currentScale;
    const vWorldH = canvasH / currentScale;

    let targetMinX: number, targetMaxX: number, targetMinY: number, targetMaxY: number;

    if (isDragging || nodes.length < 50) {
      // GLOBAL VIEW: Show entire map
      targetMinX = Infinity; targetMaxX = -Infinity; targetMinY = Infinity; targetMaxY = -Infinity;
      nodes.forEach(n => {
        targetMinX = Math.min(targetMinX, n.x); targetMaxX = Math.max(targetMaxX, n.x);
        targetMinY = Math.min(targetMinY, n.y); targetMaxY = Math.max(targetMaxY, n.y);
      });
      // Safety defaults
      if (nodes.length === 0) {
        targetMinX = -500; targetMaxX = 500; targetMinY = -500; targetMaxY = 500;
      }
    } else {
      // LOCAL AUTO-FOCUS: Center on viewport with tighter buffer for a 'bigger' scale
      const buffer = 400; // Reduced from 800 for more zoom
      targetMinX = vWorldX - buffer;
      targetMaxX = vWorldX + vWorldW + buffer;
      targetMinY = vWorldY - buffer;
      targetMaxY = vWorldY + vWorldH + buffer;
    }

    // Add padding to target bounds (Tighter 10% padding for more zoom)
    const contentW = targetMaxX - targetMinX;
    const contentH = targetMaxY - targetMinY;
    const paddingX = contentW * 0.10;
    const paddingY = contentH * 0.10;
    const minX = targetMinX - paddingX;
    const maxX = targetMaxX + paddingX;
    const minY = targetMinY - paddingY;
    const maxY = targetMaxY + paddingY;

    const mapW = maxX - minX;
    const mapH = maxY - minY;
    const minimapScale = Math.min(mWidth / mapW, mHeight / mapH) || 1;
    const offsetX = (mWidth - mapW * minimapScale) / 2;
    const offsetY = (mHeight - mapH * minimapScale) / 2;

    // Calculate Panning Limits (Sync with D3Renderer translateExtent)
    const limitMinX = Math.min(contentMinX - LAYOUT_CONFIG.PANNING.BUFFER_X, -canvasW / (2 * currentScale));
    const limitMaxX = Math.max(contentMaxX + LAYOUT_CONFIG.PANNING.BUFFER_X, canvasW / (2 * currentScale));
    const limitMinY = Math.min(contentMinY - LAYOUT_CONFIG.PANNING.BUFFER_Y, -canvasH / (2 * currentScale));
    const limitMaxY = Math.max(contentMaxY + LAYOUT_CONFIG.PANNING.BUFFER_Y, canvasH / (2 * currentScale));

    // Update ref for stable access in async handlers (drag/click)
    layoutRef.current = { 
      scale: minimapScale, oX: offsetX, oY: offsetY, minX, minY,
      limitMinX, limitMaxX, limitMinY, limitMaxY
    };

    const scaleX = (x: number) => ((x - minX) * minimapScale) + offsetX;
    const scaleY = (y: number) => ((y - minY) * minimapScale) + offsetY;

    // 3. RENDER CONTENT
    // --- LINKS SKELETON ---
    let linksContainer = svg.select<SVGGElement>('g.links-skeleton');
    if (linksContainer.empty()) linksContainer = svg.insert('g', ':first-child').attr('class', 'links-skeleton');
    
    const skeletonLines = linksContainer.selectAll<SVGLineElement, any>('line.skeleton-link')
      .data(links);
    skeletonLines.exit().remove();
    skeletonLines.enter().append('line').attr('class', 'skeleton-link')
      .merge(skeletonLines as any)
      .attr('stroke', state.isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)')
      .attr('stroke-width', 1)
      .attr('x1', d => scaleX(d.source.x))
      .attr('y1', d => scaleY(d.source.y))
      .attr('x2', d => scaleX(d.target.x))
      .attr('y2', d => scaleY(d.target.y));

    // --- NODE PILLS ---
    let nodesContainer = svg.select<SVGGElement>('g.nodes-dots');
    if (nodesContainer.empty()) nodesContainer = svg.append('g').attr('class', 'nodes-dots');

    const nodePills = nodesContainer.selectAll<SVGRectElement, any>('rect.node-pill')
      .data(nodes, d => d.id);

    nodePills.exit().remove();
    nodePills.enter()
      .append('rect')
      .attr('class', 'node-pill')
      .attr('rx', 1.5)
      .merge(nodePills as any)
      .attr('fill', d => state.isDarkMode ? (d.color || '#94a3b8') : (ColorManager.getThemeShade(d.color, state.isDarkMode) || '#94a3b8'))
      .attr('width', d => d.depth === 0 ? 10 : (d.depth === 1 ? 7 : 4))
      .attr('height', d => d.depth === 0 ? 6 : (d.depth === 1 ? 4 : 3))
      .attr('x', d => scaleX(d.x) - (d.depth === 0 ? 5 : (d.depth === 1 ? 3.5 : 2)))
      .attr('y', d => scaleY(d.y) - (d.depth === 0 ? 3 : (d.depth === 1 ? 2 : 1.5)));

    // --- VIEWPORT NAVIGATION ---
    const vw = vWorldW * minimapScale;
    const vh = vWorldH * minimapScale;
    const vx = scaleX(vWorldX);
    const vy = scaleY(vWorldY);

    // Lighthouse Overlay
    let overlay = svg.select<SVGPathElement>('path.minimap-overlay');
    if (overlay.empty()) {
      overlay = svg.append('path').attr('class', 'minimap-overlay')
        .attr('fill', state.isDarkMode ? 'rgba(0, 0, 0, 0.4)' : 'rgba(0, 0, 0, 0.2)')
        .attr('fill-rule', 'evenodd').attr('pointer-events', 'none');
    }
    overlay.attr('d', `M 0 0 H ${mWidth} V ${mHeight} H 0 Z M ${vx} ${vy} V ${vy + vh} H ${vx + vw} V ${vy} Z`);

    // Viewport Rect
    let viewport = svg.select<SVGRectElement>('rect.viewport-rect');
    if (viewport.empty()) {
      viewport = svg.append('rect').attr('class', 'viewport-rect')
        .attr('fill', 'rgba(59, 130, 246, 0.15)')
        .attr('stroke', '#3b82f6').attr('stroke-width', 1.5).attr('cursor', 'move');
    }
    viewport.attr('x', vx).attr('y', vy).attr('width', Math.max(8, vw)).attr('height', Math.max(8, vh));

    // Handle
    let handle = svg.select<SVGCircleElement>('circle.viewport-handle');
    if (handle.empty()) {
      handle = svg.append('circle').attr('class', 'viewport-handle').attr('r', 3)
        .attr('fill', '#3b82f6').attr('stroke', 'white').attr('stroke-width', 1).attr('pointer-events', 'none');
    }
    handle.attr('cx', vx + vw / 2).attr('cy', vy + vh / 2).attr('opacity', vw < 20 ? 1 : 0.4);

    // --- DRAG BEHAVIOR & POWER ZOOM ---
    const dragOffsetRef = { x: 0, y: 0 };
    const drag = d3.drag<SVGRectElement, unknown>()
      .on('start', (event) => {
        setIsDragging(true);
        // Calculate the initial offset between mouse-world and camera-world
        const { scale, oX, oY, minX: curMinX, minY: curMinY } = layoutRef.current;
        const worldX = ((event.x - oX) / scale) + curMinX;
        const worldY = ((event.y - oY) / scale) + curMinY;
        const currentTransform = globalState.getState().transform;
        const cameraWorldX = -currentTransform.x / currentTransform.scale;
        const cameraWorldY = -currentTransform.y / currentTransform.scale;
        
        dragOffsetRef.x = cameraWorldX - worldX;
        dragOffsetRef.y = cameraWorldY - worldY;
      })
      .on('drag', (event) => {
        // Find world coordinates of current mouse position using latest layout
        const { scale, oX, oY, minX: curMinX, minY: curMinY, limitMinX, limitMaxX, limitMinY, limitMaxY } = layoutRef.current;
        const mouseWorldX = ((event.x - oX) / scale) + curMinX;
        const mouseWorldY = ((event.y - oY) / scale) + curMinY;
        
        const currentTransform = globalState.getState().transform;
        let targetWorldX = mouseWorldX + dragOffsetRef.x;
        let targetWorldY = mouseWorldY + dragOffsetRef.y;
        
        // Apply Panning Constraints (Clamp)
        targetWorldX = Math.max(limitMinX, Math.min(limitMaxX - vWorldW, targetWorldX));
        targetWorldY = Math.max(limitMinY, Math.min(limitMaxY - vWorldH, targetWorldY));
        
        globalState.setState({
          transform: {
            ...currentTransform,
            x: -targetWorldX * currentTransform.scale,
            y: -targetWorldY * currentTransform.scale
          }
        });
      })
      .on('end', () => setIsDragging(false));

    viewport.call(drag as any);

    // --- CLICK TO JUMP ---
    svg.on('click', (event) => {
      if (event.defaultPrevented) return;
      const [mx, my] = d3.pointer(event);
      const { scale, oX, oY, minX: curMinX, minY: curMinY, limitMinX, limitMaxX, limitMinY, limitMaxY } = layoutRef.current;
      const worldX = ((mx - oX) / scale) + curMinX;
      const worldY = ((my - oY) / scale) + curMinY;
      
      // Clamp jump position
      const targetWorldW = canvasW / (state.transform.scale);
      const targetWorldH = canvasH / (state.transform.scale);
      const clampedX = Math.max(limitMinX + targetWorldW/2, Math.min(limitMaxX - targetWorldW/2, worldX));
      const clampedY = Math.max(limitMinY + targetWorldH/2, Math.min(limitMaxY - targetWorldH/2, worldY));

      globalState.setState({
        transform: {
          ...state.transform,
          x: canvasW / 2 - clampedX * state.transform.scale,
          y: canvasH / 2 - clampedY * state.transform.scale
        }
      });
    });

  }, [state.tree, state.layoutPositions, state.transform, resizeToggle, state.isDarkMode, isDragging]);

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
        style={{ backgroundColor: state.isDarkMode ? '#0f172a' : '#ffffff' }}
      >
         <svg ref={svgRef} className="h-full w-full" />
      </div>
    </div>
  );
}
