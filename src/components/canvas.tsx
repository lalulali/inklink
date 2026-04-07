/**
 * Feature: Canvas Component
 * Purpose: Provides a container for the mind map SVG visualization
 * Dependencies: D3Renderer via PlatformFactory, React hooks
 */

"use client";

import React, { useEffect, useRef } from 'react';
import { PlatformFactory, PlatformType } from '@/platform';
import { RendererAdapter } from '@/platform/adapters';
import { TreeNode } from '@/core/types';
import { globalState } from '@/core/state/state-manager';
import { LayoutFactory } from '@/core/layout/layout-factory';
import { useTheme } from 'next-themes';
import { useWebPlatform } from '@/platform/web/web-platform-context';
import { useFileDrop } from '@/hooks/use-file-drop';
import { cn } from '@/lib/utils';

import { getVsCodeApi } from '@/platform/vscode/vscode-api';

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
  
  const { autoSave } = useWebPlatform();

  const { isDragging, handleDragOver, handleDragLeave, handleDrop } = useFileDrop(autoSave);

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
           globalState.setState({ tree: { ...s.tree } });
        }
      });

      // Recalculate layout on block toggle (code/quote expansion)
      if (renderer.onBlockToggle) {
        renderer.onBlockToggle(() => {
          const s = globalState.getState();
          if (s.tree) {
             globalState.setState({ tree: { ...s.tree } });
          }
        });
      }

      // Handle link clicks
      if (renderer.onNodeLinkClick) {
        renderer.onNodeLinkClick((url) => {
          if (factory.getPlatform() === PlatformType.VSCode) {
            const vscodeApi = getVsCodeApi();
            if (vscodeApi) {
              vscodeApi.postMessage({ command: 'openLink', url });
              return;
            }
          }
          window.open(url, '_blank');
        });
      }

      rendererRef.current = renderer;
    }
    
    // Use ResizeObserver to keep canvas centered when dimensions change
    let prevWidth = 0;
    let prevHeight = 0;
    
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        
        if (prevWidth > 0 && prevHeight > 0 && (prevWidth !== width || prevHeight !== height)) {
          const dx = (width - prevWidth) / 2;
          const dy = (height - prevHeight) / 2;
          
          if (rendererRef.current) {
             const current = rendererRef.current.getTransform();
             const next = {
               ...current,
               x: current.x + dx,
               y: current.y + dy
             };

             rendererRef.current.setTransform(next);
             internalTransform.current = next;
             globalState.setState({ transform: next });
          }
        } else if (prevWidth === 0 && prevHeight === 0) {
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

    const handleFocusNode = (e: any) => {
      const { nodeId } = e.detail;
      if (!rendererRef.current) return;

      const s = globalState.getState();
      if (!s.tree) return;

      let treeChanged = false;
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

      const newTree = updateTree(s.tree, nodeId);
      if (newTree && treeChanged) {
        globalState.setState({ tree: newTree });
        setTimeout(() => {
          (rendererRef.current as any).focusNode?.(nodeId, true);
          globalState.setState({ selectedNode: nodeId });
        }, 150);
      } else if (newTree) {
        (rendererRef.current as any).focusNode?.(nodeId, true);
        globalState.setState({ selectedNode: nodeId });
      }
    };

    window.addEventListener('inklink-canvas-focus-node', handleFocusNode);
    
    return () => {
      observer.disconnect();
      window.removeEventListener('inklink-fit-view', handleFitView);
      window.removeEventListener('inklink-reset-view', handleResetView);
      window.removeEventListener('inklink-canvas-focus-node', handleFocusNode);
      if (renderer) {
          renderer.clear();
      }
      rendererRef.current = null;
    };
  }, []);

  /**
   * Sync external transform changes
   */
  useEffect(() => {
    if (rendererRef.current) {
        const t1 = state.transform;
        const t2 = internalTransform.current;
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
        const s = globalState.getState();
        if (s.tree) {
          let treeChanged = false;
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
             return;
          }
        }

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
    if (rendererRef.current && containerRef.current) {
      if (state.tree) {
        const { width, height } = containerRef.current.getBoundingClientRect();
        const layout = LayoutFactory.create(state.layoutDirection);
        const positions = layout.calculateLayout(state.tree, { width, height });
        
        rendererRef.current.render(state.tree, positions, state.isDarkMode);

        if (state.tree !== lastTreeRef.current || state.layoutDirection !== lastLayoutRef.current) {
          globalState.setState({ layoutPositions: positions });
          lastTreeRef.current = state.tree;
          lastLayoutRef.current = state.layoutDirection;
        }
      } else {
        rendererRef.current.clear();
        lastTreeRef.current = null;
      }
    }
  }, [state.tree, state.layoutDirection, state.isDarkMode]);

  return (
    <div 
      className={cn(
        "relative h-full w-full bg-slate-50/50 outline-none focus-within:ring-1 focus-within:ring-primary/20",
        !state.isResizing && "transition-all duration-300",
        isDragging && "bg-primary/5 ring-1 ring-primary/40 ring-inset"
      )}
      id="inklink-mindmap-canvas-container"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onMouseDown={() => {
        document.getElementById('inklink-mindmap-canvas')?.focus();
      }}
      onClick={() => {
        if (globalState.getState().selectedNode) {
          globalState.setState({ selectedNode: null });
          // Clear highlight in editor as well
          window.dispatchEvent(new CustomEvent('inklink-editor-clear-highlight'));
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
      
      {isDragging && (
        <div className="pointer-events-none absolute inset-0 z-50 flex flex-col items-center justify-center bg-background/80 animate-in fade-in zoom-in-95 duration-200">
           <div className="p-8 border-2 border-dashed border-primary/40 rounded-2xl flex flex-col items-center gap-4 bg-background shadow-xl">
             <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="12" y1="18" x2="12" y2="12"/><polyline points="9 15 12 12 15 15"/></svg>
             </div>
             <div className="text-center">
               <p className="text-lg font-bold text-foreground">Drop Mind Map File</p>
               <p className="text-sm text-muted-foreground">Only Markdown (.md) files are supported</p>
             </div>
           </div>
        </div>
      )}

      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-muted-foreground opacity-50 select-none">
        {state.tree ? null : (
           <p className="text-sm font-medium">Import or drag .md file here to start...</p>
        )}
      </div>
    </div>
  );
}
