/**
 * Feature: Renderer Adapter Interface
 * Purpose: Defines interface for platform-specific rendering implementations
 * Dependencies: None (core interface)
 */

import type { TreeNode, Position, NodeChange } from '@/core/types';

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
   */
  render(root: TreeNode, positions: Map<string, Position>): void;

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
   * Get the current viewport bounds
   * @returns Bounding box of visible area
   */
  getViewportBounds(): { width: number; height: number };
}