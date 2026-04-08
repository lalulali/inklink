# Change Log

All notable changes to the "inklink" extension will be documented in this file.

## [0.1.6] - 2026-04-08
- High-Fidelity Block Indentation: Implemented `white-space: pre` rendering for Code and Quote blocks to faithfully preserve complex indentation structures (tabs/spaces)
- Editor Shortcuts: Added VS Code-style keyboard shortcuts for Bold (Cmd+B), Italic (Cmd+I), and Strikethrough (Cmd+Shift+X) with robust syntax detection
- Refined Mind Map Layout: Optimized vertical centering for multi-line node content and improved block element alignment
- Image Support Foundations: Added internal data models and centralized configuration for upcoming image rendering support
- Solarized Monochromatic Theme: High-vibrancy "Neon" saturation and lightness thresholds specifically tuned for links on colored nodes (Magenta, Purple, Blue) to solve eye strain and visual clutter
- Context-Aware Link Navigation: Local file links intelligently open in the primary editor area (Column 1) so it stays side-by-side with the mind map, while web links trigger the system browser
- Fixed Data Loss: Prevented Markdown image and link tags from being stripped by removing destructive pre-processing logic from the layout engine
- Enhanced Performance: Implemented a versioned link color cache and more stable VS Code API message handling for consistent across-the-board updates

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
