# AI Shared Memory

Last Updated: 2026-03-24T14:30:00Z

## Project Overview

This project contains specifications for various features being developed. Currently working on the inklink feature, which is a web-based tool that converts markdown documents into interactive mind maps. The tool is built as a fork of the Markmap library with extensive enhancements including file persistence, multiple layouts, undo/redo, search, and professional UX features.

## Key Decisions

### Markdown to Mind Map Generator - Web Framework
- **Decision**: Next.js 14+ with App Router instead of Vite
- **Rationale**: Better developer experience, built-in optimizations, server-side capabilities for future enhancements, excellent TypeScript support
- **Date**: 2024-12-19
- **Impact**: Project structure uses Next.js App Router (app/ directory), built-in API routes, automatic code splitting and optimization
- **Documentation**: .kiro/specs/inklink/design.md, tasks.md

### Markdown to Mind Map Generator - UI Framework
- **Decision**: Tailwind CSS + shadcn/ui instead of custom CSS
- **Rationale**: Production-ready components with excellent accessibility (WCAG 2.1 AA), utility-first CSS reduces custom styling, consistent design system, fully customizable
- **Date**: 2024-12-19
- **Impact**: All UI components use shadcn/ui (Button, Input, Select, DropdownMenu, Toggle, Toast, etc.); styling uses Tailwind utility classes; reduces custom CSS work by ~80%
- **Documentation**: .kiro/specs/inklink/design.md, tasks.md

### Markdown to Mind Map Generator - Architecture
- **Decision**: Fork Markmap library rather than wrap it
- **Rationale**: Allows deep customization of layout algorithms and rendering pipeline; provides full control over feature implementation
- **Date**: 2024-12-19
- **Impact**: All core functionality built on D3.js + TypeScript foundation from Markmap
- **Documentation**: .kiro/specs/inklink/design.md

### Markdown to Mind Map Generator - State Management
- **Decision**: Command pattern for all state-changing operations
- **Rationale**: Enables undo/redo functionality (50 operations); provides clean separation of concerns; makes state changes explicit and testable
- **Date**: 2024-12-19
- **Impact**: All operations (load, save, layout change, collapse/expand, pan, zoom) implemented as commands
- **Documentation**: .kiro/specs/inklink/design.md

### Markdown to Mind Map Generator - Performance Strategy
- **Decision**: Lazy rendering with viewport culling
- **Rationale**: Maintain 60fps for mind maps with 1000+ nodes; only render visible nodes (reduces DOM from 1000+ to ~50-100)
- **Date**: 2024-12-19
- **Impact**: Custom rendering pipeline that checks viewport bounds before rendering nodes
- **Documentation**: .kiro/specs/inklink/design.md

### Markdown to Mind Map Generator - Testing Approach
- **Decision**: Dual testing with unit tests + property-based tests
- **Rationale**: Unit tests catch specific bugs; property tests verify universal correctness; together provide comprehensive coverage
- **Date**: 2024-12-19
- **Impact**: Using fast-check library for property-based testing; minimum 100 iterations per property test
- **Documentation**: .kiro/specs/inklink/design.md

### Markdown to Mind Map Generator - Platform Portability
- **Decision**: Platform abstraction layer with adapter pattern
- **Rationale**: Enable deployment as both web application and VS Code extension; maximize code reuse (90% shared core); clean separation of platform-specific APIs
- **Date**: 2024-12-19
- **Impact**: Core logic (parser, layout, state, commands) is 100% platform-agnostic; platform adapters handle storage, file system, and rendering differences
- **Documentation**: .kiro/specs/inklink/design.md

## Active Features

### Markdown to Mind Map Generator (Spec Complete - Ready for Implementation)
- Status: Requirements, design, and tasks complete; ready for implementation
- Location: .kiro/specs/inklink/
- Files: requirements.md (21 requirements), design.md (with VS Code portability), tasks.md (52 tasks, 520 sub-tasks)
- Key Components:
  - Platform-agnostic core (90% shared): parser, layout, state, commands, search
  - Platform adapters (10%): storage, file system, renderer
  - Five layout algorithms (two-sided, L-R, R-L, T-B, B-T)
  - D3.js-based SVG renderer with lazy rendering
  - Command pattern for undo/redo (50 operations)
  - Dual testing: unit tests + property-based tests (48 properties)
  - Web platform: File System Access API, IndexedDB, LocalStorage
  - VS Code platform (optional): Extension API, workspace state, webview
- Implementation Phases:
  - Phase 1: Core Foundation (3-4 weeks, 9 tasks)
  - Phase 2: Web Platform (4-5 weeks, 17 tasks)
  - Phase 3: Testing Infrastructure (3-4 weeks, 15 tasks)
  - Phase 4: Advanced Features (2-3 weeks, 5 tasks)
  - Phase 5: VS Code Extension (2-3 weeks, 6 tasks, optional)
- Total Estimated Time: 14-19 weeks for web app, +2-3 weeks for VS Code extension
- Next Steps: User review and approval, then begin Phase 1 Task 1 (Project Setup)

## Known Issues

None currently - project is in specification/design phase.

## Patterns and Conventions

### Spec Workflow
- Using requirements-first workflow for inklink
- Workflow: Requirements → Design → Tasks → Implementation
- Config file: .kiro/specs/{feature_name}/.config.kiro tracks workflow type

### Design Document Structure
- Overview, Architecture, Components, Data Models, Algorithms, Technology Choices, Performance, Error Handling, Testing Strategy, Correctness Properties
- Correctness Properties written as universal quantifications ("For any...")
- Each property references specific requirements it validates
- Property-based testing approach with fast-check library

### Code Documentation Standards
- File-level comments explaining purpose and dependencies
- Function comments with parameters, returns, side effects, errors
- Security decisions documented inline
- Business logic explained with context
- Complex algorithms explained step-by-step

## External Dependencies

### Markdown to Mind Map Generator
- **Markmap**: Base library for markdown-to-mindmap conversion (MIT license, allows forking)
- **D3.js v7**: Data visualization and SVG manipulation
- **TypeScript 5.x**: Type safety and developer experience
- **Next.js 14+**: React framework with App Router, built-in optimizations
- **React 18+**: UI library (included with Next.js)
- **Tailwind CSS 3.x**: Utility-first CSS framework
- **shadcn/ui**: Production-ready component library (Button, Input, Select, DropdownMenu, Toggle, Toast, Card, Dialog, etc.)
- **Radix UI**: Accessibility primitives (underlying shadcn/ui)
- **fast-check 3.x**: Property-based testing library
- **Jest 29.x**: Unit testing framework
- **Browser APIs**: File System Access API, IndexedDB, Canvas API

## Environment Setup

Project uses Kiro AI assistant for development workflow. Key directories:
- `.kiro/specs/` - Feature specifications (requirements, design, tasks)
- `.kiro/steering/` - Development standards and best practices
- `.artifacts/` - Project memory and documentation

## Lessons Learned

### Property-Based Testing for Specs
- Property-based testing is powerful for validating universal correctness
- Round-trip properties (parse/serialize, undo/redo, save/load) catch many bugs
- Invariants (no overlap, consistent spacing) ensure quality across all inputs
- Minimum 100 iterations needed due to randomization

### Design Document Completeness
- Include concrete code examples for key algorithms
- Show data structures with TypeScript interfaces
- Explain performance optimizations with code
- Document error handling strategies explicitly

## Future Considerations

### Markdown to Mind Map Generator - Future Enhancements
- Web Workers for parsing large documents (offload to background thread)
- Collaborative editing with real-time sync
- Plugin system for custom layout algorithms
- Theme customization and style presets
- Mobile/tablet support (currently desktop-only)

## Recent Changes

### [2026-03-24T14:00:00Z] Added Utility Functions for ClassName Merging
- Created `src/lib/utils.ts` with `cn()` utility function
- Uses clsx and tailwind-merge for proper Tailwind class conflict resolution
- Standard utility pattern used across shadcn/ui projects
- Updated README.md Technology Stack to include utilities
- Files: src/lib/utils.ts

### [2026-03-24T14:30:00Z] Added shadcn/ui Toast Components
- Created toast component system: toast.tsx, use-toast.ts, toaster.tsx
- Components: Toast, ToastProvider, ToastViewport, ToastTitle, ToastDescription, ToastClose, ToastAction
- Hook: useToast() for managing toast state
- Updated src/components/ui/index.ts with toast exports
- Updated README.md to list Toast in Technology Stack
- Task: Part of Task 24 (Notification System) implementation
- Files: src/components/ui/toast.tsx, src/components/ui/use-toast.ts, src/components/ui/toaster.tsx

### [2026-03-24T13:00:00Z] Completed Task 0.10: Created Reference Documentation for Team
- Created `.kiro/specs/inklink/reference-documentation.md`
- Consolidated all Markmap study patterns into single reference document
- Document covers:
  - Architecture summary with layer diagram
  - D3.js patterns adopted from Markmap (SVG structure, data binding, zoom, color, transitions)
  - Custom implementations (parser, layout, state, files, search, shortcuts, auto-save, minimap)
  - Core data structures (TreeNode, ApplicationState, Transform)
  - Layout algorithms (two-sided + 4 directional variants)
  - Command pattern for undo/redo
  - Platform adapter interfaces
  - Custom color palette
  - Keyboard shortcuts reference
  - Pan/zoom implementation details
  - SVG structure diagram
  - Performance targets (60fps, <1s layout, <500ms search)
  - File organization
  - Testing strategy with key properties
  - Dependencies list
- Links to detailed pattern documents: d3-js-patterns.md, tree-data-structure-patterns.md, pan-zoom-interaction-patterns.md, color-application-patterns.md, code-patterns-adopt-replace.md
- Task 0.10 complete - Task 0 (Markmap Study and Analysis) fully complete
- Files: .kiro/specs/inklink/reference-documentation.md
- Next: Ready to begin implementation (Phase 1: Project Setup and Build Configuration)

### [2026-03-24T12:30:00Z] Completed Task 0.9: Identified Code Patterns to Adopt vs Replace
- Created `.kiro/specs/inklink/code-patterns-adopt-replace.md`
- Documented which Markmap patterns to adopt (D3.js rendering) vs replace (custom implementations):
  - **Adopt from Markmap**: D3.js data binding, SVG container structure, d3.linkHorizontal, D3 zoom behavior, color application, ForeignObject, transitions, tree data structure concepts
  - **Replace with Custom**: Parser (indentation-based), layout engine (5 algorithms), state management (command pattern), file operations (platform adapters), search, keyboard shortcuts, auto-save, minimap
- Summary table: 8 categories with clear adopt/replace decisions
- Integration strategy: Markmap as reference implementation, not dependency
- Attribution: Markmap used for learning purposes only
- Files: .kiro/specs/inklink/code-patterns-adopt-replace.md
- Note: Task 0.10 (Create reference documentation for team) also completed - all reference docs created

### [2026-03-24T12:15:00Z] Completed Task 0.8: Documented Color Application to Branches
- Created `.kiro/specs/inklink/color-application-patterns.md`
- Documented 6 key color application patterns from Markmap reference:
  1. Color function signature: `color: (node: INode) => string`
  2. Default color scale: D3's scaleOrdinal with schemeCategory10
  3. Path-based color assignment: Uses node's hierarchical path (e.g., "root.child1.child2") for branch consistency
  4. Color freeze level: Truncates path at certain depth to prevent color changes in deep branches
  5. Single color option: When only one color provided, all branches use that color
  6. SVG element color application: Applied to link lines (stroke), node circles (stroke/fill), connection paths
- Key implementation recommendations:
  - Use D3 scaleOrdinal with custom visually harmonious palette
  - Apply colors to multiple SVG elements (nodes, links, paths)
  - Support color freeze level for deep trees
  - Support single color mode for monochromatic mind maps
  - Consider WCAG contrast for text readability
- Suggested custom palette (more harmonious than schemeCategory10): Blue, Orange, Red, Teal, Green, Yellow, Purple, Pink, Brown, Gray
- Files: .kiro/specs/inklink/color-application-patterns.md
- Referenced files: markmap-view/src/constants.ts, util.ts, types.ts, view.ts

### [2026-03-24T12:00:00Z] Completed Task 0.7: Documented Pan/Zoom Interaction Patterns
- Created `.kiro/specs/inklink/pan-zoom-interaction-patterns.md`
- Documented 11 key pan/zoom interaction patterns:
  1. Mouse interactions: drag pan, wheel zoom, minimap click navigation
  2. Touch interactions: single touch pan, pinch-to-zoom with distance calculation
  3. Keyboard interactions: space+drag pan, ctrl+scroll zoom, keyboard shortcuts (F, R, 1-5, +, -, 0)
  4. Smooth animations using requestAnimationFrame with easeOutCubic
  5. Fit-to-screen calculation and animation
  6. Edge detection with visual feedback (box-shadow indicators)
  7. Zoom constraints (10%-400% scale limits)
  8. D3.js zoom behavior integration
  9. Transform state management for undo/redo
  10. Performance optimization with throttled updates
  11. Integration with lazy rendering for viewport culling
- Includes TypeScript code examples for all interaction handlers
- Key design decisions: 60fps target, cursor-centered zoom, edge feedback via CSS
- Files: .kiro/specs/inklink/pan-zoom-interaction-patterns.md
- Next: Continue with remaining Task 0 sub-tasks (color application, code patterns to adopt/replace)

### [2026-03-24T11:30:00Z] Completed Task 0.6: Documented Tree Data Structure Patterns
- Created `.kiro/specs/inklink/tree-data-structure-patterns.md`
- Documented 10 key tree data structure patterns:
  1. TreeNode interface with id, content, depth, children, parent, color, metadata
  2. NodeMetadata interface for rendering and layout data
  3. Stack-based tree construction algorithm from indented markdown
  4. Color derivation pattern (root children get random colors, descendants inherit)
  5. Tree traversal patterns (depth-first, breadth-first, filter, search)
  6. Tree mutation patterns (immutable updates for undo/redo)
  7. Serialization patterns (JSON for persistence, markdown for round-trip)
  8. Comparison with Markmap reference (differences in parent reference, immutability)
  9. Tree statistics and validation functions
  10. Performance considerations (lazy construction, node caching)
- Includes TypeScript code examples for all patterns
- Key design decisions: explicit parent reference, immutable updates, separate metadata
- Files: .kiro/specs/inklink/tree-data-structure-patterns.md
- Next: Continue with remaining Task 0 sub-tasks (pan/zoom patterns, color application, code patterns)

### [2026-03-24T11:15:00Z] Completed Task 0.5: Documented D3.js Patterns Used for SVG Rendering
- Created `.kiro/specs/inklink/d3-js-patterns.md`
- Documented 10 key D3.js patterns from Markmap reference implementation:
  1. SVG container setup and initialization (d3.select, nested g groups, style injection)
  2. Data binding patterns (enter/update/exit with unique keys)
  3. Node rendering (line, circle, foreignObject with nested divs)
  4. Link/edge rendering with d3.linkHorizontal
  5. Pan/zoom integration with D3 zoom behavior
  6. Color application using ordinal scales (schemeCategory10)
  7. Transition and animation patterns with consistent duration
  8. Layout algorithm using d3-flextree
  9. Complete SVG structure diagram
  10. Key implementation notes (layering, ResizeObserver, state management)
- Includes code examples from markmap-reference/packages/markmap-view/src/view.ts
- What to adopt: D3 data join, zoom behavior, linkHorizontal, color scales, transitions
- What to replace: Custom parser (not markdown-it), custom layouts (not flextree), command pattern for state
- Files: .kiro/specs/inklink/d3-js-patterns.md
- Next: Continue with remaining Task 0 sub-tasks (document tree structures, pan/zoom patterns, color application)

### [2026-03-24T11:00:00Z] Completed Task 0.4: Analyzed Flextree Layout Algorithm Approach
- Analyzed d3-flextree library usage in markmap-view/src/view.ts (lines 232-260)
- Algorithm: Reingold-Tilford "tidy" tree algorithm, O(n) time complexity
- Key advantage: Supports variable node sizes (unlike standard d3.tree)
- Markmap usage pattern:
  - nodeSize callback swaps width/height for horizontal orientation
  - children callback respects fold state for collapsed nodes
  - spacing callback uses larger gaps between subtrees vs siblings
- Output conversion: (x, y, xSize, ySize) → (x, y, width, height) rect format
- What to adopt: Node positioning logic, variable size support, collapse handling
- What to replace: Need custom two-sided distribution (split children left/right)
- Need custom directional variants: L-R, R-L, T-B, B-T layouts
- Files: markmap-reference/packages/markmap-view/src/view.ts
- Next: Continue with remaining Task 0 sub-tasks (document D3 patterns, tree structures, etc.)

### [2026-03-24T10:45:00Z] Completed Task 0.3: Studied markmap-view D3.js Rendering Implementation
- Analyzed markmap-view/src/view.ts main rendering class (Markmap)
- Analyzed markmap-view/src/types.ts for D3.js type definitions
- Analyzed markmap-view/src/constants.ts for default rendering options
- Key D3.js Patterns to Adopt:
  1. SVG Structure: Main `<g>` group with nested groups for nodes (g.markmap-node) and paths (path.markmap-link)
  2. Zoom/Pan: D3's zoom() behavior with zoomIdentity for transforms; handles mouse wheel zoom and scroll-for-pan
  3. Node Rendering: Uses `<foreignObject>` elements with HTML divs for text content (enables text wrapping)
  4. Link Rendering: D3's linkHorizontal() generator for curved parent-child connections
  5. Data Join Pattern: enter/update/exit for efficient DOM updates with .data(nodes, (d) => d.state.key) for identity
  6. Layout: Uses d3-flextree for tree layout, stores rect (x, y, width, height) in node state
  7. Color: scaleOrdinal(schemeCategory10) for branch colors via function (node) => string
  8. Line Width: Decreases with depth using formula: baseWidth + deltaWidth / k ** node.state.depth
  9. Fit to Screen: Calculates scale from viewport dimensions and content bounds
  10. Node Toggle: Uses payload.fold property to track collapsed state
- Key Rendering Methods Studied:
  - handleZoom: Applies transform to main group element
  - toggleNode: Recursively folds/unfolds children
  - renderData: Main rendering with D3 data join pattern
  - fit: Fits content to viewport with zoomIdentity.translate().scale()
  - ensureVisible: Pans to make node visible in viewport
  - rescale: Zooms while pinning to viewport center
- Files: markmap-reference/packages/markmap-view/src/view.ts, types.ts, constants.ts
- Next: Continue with Task 0.4 (Analyze flextree layout algorithm approach)

### [2026-03-24T10:30:00Z] Studied markmap-lib Package Structure and Architecture
- Completed Task 0.2: Study markmap-lib package structure and architecture
- Analyzed markmap-lib core files: index.ts, types.ts, transform.ts
- Analyzed plugin system: base.ts, index.ts, available plugins (frontmatter, katex, hljs, checkbox, npm-url, source-lines)
- Analyzed markmap-html-parser: buildTree() function converts HTML to IPureNode tree
- Analyzed markmap-common types: IPureNode (content, payload, children), INode (extends with state: id, path, key, depth, size, rect)
- Analyzed markmap-view: D3.js rendering patterns in view.ts using flextree layout
- Key Patterns to Adopt:
  - Hook system for extensibility (parser, beforeParse, afterParse, retransform hooks)
  - Node state management with unique IDs and paths
  - Payload for storing metadata (fold state, custom data)
  - D3 data join pattern for rendering updates (enter/update/exit)
- What We'll Replace:
  - Parser: Custom indentation-based parser instead of markdown-it
  - Layout: Custom two-sided and directional layouts instead of flextree
  - State management: Command pattern for undo/redo (not in Markmap)
- Files: markmap-reference/packages/markmap-lib/, markmap-reference/packages/markmap-view/, markmap-reference/packages/markmap-common/
- Next: Continue with Task 0.3 (Study markmap-view D3.js rendering)

### [2024-12-19T22:50:00Z] Updated Technology Stack to Next.js + shadcn/Tailwind
- Changed build tool from Vite to Next.js 14+ with App Router
- Changed CSS framework from custom to Tailwind CSS + shadcn/ui
- Updated design.md: Technology Stack, Project Structure, Build Configuration sections
- Updated tasks.md: Task 1 (Project Setup), Tasks 15, 18, 24, 25, 26, 46 (UI components and build)
- Updated external dependencies to include Next.js, React, Tailwind, shadcn/ui, Radix UI
- Decision: Next.js provides better DX, built-in optimizations, and server-side capabilities
- Rationale: shadcn/ui + Tailwind provides production-ready components with WCAG 2.1 AA accessibility; reduces custom CSS work by ~80%
- Impact: Project structure now uses Next.js App Router (app/ directory); all UI components use shadcn/ui; styling uses Tailwind utilities
- Files: .kiro/specs/inklink/design.md, tasks.md, .artifacts/memory.md
- Next: Ready for implementation starting with Phase 1 Task 1 (Next.js project setup)

### [2024-12-19T22:45:00Z] Updated Technology Stack for Markdown to Mind Map Generator
- Changed build tool from Vite to Next.js 14+ with App Router
- Changed CSS framework from custom to Tailwind CSS + shadcn/ui
- Updated Task 1 (Project Setup) to reflect Next.js initialization
- Updated UI component tasks (15, 18) to use shadcn/ui components
- Decision: Next.js provides better server-side capabilities and built-in optimizations
- Rationale: shadcn/ui + Tailwind provides production-ready components with consistent design; reduces custom CSS work
- Impact: All UI components now use shadcn/ui Button, Input, Select, DropdownMenu, Toggle, etc.
- Impact: Styling uses Tailwind CSS utility classes instead of custom CSS
- Files: .kiro/specs/inklink/tasks.md (Tasks 1, 15, 18 updated)
- Next: Update design.md and remaining tasks to reflect Next.js + shadcn/ui stack

### [2024-12-19T22:15:00Z] Completed Tasks Document for Markdown to Mind Map Generator
- Created comprehensive implementation plan with 52 tasks and 520 sub-tasks
- Organized into 5 phases: Core Foundation, Web Platform, Testing, Polish, VS Code Extension
- Phase 1 (Core): 9 tasks covering project setup, data structures, parser, layout, state, search, colors
- Phase 2 (Web): 17 tasks covering platform adapters, UI components, file management, export
- Phase 3 (Testing): 15 tasks covering property-based tests (48 properties), unit tests, integration tests
- Phase 4 (Polish): 5 tasks covering performance optimization, accessibility, browser compatibility, documentation
- Phase 5 (VS Code): 6 tasks covering extension setup, adapters, host, webview, testing, publishing (optional)
- Documented task dependencies and critical path
- Estimated timeline: 14-19 weeks for web app, +2-3 weeks for VS Code extension
- Defined success criteria: functional completeness, quality metrics, UX, platform portability
- Files: .kiro/specs/inklink/tasks.md
- Next: User review and approval, then begin implementation
- Key Insights:
  - Platform abstraction enables both web and VS Code deployment from shared core
  - Critical path: Setup → Data Structures → Core Modules → Platform Adapters → Integration
  - Parallel work opportunities in core modules, platform adapters, and UI components
  - Property-based testing runs continuously alongside implementation

### [2024-12-19T21:00:00Z] Updated Design Document with VS Code Extension Portability
- Added platform portability architecture section to design document
- Defined platform abstraction layer with adapter interfaces (Storage, FileSystem, Renderer)
- Documented shared core (90%) vs platform-specific (10%) code split
- Created VS Code extension architecture with extension host and webview
- Documented message passing protocol between extension and webview
- Provided platform adapter implementations for both web and VS Code
- Added deployment configurations and build setup for both targets
- Defined migration path: Web app → VS Code adapters → Extension integration
- Updated project structure to show platform separation (core/, platform/, ui/, web/, vscode/)
- Updated technology stack to highlight platform-agnostic choices
- Files: .kiro/specs/inklink/design.md
- Decision: Use adapter pattern to isolate platform-specific APIs from core logic
- Rationale: Maximize code reuse, enable dual deployment, maintain single codebase
- Impact: Core logic (parser, layout, state) works unchanged in both web and VS Code

### [2024-12-19T20:30:00Z] Completed Design Document for Markdown to Mind Map Generator
- Created comprehensive design document with 8 major sections
- Defined architecture with 4 layers: UI, Application, Core Engine, Storage
- Designed 5 layout algorithms with two-sided balanced as primary
- Specified command pattern for undo/redo (50 operation stack)
- Documented lazy rendering strategy for 1000+ node performance
- Created 48 correctness properties from requirements analysis
- Used prework tool to analyze all acceptance criteria for testability
- Performed property reflection to eliminate redundant properties
- Files: .kiro/specs/inklink/design.md
- Next: User review and feedback, then proceed to task creation phase
- Key Insights:
  - Round-trip properties are essential (parse/serialize, JSON, save/load, undo/redo)
  - Performance requires lazy rendering + viewport culling + debouncing
  - Command pattern enables clean undo/redo implementation
  - Property-based testing with fast-check provides strong correctness guarantees

