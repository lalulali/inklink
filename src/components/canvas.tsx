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

      // Wire up node selection and double-click logic
      renderer.onNodeClick((nodeId) => {
        globalState.setState({ selectedNode: nodeId });
      });

      renderer.onNodeDoubleClick((nodeId) => {
        // Find the node to get content from global state tree
        const findNode = (node: any, id: string): any => {
           if (node.id === id) return node;
           if (!node.children) return null;
           for (const child of node.children) {
              const res = findNode(child, id);
              if (res) return res;
           }
           return null;
        }
        
        const node = findNode(globalState.getState().tree, nodeId);
        if (node) {
           // 1. Show editor
           window.dispatchEvent(new CustomEvent('inklink-editor-show'));
           // 2. Reveal in editor
           // Delay slightly to allow editor to mount if it was hidden
           setTimeout(() => {
             window.dispatchEvent(new CustomEvent('inklink-editor-reveal', { 
               detail: { content: node.content, nodeId } 
             }));
           }, 50);
        }
      });

      // Recalculate layout on node toggle (collapse/expand)
      renderer.onNodeToggle((nodeId) => {
        const s = globalState.getState();
        if (!s.tree) return;

        const findAndToggle = (current: TreeNode): boolean => {
          if (current.id === nodeId) {
             current.collapsed = !current.collapsed;
             return true;
          }
          return current.children.some(child => findAndToggle(child));
        };

        if (findAndToggle(s.tree)) {
           // We replace the tree root reference to trigger the useEffect that runs the Layout calculation
           globalState.setState({ tree: { ...s.tree } });
        }
      });

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
          
          if (rendererRef.current) {
             // 1. Get current transform directly from renderer (source of truth)
             const current = rendererRef.current.getTransform();
             const next = {
               ...current,
               x: current.x + dx,
               y: current.y + dy
             };

             // 2. Update renderer IMMEDIATELY (prevents shakiness)
             rendererRef.current.setTransform(next);

             // 3. Sync global state without waiting for re-render cycle
             internalTransform.current = next;
             globalState.setState({ transform: next });
          }
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

    // Global Command Listeners for UI interaction
    const handleFitView = () => {
       if (rendererRef.current) (rendererRef.current as any).fitView?.();
    };

    const handleResetView = () => {
       if (rendererRef.current && containerRef.current) {
          const { width, height } = containerRef.current.getBoundingClientRect();
          rendererRef.current.setTransform({
             x: width / 2,
             y: height / 2,
             scale: 1,
          });
       }
    }

    window.addEventListener('inklink-fit-view', handleFitView);
    window.addEventListener('inklink-reset-view', handleResetView);
    
    return () => {
      observer.disconnect();
      window.removeEventListener('inklink-fit-view', handleFitView);
      window.removeEventListener('inklink-reset-view', handleResetView);
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
        // Find if we need to expand ancestors to make the node visible
        const s = globalState.getState();
        if (s.tree) {
          let treeChanged = false;
          
          // Pure recursive function to return an updated tree path
          const updateTree = (node: any, targetId: string): any => {
            if (node.id === targetId) return node;
            if (!node.children) return null;
            
            for (let i = 0; i < node.children.length; i++) {
              const result = updateTree(node.children[i], targetId);
              if (result) {
                if (node.collapsed) treeChanged = true;
                const newChildren = [...node.children];
                newChildren[i] = result;
                return { ...node, children: newChildren, collapsed: false };
              }
            }
            return null;
          };

          const newTree = updateTree(s.tree, currentId);
          if (newTree && treeChanged) {
             globalState.setState({ tree: newTree, isDirty: true });
             return; // Wait for next render cycle
          }
        }

        // If visible/available, focus and center
        const active = document.activeElement;
        const isSearchFocused = active?.closest('#inklink-search-panel');
        (rendererRef.current as any).focusNode?.(currentId, !!isSearchFocused);
      }
    }
  }, [state.searchResults, state.currentSearchIndex, state.tree]);

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
    <div 
      className="relative h-full w-full bg-slate-50/50 outline-none focus-within:ring-1 focus-within:ring-primary/20 transition-all duration-300" 
      id="inklink-mindmap-canvas-container"
      onMouseDown={() => {
        // Ensure clicking focusing the canvas for shortcuts
        document.getElementById('inklink-mindmap-canvas')?.focus();
      }}
      onClick={() => {
        // Only unselect if something was actually selected to avoid redundant updates
        if (globalState.getState().selectedNode) {
          globalState.setState({ selectedNode: null });
        }
      }}
    >
      <div 
        ref={containerRef} 
        className="h-full w-full overflow-hidden outline-none" 
        id="inklink-mindmap-canvas"
        aria-label="Mind map visualization canvas"
        tabIndex={0}
      />
      
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-muted-foreground opacity-50 select-none">
        {state.tree ? null : (
           <p className="text-sm font-medium">Import or paste Markdown to start...</p>
        )}
      </div>
    </div>
  );
}
