# Change Log

All notable changes to the "inklink" extension will be documented in this file.

## [0.2.0] - 2026-04-12

**The "Navigate Your Knowledge" Update**
This version transforms Inklink into a professional-grade navigational tool for complex documents.

### Navigation & Layout

- **Lighthouse Minimap v2** with intelligent auto-focus that maintains high-resolution "Neighborhood" view around your viewport
- **Power Zoom (The Fly-Over)** — drag the viewport rectangle to smoothly zoom out to global overview and dive back into detail
- **Strict Balance Layout** with height-aware distribution algorithm ensuring perfect parity between left and right branches
- **Panning Constraints** with 200px buffer to keep you oriented and prevent getting lost in infinite space
- **Structural Skeleton** layer in minimap preserves branch context at all zoom levels
- **Hierarchical Pills** — depth-aware rounded nodes weighted by level for immediate structural orientation

### Performance

- Throttled, lag-free synchronization for extremely large files (1000+ nodes)
- Zero-jitter rendering with refactored measurement engine for 1:1 editing precision
- Smart parsing that differentiates between formatting indentation (HTML tags) and functional indentation (code blocks)

### Interactive Tables

- Full support for both **GFM Markdown Tables** and **Standard HTML Tables**
- Automatic column distribution with robust overflow handling
- Multi-line cell support with proper wrapping
- Tonal-relief row highlighting following the Stitch design language

### Interactive Multimedia

- **Markdown Images** rendered as aspect-aware thumbnails directly on nodes
- **Fullscreen Lightbox** with center-zoom animations and backdrop-blur effects
- **Linked Image Integration** — open original URLs from lightbox view
- Strict parsing with `!` requirement for accurate image vs link differentiation

### Interactive Note Blocks

- **Code Blocks** and **Quote Blocks** as interactive, expandable elements
- Collapsed "pills" showing type and line count
- Expanded view with syntax labeling and italicized quotes
- State persistence during live markdown edits
- Intelligent whitespace management collapsing phantom lines from `<ul>` and `<ol>` tags

### Mobile Excellence

- Adaptive overlays transitioning to fullscreen-below-toolbar on narrow screens
- Precision multi-touch panning and zooming on canvas and minimap
- Touch-aware event filters distinguishing pan, zoom, and selection gestures
- Persistent header UI across all mobile overlays

### Recovery Center

- Full keyboard navigation (`Arrows` to browse, `Enter` to restore, `Esc` to close)
- Automatic focus on latest activity for instant restoration
- Individual session preview with double-click restore

### Visual Refinements

- **Solarized Monochromatic Theme** — neon link coloring optimized for high-saturation branches
- Perfectly balanced 9px padding on all interactive blocks
- Standardized Stitch design system with 6px rounded corners
- Consistent tonal-relief aesthetic across all UI elements

### Interactive Image Support Update

- **Markdown Image Rendering** — `![alt](url)` syntax now displays as thumbnails on nodes
- **Linked Images** — `[![alt](img)](link)` detected and rendered with lightbox integration
- **Aspect-Aware Scaling** — images preserve original aspect ratio within nodes
- **Interactive Lightbox** — fullscreen viewing with center-zoom animations
- **Link Normalization** — external URLs correctly handled as absolute links
- **Seamless Node Flow** — nodes auto-expand vertically to accommodate images

### Zero-Jitter Real-Time Editing

- **Zero-Jitter Synchronization** — eliminated all layout jumping during live editing
- **Bidirectional Highlighting** — double-click node highlights exact source line in editor
- **Smart Formatting** — sub-pixel accurate line wrapping accounting for Markdown syntax
- **Indentation Fidelity** — faithful rendering of complex structures using `white-space: pre`
- **Solarized Neon Theme** — optimized link legibility for Magenta, Purple, and Blue branches

---

## [0.1.5] - 2026-04-02

### **Design System & Bug Fixes**

- **Solid Flat Design** — replaced all `backdrop-blur` effects with solid, high-contrast backgrounds
- **Brand Consistency** — updated Marketplace (#007ACC) and Open VSX (#5D2F92) buttons to official colors
- **Keyboard Shortcuts Reference** — redesigned with high-density, condensed layout
- **Maintenance Center** — consolidated application settings into unified panel
- **Fixed** invisible cursor when double-clicking nodes
- **Fixed** highlight glitching from recursive cursor selection events
- **Fixed** hover feedback and pointer cursors on interactive scrollbar elements
- **Improved** editor focus performance during node navigation

---

## [0.1.4] - 2026-04-02

### **Dark Mode & Navigation**

- Connectors maintain vibrant light-mode colors in dark mode for visual consistency
- Double-click node to highlight its source line in VS Code editor
- Simplified link styling by removing redundant CSS overrides
- Recovery Center improvements for session restoration

---

## [0.1.3] - 2026-04-02

### **Untitled Documents & Real-Time Sync**

- Fixed support for unsaved (dirty) and untitled Markdown documents
- Implemented real-time synchronization between editor and mindmap (preview while typing)
- Fixed Inklink icon visibility in editor title bar for untitled files

---

## [0.1.2] - 2026-04-01

### **Visual Polish**

- Updated dark mode branch colors for better visibility
- Updated minimap background to #1E1E1E for improved node visibility
- Enhanced marketplace integration with proper repository URLs

---

## [0.1.1] - 2026-04-01

### **Marketplace Integration**

- Updated VS Code Marketplace and Open VSX repository URLs
- Finalized extension packaging with license and build updates

---

## [0.1.0] - 2026-04-01

### **Initial Release**

- Real-time Markdown-to-mind-map rendering
- Bidirectional editor ↔ map navigation
- Three layout directions (LTR, RTL, two-sided)
- Lighthouse minimap with inverted overlay
- Canvas search
- Export to PNG, SVG, and interactive HTML
- Full dark mode support
- Auto-save and session recovery
- Expand/collapse controls
