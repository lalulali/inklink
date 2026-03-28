/**
 * Feature: Renderer Adapter Interface
 * Purpose: Defines interface for platform-specific rendering implementations
 * Dependencies: None (core interface)
 */

import type { TreeNode, Position, NodeChange, Transform } from '@/core/types';

/**
 * Renderer adapter interface for platform-agnostic rendering
 * Implementations: WebRendererAdapter (D3.js), VSCodeRendererAdapter (webview)
 */
export interface RendererAdapter {
  /**
   * Initialize the renderer with a container element
   * @param container - DOM element to render into
   */
  initialize(container: HTMLElement): void;

  /**
   * Render the complete tree
   * @param root - Root node of the tree
   * @param positions - Map of node IDs to positions
   * @param isDarkMode - Flag for theme mode
   */
  render(root: TreeNode, positions: Map<string, Position>, isDarkMode?: boolean): void;

  /**
   * Update specific nodes (for partial updates)
   * @param changes - Array of node changes
   */
  update(changes: NodeChange[]): void;

  /**
   * Clear all rendered content
   */
  clear(): void;

  /**
   * Export the current render to SVG string
   * @returns SVG markup string
   */
  exportToSVG(): string;

  /**
   * Export the current render to PNG
   * @param background - Background color option
   * @returns PNG as Blob
   */
  exportToPNG(background: 'transparent' | 'white'): Promise<Blob>;

  /**
   * Register callback for node click events
   * @param callback - Function called with clicked node ID
   */
  onNodeClick(callback: (nodeId: string) => void): void;

  /**
   * Get the current viewport bounds
   * @returns Bounding box of visible area
   */
  getViewportBounds(): { width: number; height: number };

  /**
   * Highlight specified nodes (e.g., for search)
   * @param nodeIds - IDs of nodes to highlight
   */
  highlightNodes(nodeIds: string[]): void;

  /**
   * Set the current pan/zoom transform
   */
  setTransform(transform: Transform): void;

  /**
   * Register callback for viewport transform changes
   */
  onTransform?: (transform: Transform) => void;
}