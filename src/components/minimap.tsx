/**
 * Feature: Minimap Component
 * Purpose: Provides a high-level overview of the entire mind map with navigation
 * Dependencies: D3.js, React hooks, viewport-culler via render state
 */

"use client";

import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import { globalState } from '@/core/state/state-manager';
import { cn } from '@/lib/utils';
import { ColorManager, RendererColors } from '@/core/theme/color-manager';
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
  const dragOffsetRef = useRef({ x: 0, y: 0 });

  // Persistent camera state for smooth auto-focus transitions
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

  // --- DRAG BEHAVIORS (Stable Instances) ---
  const { drag, bgDrag } = React.useMemo(() => {
    const d = d3.drag<SVGRectElement, unknown>()
      .filter((event) => !event.button || event.button === 0)
      .on('start', (event) => {
        setIsDragging(true);
        const { scale, oX, oY, minX: curMinX, minY: curMinY } = layoutRef.current;
        const worldX = ((event.x - oX) / scale) + curMinX;
        const worldY = ((event.y - oY) / scale) + curMinY;
        const currentTransform = globalState.getState().transform;
        
        dragOffsetRef.current.x = (-currentTransform.x / currentTransform.scale) - worldX;
        dragOffsetRef.current.y = (-currentTransform.y / currentTransform.scale) - worldY;
      })
      .on('drag', (event) => {
        const { scale, oX, oY, minX: curMinX, minY: curMinY, limitMinX, limitMaxX, limitMinY, limitMaxY } = layoutRef.current;
        const mouseWorldX = ((event.x - oX) / scale) + curMinX;
        const mouseWorldY = ((event.y - oY) / scale) + curMinY;
        
        const currentTransform = globalState.getState().transform;
        const canvasRect = document.getElementById('inklink-mindmap-canvas')?.getBoundingClientRect();
        const canvasW = canvasRect?.width || window.innerWidth;
        const canvasH = canvasRect?.height || window.innerHeight;
        const vWorldW = canvasW / currentTransform.scale;
        const vWorldH = canvasH / currentTransform.scale;

        let targetWorldX = mouseWorldX + dragOffsetRef.current.x;
        let targetWorldY = mouseWorldY + dragOffsetRef.current.y;
        
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

    const bgD = d3.drag<SVGSVGElement, unknown>()
      .filter((event) => !event.button || event.button === 0)
      .on('start', () => setIsDragging(true))
      .on('drag', (event) => {
        const { scale, oX, oY, minX: curMinX, minY: curMinY, limitMinX, limitMaxX, limitMinY, limitMaxY } = layoutRef.current;
        const currentTransform = globalState.getState().transform;
        const canvasRect = document.getElementById('inklink-mindmap-canvas')?.getBoundingClientRect();
        const canvasW = canvasRect?.width || window.innerWidth;
        const canvasH = canvasRect?.height || window.innerHeight;
        
        const worldX = ((event.x - oX) / scale) + curMinX;
        const worldY = ((event.y - oY) / scale) + curMinY;
        
        const targetWorldW = canvasW / currentTransform.scale;
        const targetWorldH = canvasH / currentTransform.scale;
        const clampedX = Math.max(limitMinX + targetWorldW/2, Math.min(limitMaxX - targetWorldW/2, worldX));
        const clampedY = Math.max(limitMinY + targetWorldH/2, Math.min(limitMaxY - targetWorldH/2, worldY));

        globalState.setState({
          transform: {
            ...currentTransform,
            x: canvasW / 2 - clampedX * currentTransform.scale,
            y: canvasH / 2 - clampedY * currentTransform.scale
          }
        });
      })
      .on('end', () => setIsDragging(false));

    return { drag: d, bgDrag: bgD };
  }, []);

  useEffect(() => {
    if (!svgRef.current) return;
    const svg = d3.select(svgRef.current);

    if (!state.tree) {
      svg.selectAll('*').remove();
      return;
    }
    const { width: mWidth, height: mHeight } = containerRef.current?.getBoundingClientRect() || { width: 192, height: 128 };
    
    const nodes: any[] = [];
    const links: any[] = [];
    let contentMinX = 0, contentMaxX = 0, contentMinY = 0, contentMaxY = 0;
    const rootPos = state.layoutPositions.get(state.tree.id) || { x: 0, y: 0 };

    const flatten = (n: any) => {
      const pos = state.layoutPositions.get(n.id);
      if (pos) {
        nodes.push({ ...n, x: pos.x, y: pos.y });
        const w = (n as any).metadata?.width || 100;
        const h = (n as any).metadata?.height || 40;
        if (pos.x > rootPos.x) { contentMinX = Math.min(contentMinX, pos.x); contentMaxX = Math.max(contentMaxX, pos.x + w); }
        else if (pos.x < rootPos.x) { contentMinX = Math.min(contentMinX, pos.x - w); contentMaxX = Math.max(contentMaxX, pos.x); }
        else { contentMinX = Math.min(contentMinX, pos.x - w / 2); contentMaxX = Math.max(contentMaxX, pos.x + w / 2); }
        contentMinY = Math.min(contentMinY, pos.y - h / 2);
        contentMaxY = Math.max(contentMaxY, pos.y + h / 2);
        if (n.children && !n.collapsed) {
          n.children.forEach((c: any) => {
            const cPos = state.layoutPositions.get(c.id);
            if (cPos) links.push({ source: pos, target: cPos });
            flatten(c);
          });
        }
      }
    };
    flatten(state.tree);

    const canvasRect = document.getElementById('inklink-mindmap-canvas')?.getBoundingClientRect();
    const canvasW = canvasRect?.width || window.innerWidth;
    const canvasH = canvasRect?.height || window.innerHeight;
    const currentScale = state.transform.scale;

    const vWorldX = (0 - state.transform.x) / currentScale;
    const vWorldY = (0 - state.transform.y) / currentScale;
    const vWorldW = canvasW / currentScale;
    const vWorldH = canvasH / currentScale;

    let targetMinX: number, targetMaxX: number, targetMinY: number, targetMaxY: number;

    if (isDragging || nodes.length < 50) {
      targetMinX = Infinity; targetMaxX = -Infinity; targetMinY = Infinity; targetMaxY = -Infinity;
      nodes.forEach(n => {
        targetMinX = Math.min(targetMinX, n.x); targetMaxX = Math.max(targetMaxX, n.x);
        targetMinY = Math.min(targetMinY, n.y); targetMaxY = Math.max(targetMaxY, n.y);
      });
      if (nodes.length === 0) { targetMinX = -500; targetMaxX = 500; targetMinY = -500; targetMaxY = 500; }
      else {
        if (targetMaxX - targetMinX < 400) { const midX = (targetMaxX + targetMinX) / 2; targetMinX = midX - 1000; targetMaxX = midX + 1000; }
        if (targetMaxY - targetMinY < 400) { const midY = (targetMaxY + targetMinY) / 2; targetMinY = midY - 800; targetMaxY = midY + 800; }
      }
    } else {
      const buffer = 400;
      targetMinX = vWorldX - buffer; targetMaxX = vWorldX + vWorldW + buffer;
      targetMinY = vWorldY - buffer; targetMaxY = vWorldY + vWorldH + buffer;
    }

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

    const limitMinX = Math.min(contentMinX - LAYOUT_CONFIG.PANNING.BUFFER_X, -canvasW / (2 * currentScale));
    const limitMaxX = Math.max(contentMaxX + LAYOUT_CONFIG.PANNING.BUFFER_X, canvasW / (2 * currentScale));
    const limitMinY = Math.min(contentMinY - LAYOUT_CONFIG.PANNING.BUFFER_Y, -canvasH / (2 * currentScale));
    const limitMaxY = Math.max(contentMaxY + LAYOUT_CONFIG.PANNING.BUFFER_Y, canvasH / (2 * currentScale));

    layoutRef.current = { 
      scale: minimapScale, oX: offsetX, oY: offsetY, minX, minY,
      limitMinX, limitMaxX, limitMinY, limitMaxY
    };

    const scaleX = (x: number) => ((x - minX) * minimapScale) + offsetX;
    const scaleY = (y: number) => ((y - minY) * minimapScale) + offsetY;

    let linksContainer = svg.select<SVGGElement>('g.links-skeleton');
    if (linksContainer.empty()) linksContainer = svg.insert('g', ':first-child').attr('class', 'links-skeleton');
    const skeletonLines = linksContainer.selectAll<SVGLineElement, any>('line.skeleton-link').data(links);
    skeletonLines.exit().remove();
    skeletonLines.enter().append('line').attr('class', 'skeleton-link').merge(skeletonLines as any)
      .attr('stroke', state.isDarkMode ? RendererColors.minimap.linkDark : RendererColors.minimap.linkLight)
      .attr('stroke-width', 1).attr('x1', d => scaleX(d.source.x)).attr('y1', d => scaleY(d.source.y)).attr('x2', d => scaleX(d.target.x)).attr('y2', d => scaleY(d.target.y));

    let nodesContainer = svg.select<SVGGElement>('g.nodes-dots');
    if (nodesContainer.empty()) nodesContainer = svg.append('g').attr('class', 'nodes-dots');
    const nodePills = nodesContainer.selectAll<SVGRectElement, any>('rect.node-pill').data(nodes, d => d.id);
    nodePills.exit().remove();
    nodePills.enter().append('rect').attr('class', 'node-pill').attr('rx', 1.5).merge(nodePills as any)
      .attr('fill', d => state.isDarkMode ? (d.color || RendererColors.minimap.nodeDefault) : (ColorManager.getThemeShade(d.color, state.isDarkMode) || RendererColors.minimap.nodeDefault))
      .attr('width', d => d.depth === 0 ? 10 : (d.depth === 1 ? 7 : 4)).attr('height', d => d.depth === 0 ? 6 : (d.depth === 1 ? 4 : 3))
      .attr('x', d => scaleX(d.x) - (d.depth === 0 ? 5 : (d.depth === 1 ? 3.5 : 2))).attr('y', d => scaleY(d.y) - (d.depth === 0 ? 3 : (d.depth === 1 ? 2 : 1.5)));

    const vw = vWorldW * minimapScale;
    const vh = vWorldH * minimapScale;
    const vx = scaleX(vWorldX);
    const vy = scaleY(vWorldY);

    let overlay = svg.select<SVGPathElement>('path.minimap-overlay');
    if (overlay.empty()) overlay = svg.append('path').attr('class', 'minimap-overlay').attr('fill', state.isDarkMode ? RendererColors.minimap.overlayDark : RendererColors.minimap.overlayLight).attr('fill-rule', 'evenodd').attr('pointer-events', 'none');
    overlay.attr('d', `M 0 0 H ${mWidth} V ${mHeight} H 0 Z M ${vx} ${vy} V ${vy + vh} H ${vx + vw} V ${vy} Z`);

    let viewport = svg.select<SVGRectElement>('rect.viewport-rect');
    if (viewport.empty()) {
      viewport = svg.append('rect').attr('class', 'viewport-rect').attr('cursor', 'move').style('touch-action', 'none').style('pointer-events', 'all');
    }
    viewport.attr('fill', RendererColors.minimap.viewportFill).attr('stroke', RendererColors.minimap.viewportStroke).attr('stroke-width', 2).attr('x', vx).attr('y', vy).attr('width', Math.max(8, vw)).attr('height', Math.max(8, vh));

    let handle = svg.select<SVGCircleElement>('circle.viewport-handle');
    if (handle.empty()) handle = svg.append('circle').attr('class', 'viewport-handle').attr('r', 3).attr('fill', RendererColors.minimap.handleFill).attr('stroke', 'white').attr('stroke-width', 1).attr('pointer-events', 'none');
    handle.attr('cx', vx + vw / 2).attr('cy', vy + vh / 2).attr('opacity', vw < 20 ? 1 : 0.4);

    // BIND DRAGS
    viewport.call(drag as any);
    svg.call(bgDrag as any);

    svg.on('click', (event) => {
      if (event.defaultPrevented) return;
      const [mx, my] = d3.pointer(event);
      const { scale, oX, oY, minX: curMinX, minY: curMinY, limitMinX, limitMaxX, limitMinY, limitMaxY } = layoutRef.current;
      const worldX = ((mx - oX) / scale) + curMinX;
      const worldY = ((my - oY) / scale) + curMinY;
      const targetWorldW = canvasW / (state.transform.scale);
      const targetWorldH = canvasH / (state.transform.scale);
      const clampedX = Math.max(limitMinX + targetWorldW/2, Math.min(limitMaxX - targetWorldW/2, worldX));
      const clampedY = Math.max(limitMinY + targetWorldH/2, Math.min(limitMaxY - targetWorldH/2, worldY));
      globalState.setState({ transform: { ...state.transform, x: canvasW / 2 - clampedX * state.transform.scale, y: canvasH / 2 - clampedY * state.transform.scale } });
    });
  }, [state.tree, state.layoutPositions, state.transform, resizeToggle, state.isDarkMode, isDragging, drag, bgDrag]);

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
        className="h-32 w-48 overflow-hidden rounded-lg border bg-background shadow-lg touch-none"
        style={{ backgroundColor: state.isDarkMode ? RendererColors.minimap.bgDark : RendererColors.minimap.bgLight }}
      >
         <svg ref={svgRef} className="h-full w-full touch-none" />
      </div>
    </div>
  );
}
