/**
 * Feature: Layout Configuration
 * Purpose: Centrally manages spacing and alignment constants for all layout algorithms
 * Requirement Traceability: 
 * - Req 10: Minimum 20px spacing between nodes
 * - Req 11: Minimum 80px spacing between parent and child
 * - Req 12: Consistent vertical spacing for same-depth siblings
 */

export const LAYOUT_CONFIG = {
  // Global scale factor to re-baseline the visual density (75% becomes new 100%)
  BASE_SCALE: 0.75,

  // Vertical spacing between sibling nodes
  SIBLING_SPACING: 40 * 0.75, // 30
  MIN_SIBLING_GAP: 20 * 0.75,  // 15

  // Horizontal spacing between levels
  LEVEL_SPACING: 100 * 0.75,  // 75
  MIN_PARENT_CHILD_GAP: 40 * 0.75, // 30

  // Default node dimensions
  DEFAULT_NODE_WIDTH: 120 * 0.75,
  DEFAULT_NODE_HEIGHT: 32 * 0.75,

  // Viewport defaults
  DEFAULT_VIEWPORT_WIDTH: 1920,
  DEFAULT_VIEWPORT_HEIGHT: 1080,

  // Maximum node width for the root node (depth 0)
  ROOT_MAX_WIDTH: 300,

  // Image Thumbnail Constraints
  IMAGE: {
    MAX_WIDTH: 180,       // Max allowed width for thumbnails
    MAX_HEIGHT: 120,      // Max allowed height for thumbnails
    PADDING: 4,           // Inner padding for the image frame
    CORNER_RADIUS: 4,     // Roundness of image container
    BORDER_WIDTH: 1.5,    // Border thickness for image frame
  },

  // Distance Marker Configuration
  DISTANCE: {
    FONT_SIZE: 11,        // Size of the distance label
    COLOR: '#94a3b8',     // Slate 400 color
    BG_OPACITY: 0.8,      // Background transparency for the label
    VISIBLE_THRESHOLD: 50 // Only show if distance is > 50px
  },

  // Note Block (Code/Quote) Configuration
  NOTE_BLOCK: {
    PILL_HEIGHT: 24 * 0.75,       // Height of the collapsed pill
    PILL_GAP: 5 * 0.75,           // Vertical gap between pills / between text and first pill
    CODE_LINE_HEIGHT: 12 * 0.75,  // Line height inside expanded code block
    CODE_HEADER_HEIGHT: 20 * 0.75, // Height of the language header row
    CODE_V_PADDING: 8 * 0.75,     // Top+bottom padding inside expanded code
    QUOTE_LINE_HEIGHT: 12 * 0.75, // Line height inside expanded quote
    QUOTE_V_PADDING: 6 * 0.75,    // Top+bottom padding inside expanded quote
    QUOTE_BORDER_WIDTH: 3 * 0.75, // Width of left accent border
    MONO_FONT: "'JetBrains Mono', 'Fira Code', 'Courier New', monospace",
  },
};
