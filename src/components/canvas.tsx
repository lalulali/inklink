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

/**
 * Main application canvas
 * Wraps the renderer adapter and handles container lifecycle/resizing
 */
export function Canvas() {
  const containerRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<RendererAdapter | null>(null);
  const [state, setState] = React.useState(globalState.getState());
  const internalTransform = useRef(state.transform);

  // Subscribe to changes
  useEffect(() => {
    return globalState.subscribe(s => setState(s));
  }, []);

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
    
    // Resize handler for browser window changes
    const onResize = () => {
      console.debug('Canvas container resized');
    };
    window.addEventListener('resize', onResize);
    
    return () => {
      window.removeEventListener('resize', onResize);
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

  const lastTreeRef = useRef<TreeNode | null>(null);
  const lastLayoutRef = useRef(state.layoutDirection);

  /**
   * Trigger Layout Calculation and Rendering
   */
  useEffect(() => {
    const renderNodeTree = () => {
      if (rendererRef.current && state.tree && containerRef.current) {
        const { width, height } = containerRef.current.getBoundingClientRect();
        const layout = LayoutFactory.create(state.layoutDirection);
        const positions = layout.calculateLayout(state.tree, { width, height });
        
        // Update renderer
        rendererRef.current.render(state.tree, positions);

        // Share positions with other components if changed
        if (state.tree !== lastTreeRef.current || state.layoutDirection !== lastLayoutRef.current) {
          globalState.setState({ layoutPositions: positions });
          lastTreeRef.current = state.tree;
          lastLayoutRef.current = state.layoutDirection;
        }
      }
    };

    renderNodeTree();
    
    window.addEventListener('resize', renderNodeTree);
    return () => window.removeEventListener('resize', renderNodeTree);
  }, [state.tree, state.layoutDirection]);

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
