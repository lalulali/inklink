# Change Log

All notable changes to the "inklink" extension will be documented in this file.

## [0.2.0] - 2026-04-12
### **The "Navigate Your Knowledge" Update**
This version transforms Inklink into a professional-grade navigational tool for complex documents, introducing advanced camera logic and strict layout physics.

- **Advanced Layout Physics**: Version 0.2.0 features **Balance Mode 2.0** and **Panning Constraints**, ensuring perfect parity and workspace orientation.
- **HTML Table Excellence**: Full-fidelity rendering for standard HTML `<table>` structures alongside GFM tables.
- **Adaptive Mobile UI**: A desktop-class experience on mobile with precision touch navigation and adaptive overlays.
- **Performance**: Throttled, lag-free synchronization for extremely large files (1000+ nodes).
- **Precision Navigation**: Global Fly-Over and Intelligent Auto-Focus in the Minimap v2.
- **Smart Parsing Fidelity**: Inklink now intelligently differentiates between formatting indentation (ignored for HTML tags like `<li>`) and functional indentation (strictly preserved inside code blocks).
- **Structural Optimization**: Standalone structural tags like `<ul>` and `<ol>` no longer create phantom vertical gaps, ensuring your lists are tightly integrated and perfectly aligned.
- **Pro Recovery Center**: The session restoration dialog now features full keyboard navigation (`Arrows` to pick, `Enter` to restore, `Esc` to close) and automatically focuses your latest activity for a friction-free workflow.

### 📊 Interactive Tables
Structured data is no longer hidden in text. Inklink identifies both **GFM Markdown Tables** and **Standard HTML Tables** and renders them as interactive integrated nodes.
- **HTML & GFM Support**: Full fidelity rendering for both markdown pipe-syntax and standard `<table>`, `<thead>`, `<tbody>`, `<th>`, and `<td>` tags.
- **Column Synchronization**: Table columns are automatically distributed across the node width with robust overflow handling.
- **Visual Consistency**: Tables adhere to the "Stitch" design language with tonal-relief row highlighting and consistent alignment.
- **Multi-line Support**: Cells wrap automatically and handle multi-line content (via `<br>` or `\n`), ensuring complex data remains readable.

### 📱 Mobile-First Precision
Inklink 0.2.0 is fully optimized for the modern mobile web, providing a desktop-class experience on any device.
- **Adaptive Overlays**: Dialogs and panels (Settings, Shortcuts, Recovery) automatically transition to a mobile-optimized, fullscreen-below-toolbar layout on narrow screens.
- **Precision Touch Navigation**: Full support for multi-touch panning and zooming on both the main canvas and the navigation minimap.
- **Touch-Aware Event Filters**: Intelligent input detection that distinguishes between pan, zoom, and node selection gestures for a seamless tactile experience.
- **Persistent Header UI**: Integrated integrated close controls and standard headers across all mobile overlays for consistent navigation.

### 🖼️ Interactive Multimedia
Inklink turns your visual assets into first-class citizens on the mind map.
- **Aspect-Aware Image Thumbnails**: Full support for **Markdown Images** (`![alt](url)`) rendered as professional thumbnails directly on nodes.
- **Precision Lightbox**: High-fidelity fullscreen viewing with center-zoom animations and backdrop-blur foundations.
- **Linked Integration**: Images wrapped in links (`[![alt](img)](link)`) now feature functional "Open Link" handlers within the lightbox.

### 📝 Document Block Excellence
Note blocks are now more robust, consistent, and visually balanced.
- **Interactive Code & Quote Blocks**: Real-time expansion with toggle "pills" that persist across live edits.
- **Indentation Fidelity**: Faithful rendering of complex technical structures (tabs, spaces, `\n`) using `white-space: pre`.
- **Perfectly Balanced Padding**: Standardized 9px margins on all sides for blocks, ensuring content is visually centered.

### 🔗 Intelligence & Refinement
The connection between your text and the visual map is now more precise than ever.
- **Zero-Jitter Synchronization**: Eliminated all layout "jumping" and shifts by refactoring the measurement engine for 1:1 editing precision.
- **Bidirectional Editor ↔ Map Routing**: Intelligent navigation that jumps to the exact source line and highlights it on double-click.
- **Solarized Neon Theme**: Optimized link legibility specifically tuned for high-saturation colored branches (Magenta, Purple, Blue).
- **Smart Formatting**: Sub-pixel accurate line wrapping that correctly accounts for Markdown syntax and hidden link labels.
- **Structural Whitespace Management**: Intelligent removal of phantom lines caused by container tags (`<ul>`, `<ol>`) ensures a dense, informative layout without unnecessary vertical spacing.

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
