# Markdown to Mind Map Generator

Convert markdown documents into interactive mind maps with professional features including file persistence, multiple layout algorithms, undo/redo, search, and export capabilities.

## Features

- **Markdown Parsing**: Convert markdown documents into structured mind maps based on indentation levels
- **Multiple Layouts**: Five layout algorithms (two-sided, left-to-right, right-to-left, top-to-bottom, bottom-to-top)
- **Interactive Visualization**: Pan, zoom, and navigate large mind maps with smooth animations
- **File Management**: Load and save markdown files with auto-save and crash recovery
- **Undo/Redo**: Full undo/redo support with 50-operation history
- **Search**: Real-time search with highlighting and navigation
- **Export**: Export to HTML, SVG, PNG, and JPG formats
- **Keyboard Shortcuts**: Comprehensive keyboard shortcuts for power users
- **Accessibility**: WCAG 2.1 Level AA compliance with keyboard navigation and screen reader support
- **Performance**: Lazy rendering for smooth 60fps performance with 1000+ node mind maps

## Technology Stack

- **Framework**: Next.js 16+ with App Router
- **Language**: TypeScript 5.x with strict configuration
- **Styling**: Tailwind CSS 3.x + shadcn/ui components
- **Visualization**: D3.js v7 for SVG rendering
- **Testing**: Jest + fast-check for property-based testing
- **Storage**: IndexedDB for auto-save, File System Access API for file operations

## Project Structure

```
src/
├── core/                      # Platform-agnostic core logic
│   ├── parser/               # Markdown parsing
│   ├── layout/               # Layout algorithms
│   ├── state/                # State management
│   ├── transform/            # Pan/zoom transformations
│   ├── search/               # Search engine
│   └── types/                # TypeScript interfaces
├── platform/                 # Platform abstraction layer
│   ├── adapters/             # Adapter interfaces
│   ├── web/                  # Web implementations
│   └── vscode/               # VS Code implementations (future)
├── components/               # UI components
├── app/                      # Next.js App Router
├── lib/                      # Utility functions
└── __tests__/                # Test files
```

## Getting Started

### Prerequisites

- Node.js 18.0.0 or higher
- npm 9.0.0 or higher

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd markdown-to-mindmap-generator
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm run dev
```

4. Open [http://localhost:3000](http://localhost:3000) in your browser

### Development Commands

```bash
# Start development server
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Run linting
npm run lint

# Type checking
npm run type-check

# Run tests
npm test

# Run tests in watch mode
npm run test:watch

# Generate coverage report
npm run test:coverage
```

## Architecture

### Core Architecture

The application follows a layered architecture:

1. **User Interface Layer**: React components with Tailwind CSS and shadcn/ui
2. **Application Layer**: State management, file operations, export functionality
3. **Core Engine Layer**: Platform-agnostic business logic (parser, layout, state, commands)
4. **Platform Abstraction Layer**: Adapters for storage, file system, and rendering

### Key Design Decisions

- **Fork vs Wrapper**: Forked Markmap library for deep customization of layout algorithms
- **Command Pattern**: All state-changing operations implemented as commands for undo/redo
- **Lazy Rendering**: Only render nodes visible in viewport for performance
- **Platform Abstraction**: Core logic separated from platform-specific APIs via adapters

## Implementation Phases

### Phase 1: Core Foundation (Weeks 1-4)
- Project setup and build configuration
- Core data structures and types
- Markdown parser implementation
- Layout engine with five algorithms
- State management system
- Transform manager for pan/zoom
- Search engine
- Color management

### Phase 2: Web Platform (Weeks 5-9)
- Platform abstraction layer
- Web storage adapter (IndexedDB)
- Web file system adapter (File System Access API)
- D3.js renderer implementation
- Lazy rendering system
- UI components (toolbar, canvas, minimap, search panel)
- Keyboard handler system
- Export manager
- File manager
- Auto-save manager
- Error handling system
- Notification system
- Status bar
- Main application integration

### Phase 3: Testing Infrastructure (Weeks 10-13)
- Property-based test generators
- Parser property tests
- Layout property tests
- Color and styling property tests
- Export property tests
- State management property tests
- Transform and navigation property tests
- Search property tests
- Performance property tests
- Error handling property tests
- Unit tests for all components
- Integration tests

### Phase 4: Advanced Features (Weeks 14-16)
- Performance optimization
- Accessibility enhancements
- Browser compatibility
- Documentation

### Phase 5: VS Code Extension (Weeks 17-19, Optional)
- Extension host setup
- VS Code platform adapters
- Webview integration
- Extension testing and publishing

## Testing

The project uses a dual testing approach:

### Unit Tests
```bash
npm test
```

### Property-Based Tests
Property-based tests verify universal correctness properties using fast-check:
- Round-trip properties (parse/serialize, undo/redo, save/load)
- Invariant properties (no overlap, consistent spacing, correct tree structure)
- Performance properties (frame rate, layout time, search response time)

## Configuration

### TypeScript Configuration

Strict TypeScript configuration is enabled in `tsconfig.json`:
- `strict: true` - All strict type checking options
- `noImplicitAny: true` - Require explicit types
- `strictNullChecks: true` - Strict null/undefined checking
- `noUnusedLocals: true` - Error on unused variables
- `noUnusedParameters: true` - Error on unused parameters
- `noImplicitReturns: true` - Require explicit return types

### Tailwind CSS Configuration

Custom theme extensions in `tailwind.config.ts`:
- Mind map branch colors
- Custom spacing for layout
- Custom font sizes for nodes
- Custom shadows and animations
- Z-index scale for layering

## Performance Targets

- **Rendering**: 60 fps for mind maps with up to 1000 nodes
- **Layout Calculation**: < 1 second for 500 nodes
- **Search Response**: < 500 milliseconds for 1000 nodes
- **File Loading**: < 2 seconds for 5000 lines
- **Export Operations**: < 30 seconds with progress indicator

## Browser Support

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

Desktop platforms only (Windows, macOS, Linux). Mobile/tablet support not included in initial version.

## Accessibility

The application follows WCAG 2.1 Level AA guidelines:
- Keyboard navigation (Tab, Arrow keys, Enter)
- Screen reader support with ARIA labels
- High contrast mode option
- Visible focus indicators
- Semantic HTML structure

## Contributing

See `.kiro/steering/` for development standards and best practices.

## License

[License information to be added]

## Support

For issues, questions, or feature requests, please open an issue on the project repository.

## Roadmap

- Web Workers for parsing large documents
- Collaborative editing with real-time sync
- Plugin system for custom layout algorithms
- Theme customization and style presets
- Mobile/tablet support (future version)
- VS Code extension (optional)

## Acknowledgments

Built as a fork of [Markmap](https://markmap.js.org/) with extensive enhancements for professional use cases.
