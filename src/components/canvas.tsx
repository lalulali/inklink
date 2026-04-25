/**
 * Feature: Canvas Component
 * Purpose: Provides a container for the mind map SVG visualization
 * Dependencies: D3Renderer via PlatformFactory, React hooks
 */

'use client';

import React, { useEffect, useRef } from 'react';
import { PlatformFactory, PlatformType } from '@/platform';
import { RendererAdapter } from '@/platform/adapters';
import { TreeNode } from '@/core/types';
import { globalState } from '@/core/state/state-manager';
import { LayoutFactory } from '@/core/layout/layout-factory';
import { useTheme } from 'next-themes';
import { useWebPlatform } from '@/platform/web/web-platform-context';
import { useFileDrop } from '@/hooks/use-file-drop';
import { cn, getModKey } from '@/lib/utils';
import { Zap as ZapIcon, BookOpen, Keyboard } from 'lucide-react';
import { Button } from '@/components/ui/button';

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
  const lastFocusTime = useRef(0);
  const [modKey, setModKey] = React.useState('Ctrl');

  const { autoSave } = useWebPlatform();

  const { isDragging, handleDragOver, handleDragLeave, handleDrop } = useFileDrop(autoSave);

  // Subscribe to changes
  useEffect(() => {
    setModKey(getModKey());
    return globalState.subscribe((s) => setState(s));
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
        };

        const node = findNode(globalState.getState().tree, nodeId);
        if (node) {
          // 1. Show editor
          window.dispatchEvent(new CustomEvent('inklink-editor-show'));
          // 2. Reveal in editor
          window.dispatchEvent(
            new CustomEvent('inklink-editor-reveal', {
              detail: {
                content: node.content,
                nodeId,
                sourceLine: node.metadata?.sourceLine ?? -1,
              },
            })
          );
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
          return current.children.some((child) => findAndToggle(child));
        };

        if (findAndToggle(s.tree)) {
          globalState.setState({ tree: { ...s.tree } });
        }
      });

      renderer.onNodeUpdate((nodeId) => {
        const s = globalState.getState();
        if (s.tree) {
          // Trigger a full state update to force re-layout calculation
          globalState.setState({ tree: { ...s.tree } });
        }
      });

      // Handle node image clicks (trigger lightbox)
      if (renderer.onNodeImageClick) {
        renderer.onNodeImageClick((url, alt, link) => {
          window.dispatchEvent(
            new CustomEvent('inklink-image-preview', {
              detail: { url, alt, link },
            })
          );
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
              y: current.y + dy,
            };

            rendererRef.current.setTransform(next);
            internalTransform.current = next;
            globalState.setState({ transform: next });
          }
        } else if (prevWidth === 0 && prevHeight === 0) {
          const currentTransform = globalState.getState().transform;
          if (currentTransform.x === 0 && currentTransform.y === 0) {
            // Feature: Default zoom for narrow resolutions (e.g. phones)
            const isNarrow = width < 464;
            globalState.setState({
              transform: {
                ...currentTransform,
                x: width / 2,
                y: height / 2,
                scale: isNarrow ? 0.75 : 1,
              },
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
    };

    window.addEventListener('inklink-fit-view', handleFitView);
    window.addEventListener('inklink-reset-view', handleResetView);

    const handleFocusNode = (e: any) => {
      const { nodeId, lineIndex } = e.detail;
      if (!rendererRef.current) return;

      // Throttle rapid focus requests from cursor navigation (e.g. holding Down arrow)
      const now = Date.now();
      if (now - lastFocusTime.current < 50 && !nodeId) return;
      lastFocusTime.current = now;

      const s = globalState.getState();
      if (!s.tree) return;

      let treeChanged = false;
      let targetNodeId = nodeId;

      // If we only have a lineIndex (from editor navigation), find the corresponding node ID
      if (!targetNodeId && typeof lineIndex === 'number') {
        const findNodeByLine = (node: any, line: number): string | null => {
          if (node.children) {
            for (const child of node.children) {
              const res = findNodeByLine(child, line);
              if (res) return res;
            }
          }
          if (
            typeof node.metadata?.sourceLine === 'number' &&
            typeof node.metadata?.sourceLineEnd === 'number'
          ) {
            if (line >= node.metadata.sourceLine && line <= node.metadata.sourceLineEnd) {
              return node.id;
            }
          }
          return null;
        };
        targetNodeId = findNodeByLine(s.tree, lineIndex);
      }

      if (!targetNodeId) return;

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

      const newTree = updateTree(s.tree, targetNodeId);
      if (newTree && treeChanged) {
        globalState.setState({ tree: newTree });
        // Wait for React to apply tree state and for renderer useEffect to recalculate positions
        setTimeout(() => {
          if (rendererRef.current) {
            (rendererRef.current as any).focusNode?.(targetNodeId, true);
          }
          globalState.setState({ selectedNode: targetNodeId });
        }, 150);
      } else if (newTree) {
        // If node was already expanded, skip state update and focus immediately
        (rendererRef.current as any).focusNode?.(targetNodeId, true);
        globalState.setState({ selectedNode: targetNodeId });
      }
    };

    window.addEventListener('inklink-canvas-focus-node', handleFocusNode);

    return () => {
      observer.disconnect();
      window.removeEventListener('inklink-fit-view', handleFitView);
      window.removeEventListener('inklink-reset-view', handleResetView);
      window.removeEventListener('inklink-canvas-focus-node', handleFocusNode);
      if (renderer) {
        if ((renderer as any).destroy) {
          (renderer as any).destroy();
        } else {
          renderer.clear();
        }
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
      if (
        Math.abs(t1.x - t2.x) > 0.1 ||
        Math.abs(t1.y - t2.y) > 0.1 ||
        Math.abs(t1.scale - t2.scale) > 0.001
      ) {
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
   * Trigger Layout Calculation and Rendering — only fires when tree structure/direction changes
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
  }, [state.tree, state.layoutDirection]);

  /**
   * Visual-only refresh when dark mode changes — avoids full layout recalculation
   */
  useEffect(() => {
    if (rendererRef.current && lastTreeRef.current && containerRef.current) {
      const positions = globalState.getState().layoutPositions;
      if (positions) {
        rendererRef.current.render(lastTreeRef.current, positions, state.isDarkMode);
      }
    }
  }, [state.isDarkMode]);

  return (
    <div
      className={cn(
        'relative h-full w-full bg-background outline-none focus-within:ring-1 focus-within:ring-primary/20',
        !state.isResizing && 'transition-all duration-300',
        isDragging && 'bg-primary/5 ring-1 ring-primary/40 ring-inset'
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
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="32"
                height="32"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="12" y1="18" x2="12" y2="12" />
                <polyline points="9 15 12 12 15 15" />
              </svg>
            </div>
            <div className="text-center">
              <p className="text-lg font-bold text-foreground">Drop Mind Map File</p>
              <p className="text-sm text-muted-foreground">
                Only Markdown (.md) files are supported
              </p>
            </div>
          </div>
        </div>
      )}

      <div
        className={cn(
          'absolute inset-0 flex flex-col items-center justify-center text-muted-foreground select-none overflow-hidden',
          state.tree ? 'pointer-events-none opacity-0' : 'opacity-100'
        )}
      >
        {!state.tree && (
          <div className="flex flex-col items-center max-w-sm text-center animate-in fade-in slide-in-from-bottom-4 duration-1000">
            {/* Minimalist Hero Icon */}
            <div className="mb-6 w-16 h-16 rounded-2xl bg-primary/5 border border-primary/10 flex items-center justify-center text-primary/60 transition-colors">
              <ZapIcon className="w-8 h-8" />
            </div>

            {/* Headline & Description */}
            <h2 className="text-xl font-bold text-foreground tracking-tight mb-2">
              Ready to Visualize?
            </h2>
            <p className="text-sm leading-relaxed text-muted-foreground/80 mb-8 px-4">
              Inklink converts your Markdown hierarchy into a dynamic mind map. Start typing on the
              left or explore a showcase.
            </p>

            {/* Solid Action Buttons (No Glassmorphism) */}
            <div className="flex flex-col sm:flex-row items-center gap-3 w-full px-8">
              <Button
                onClick={() => {
                  const factory = PlatformFactory.getInstance();
                  if (factory.getPlatform() === PlatformType.VSCode) {
                    const vscodeApi = getVsCodeApi();
                    if (vscodeApi) {
                      vscodeApi.postMessage({ command: 'tryExample' });
                      return;
                    }
                  }
                  // Web Fallback: Trigger global event that Toolbar listens to
                  window.dispatchEvent(new CustomEvent('inklink-file-open-example'));
                }}
                className="w-full sm:flex-1 h-10 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg shadow-primary/20 transition-all font-bold group"
              >
                <ZapIcon className="w-4 h-4 mr-2 fill-primary-foreground group-hover:scale-110 transition-transform" />
                Try Example
              </Button>

              <Button
                variant="outline"
                onClick={() => globalState.setState({ isLearnBasicsOpen: true })}
                className="w-full sm:flex-1 h-10 rounded-xl bg-background border-border hover:bg-muted font-bold"
              >
                <BookOpen className="w-4 h-4 mr-2" />
                Learn Basics
              </Button>
            </div>

            {/* Subtext Cues */}
            <div className="mt-10 flex items-center gap-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground/40">
              <div className="flex items-center gap-1.5">
                <Keyboard className="w-3 h-3" />
                <span>{modKey}+O to Open</span>
              </div>
              <div className="h-1 w-1 rounded-full bg-border" />
            </div>
          </div>
        )}
      </div>

      {state.isExportingImage && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-3 animate-in fade-in zoom-in-95 duration-200">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            <p className="text-sm font-semibold text-foreground">Preparing image export...</p>
          </div>
        </div>
      )}
    </div>
  );
}
