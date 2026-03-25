# Inklink

A web-based visualization tool that transforms markdown documents into interactive mind maps.

## Features

- **Markdown Parsing**: Convert markdown text into hierarchical mind map structures based on indentation
  - Indentation detection (spaces vs tabs)
  - Mixed indentation normalization
  - Parse-serialize round-trip support
  - Comprehensive error reporting with line/column information
- **Multiple Layouts**: Choose from five layout directions (two-sided, left-to-right, right-to-left, top-to-bottom, bottom-to-top)
- **Interactive Visualization**: Pan, zoom, and navigate through your mind maps with ease
- **Export Options**: Export to HTML, SVG, and PNG formats
- **File Operations**: Open, save, and auto-save markdown files
- **Search**: Find nodes within your mind map quickly
- **Undo/Redo**: Full undo/redo support with 50-operation history
- **Type Safety**: Comprehensive runtime type validation with type guards for all core data structures

## Technology Stack

- **Framework**: Next.js 14+ with App Router
- **Language**: TypeScript with strict mode
- **Styling**: Tailwind CSS with shadcn/ui components (Button, Select, DropdownMenu, Toggle, Toast, Tooltip)
- **Rendering**: D3.js for SVG-based visualization
- **Testing**: Jest + fast-check for property-based testing
- **Utilities**: clsx + tailwind-merge for className composition

## Project Status

The project is being implemented in phases. Current status:

- [x] **Phase 0**: Markmap Study and Analysis
- [x] **Phase 1**: Core Foundation
  - [x] Project Setup and Build Configuration
  - [x] Core Data Structures and Types
  - [x] Markdown Parser Implementation (Indentation-based)
- [ ] **Phase 2**: Web Platform Implementation (In Progress)
  - [ ] Platform Abstraction Layer
  - [ ] Web Storage and File System Adapters
  - [ ] D3.js Renderer Implementation
- [ ] **Phase 3**: Testing Infrastructure (In Progress)
- [ ] **Phase 4**: Advanced Features and Polish


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