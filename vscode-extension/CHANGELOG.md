# Change Log

All notable changes to the "inklink" extension will be documented in this file.

## [0.1.6] - 2026-04-09
- **Interactive Multimedia**:
  - Full Support for **Markdown Images** (`![alt](url)`) rendered as professional, aspect-aware thumbnails directly on nodes.
  - High-fidelity **Fullscreen Lightbox** with center-zoom animations and backdrop-blur foundations.
  - **Linked Image Integration**: Images wrapped in links (`[![alt](img)](link)`) now feature functional "Open Link" handlers within the lightbox.
- **Enhanced Document Blocks**:
  - **Interactive Tables**: Support for expanded Table nodes with automatic column distribution and row synchronization.
  - **Code & Quote Blocks**: Real-time expansion with interactive toggle "pills" that persist across edits.
  - **High-Fidelity Indentation**: Faithful rendering of complex structures (preserving `\n`, `\t`, and spaces) using `white-space: pre`.
- **Intelligent Link & Editing**:
  - **Context-Aware Navigation**: Local file links open in the primary editor area, while web links route to the system browser.
  - **Zero-Jitter Real-Time Editing**: Eliminated all layout "jumping" and shifts by synchronizing measurement logic.
  - **Smart URL Normalization**: Automated protocol detection for absolute web navigation.
- **Visual Refinement**:
  - **Perfectly Balanced Padding**: Standardized 9px margins on all four sides for blocks, ensuring content is visually centered.
  - **Solarized Monochromatic Theme**: Optimized "Neon" link legibility specifically tuned for high-saturation colored nodes.
  - **Markdown-Aware Measurement**: Sub-pixel accurate line wrapping that correctly strips link syntax and accounts for formatting.

## [0.1.5] - 2026-04-02
- Solid Flat Design: Replaced all `backdrop-blur` effects and transparent backgrounds with a solid, high-contrast design system across all side-sheet overlays
- Brand Consistency: Updated Marketplace and Open VSX buttons in Settings to use official brand colors (#007ACC and #5D2F92)
- Corrected button styling for non-transparent backgrounds across all Settings dialogs
- Redesigned Keyboard Shortcuts reference with a high-density, condensed layout and clearer grouping
- Consolidated application maintenance settings into a unified "Maintenance Center"
- Fixed hover feedback and pointer cursors on interactive scrollbar elements
- Fixed a bug causing the cursor to be invisible when double-clicking a node
- Resolved highlight glitching by preventing recursive cursor selection events
- Improved editor focus performance during node navigation

## [0.1.4] - 2026-04-02
- Improved visual consistency: mind map connectors now maintain their vibrant light-mode colors in dark mode
- Double-click node to highlight its source line in the VS Code editor
- Simplified link styling by removing redundant CSS overrides

## [0.1.3] - 2026-04-02
- Fixed support for unsaved (dirty) and untitled Markdown documents
- Implemented real-time synchronization between editor and mindmap (preview while typing)
- Fixed Inklink icon visibility in editor title bar for untitled files

## [0.1.2] - 2026-04-01
- Updated dark mode branch colors for better visibility

## [0.1.1] - 2026-04-01
- Updated VS Code Marketplace and Open VSX repository URLs

## [0.1.0] - Initial Release
- Real-time Markdown-to-mind-map rendering
- Bidirectional editor ↔ map navigation
- Three layout directions (LTR, RTL, two-sided)
- Lighthouse minimap with inverted overlay
- Canvas search
- Export to PNG, SVG, and interactive HTML
- Full dark mode support
- Auto-save and session recovery
- Expand/collapse controls
