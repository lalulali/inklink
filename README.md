# Inklink

![Development Status](https://img.shields.io/badge/status-development-yellow)

A web-based visualization tool that transforms markdown documents into interactive mind maps.

## Features

- **Multiple Layouts**: Choose from three core layout directions (Balanced Two-Sided, Left-to-Right, Right-to-Left)
  - Height-based layout algorithm for precise, balanced node spacing
  - Precise edge-to-edge spacing with hierarchical scaling support
- **Interactive Mind Map**:
  - **Double-Click Reveal**: Double-click any node to immediately open the editor and highlight the source lines
  - **Quick Unselect**: Press `Escape` or click any empty canvas area to clear the active node selection
- **Enhanced Viewport Controls**: 
  - **Dynamic Zoom**: 10% to 300% zoom range with status bar slider
  - **Pan/Zoom Gestures**: Smart wheel navigation (Wheel to pan, Alt/Cmd+Wheel to zoom)
  - **Navigation Tools**: Fit-to-screen and Reset view (100% zoom)
- **Synchronized Minimap**:
  - **Persistent Viewport**: Real-time tracking of the visible area
  - **Interactive Jump**: Click-to-navigate for rapid mind map traversal
- **Theme-Adaptive Visuals**:
  - **Visual Studio Palette**: Dark and Light grey root themes with color-coded branches
  - **Hierarchical Scaling**: Dynamic font sizing (22px to 9px) and weight based on node depth
  - **High Contrast**: Theme-aware shading (500-level for light, 700-level for dark)
- **Markdown Parsing**: Convert markdown text into hierarchical mind map structures based on indentation
  - Indentation detection (spaces vs tabs) and mixed indentation normalization
  - Virtual root system for handling multiple top-level headers
  - Stable random root names for multi-root scenarios
  - Comprehensive error reporting with line/column information
- **State Management**: Full undo/redo support with 50-operation history
- **Export Options**: Export to HTML, SVG, and PNG formats
- **File Operations**: Full file handle support with open and save capabilities
- **Type Safety**: Strict TypeScript implementation with runtime type guards for all core data structures

## Technology Stack

- **Framework**: Next.js 16 with App Router
- **Language**: TypeScript with strict mode
- **Styling**: Tailwind CSS with shadcn/ui components (Button, Select, DropdownMenu, Toggle, Toast, Tooltip)
- **Rendering**: D3.js for SVG-based visualization
- **Testing**: Jest + fast-check for property-based testing
- **Utilities**: clsx + tailwind-merge for className composition


## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn

### Installation

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Run tests
npm test
```

## Markmap Reference

This project is inspired by and references the [Markmap](https://github.com/markmap/markmap) project. Markmap is used as a **reference implementation** for understanding D3.js patterns and SVG rendering approaches, not as a direct dependency.

Key areas where Markmap patterns were studied:
- D3.js integration for SVG mind map rendering
- Tree data structure approaches
- Pan/zoom interaction patterns
- SVG export techniques
- Color scheme application to branches

The implementation uses custom code for:
- Markdown parsing (indentation-based)
- Layout algorithms (5 directions)
- State management (command pattern)
- File operations (platform adapters)

## License

MIT License - see LICENSE file for details.

## Acknowledgments

- [Markmap](https://github.com/markmap/markmap) - For D3.js rendering patterns and inspiration
- [D3.js](https://d3js.org/) - For SVG visualization capabilities
- [shadcn/ui](https://ui.shadcn.com/) - For component patterns