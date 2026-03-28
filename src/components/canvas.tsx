/**
 * Feature: Canvas Component
 * Purpose: Provides a container for the mind map SVG visualization
 * Dependencies: D3Renderer via PlatformFactory, React hooks
 */

"use client";

import React, { useEffect, useRef } from 'react';
import { PlatformFactory } from '@/platform';
import { RendererAdapter } from '@/platform/adapters';
import { TreeNode } from '@/core/types';
import { globalState } from '@/core/state/state-manager';
import { LayoutFactory } from '@/core/layout/layout-factory';
import { useTheme } from 'next-themes';

/**
 * Main application canvas
 * Wraps the renderer adapter and handles container lifecycle/resizing
 */
export function Canvas() {
  const containerRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<RendererAdapter | null>(null);
  const [state, setState] = React.useState(globalState.getState());
  const { resolvedTheme } = useTheme();
  const internalTransform = useRef(state.transform);

  // Subscribe to changes
  useEffect(() => {
    return globalState.subscribe(s => setState(s));
  }, []);

  // Sync theme
  useEffect(() => {
    globalState.setState({ isDarkMode: resolvedTheme === 'dark' });
  }, [resolvedTheme]);

  /**
   * Initialize renderer on mount
   */
  useEffect(() => {
    let renderer: RendererAdapter | null = null;
    if (containerRef.current) {
      const factory = PlatformFactory.getInstance();
      renderer = factory.createRendererAdapter();
      renderer.initialize(containerRef.current);
      
      // Wire up viewport sync
      renderer.onTransform = (transform) => {
        internalTransform.current = transform;
        globalState.setState({ transform });
      };

      rendererRef.current = renderer;
    }
    
    // Use ResizeObserver to keep canvas centered when dimensions change (e.g., opening editor)
    let prevWidth = 0;
    let prevHeight = 0;
    
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        
        if (prevWidth > 0 && prevHeight > 0 && (prevWidth !== width || prevHeight !== height)) {
          // Adjust transform to keep the same world point in the center
          const dx = (width - prevWidth) / 2;
          const dy = (height - prevHeight) / 2;
          const currentTransform = globalState.getState().transform;
          
          globalState.setState({
            transform: {
              ...currentTransform,
              x: currentTransform.x + dx,
              y: currentTransform.y + dy
            }
          });
        } else if (prevWidth === 0 && prevHeight === 0) {
          // On first render, if transform is default (0,0), center it.
          const currentTransform = globalState.getState().transform;
          if (currentTransform.x === 0 && currentTransform.y === 0) {
            globalState.setState({
               transform: { ...currentTransform, x: width / 2, y: height / 2 }
            });
          }
        }
        
        prevWidth = width;
        prevHeight = height;
      }
    });

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }
    
    return () => {
      observer.disconnect();
      if (renderer) {
          renderer.clear();
      }
      rendererRef.current = null;
    };
  }, []);

  /**
   * Sync external transform changes (Minimap -> State -> D3)
   */
  useEffect(() => {
    if (rendererRef.current) {
        const t1 = state.transform;
        const t2 = internalTransform.current;
        // Float precision check
        if (Math.abs(t1.x - t2.x) > 0.1 || Math.abs(t1.y - t2.y) > 0.1 || Math.abs(t1.scale - t2.scale) > 0.001) {
          rendererRef.current.setTransform(t1);
          internalTransform.current = t1;
        }
    }
  }, [state.transform]);

  /**
   * Sync search results
   */
  useEffect(() => {
    if (rendererRef.current) {
      rendererRef.current.highlightNodes(state.searchResults);
      
      const currentId = state.searchResults[state.currentSearchIndex];
      if (currentId) {
        (rendererRef.current as any).focusNode?.(currentId);
      }
    }
  }, [state.searchResults, state.currentSearchIndex]);

  /**
   * Sync selected node
   */
  useEffect(() => {
    if (rendererRef.current && (rendererRef.current as any).setSelectedNode) {
      (rendererRef.current as any).setSelectedNode(state.selectedNode);
    }
  }, [state.selectedNode]);

  const lastTreeRef = useRef<TreeNode | null>(null);
  const lastLayoutRef = useRef(state.layoutDirection);

  /**
   * Trigger Layout Calculation and Rendering
   */
  useEffect(() => {
    const renderNodeTree = () => {
      if (rendererRef.current && containerRef.current) {
        if (state.tree) {
          const { width, height } = containerRef.current.getBoundingClientRect();
          const layout = LayoutFactory.create(state.layoutDirection);
          const positions = layout.calculateLayout(state.tree, { width, height });
          
          // Update renderer
          rendererRef.current.render(state.tree, positions, state.isDarkMode);

          // Share positions with other components if changed
          if (state.tree !== lastTreeRef.current || state.layoutDirection !== lastLayoutRef.current) {
            globalState.setState({ layoutPositions: positions });
            lastTreeRef.current = state.tree;
            lastLayoutRef.current = state.layoutDirection;
          }
        } else {
          // Clear the canvas if there's no tree
          rendererRef.current.clear();
          lastTreeRef.current = null;
        }
      }
    };

    renderNodeTree();
    
    return () => {};
  }, [state.tree, state.layoutDirection, state.isDarkMode]);

  return (
    <div className="relative h-full w-full bg-slate-50/50" id="inklink-mindmap-canvas-container">
      <div 
        ref={containerRef} 
        className="h-full w-full overflow-hidden" 
        id="inklink-mindmap-canvas"
        aria-label="Mind map visualization canvas"
      />
      
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-muted-foreground opacity-50 select-none">
        {state.tree ? null : (
           <p className="text-sm font-medium">Import or paste Markdown to start...</p>
        )}
      </div>
    </div>
  );
}
