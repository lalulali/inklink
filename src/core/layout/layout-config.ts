/**
 * Feature: Layout Configuration
 * Purpose: Centrally manages spacing and alignment constants for all layout algorithms
 * Requirement Traceability: 
 * - Req 10: Minimum 20px spacing between nodes
 * - Req 11: Minimum 80px spacing between parent and child
 * - Req 12: Consistent vertical spacing for same-depth siblings
 */

export const LAYOUT_CONFIG = {
  // Vertical spacing between sibling nodes (center-to-center or edge-to-edge depends on implementation)
  // We use 40px center-to-center as default to ensure at least 20px gap for 20px-high nodes
  SIBLING_SPACING: 40,
  MIN_SIBLING_GAP: 20,
  
  // Horizontal spacing between levels
  LEVEL_SPACING: 160,
  MIN_PARENT_CHILD_GAP: 80,
  
  // Default node dimensions (used before real measurements are available)
  DEFAULT_NODE_WIDTH: 120,
  DEFAULT_NODE_HEIGHT: 32,
  
  // Viewport defaults
  DEFAULT_VIEWPORT_WIDTH: 1920,
  DEFAULT_VIEWPORT_HEIGHT: 1080,
};
