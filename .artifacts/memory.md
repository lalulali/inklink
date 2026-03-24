# AI Shared Memory

Last Updated: 2024-03-24T00:15:00Z

## Project Overview

This project contains specifications for various features being developed. Currently working on the markdown-to-mindmap-generator feature, which is a web-based tool that converts markdown documents into interactive mind maps. The tool is built as a fork of the Markmap library with extensive enhancements including file persistence, multiple layouts, undo/redo, search, and professional UX features.

## Key Decisions

### Markdown to Mind Map Generator - Web Framework
- **Decision**: Next.js 14+ with App Router instead of Vite
- **Rationale**: Better developer experience, built-in optimizations, server-side capabilities for future enhancements, excellent TypeScript support
- **Date**: 2024-12-19
- **Impact**: Project structure uses Next.js App Router (app/ directory), built-in API routes, automatic code splitting and optimization
- **Documentation**: .kiro/specs/markdown-to-mindmap-generator/design.md, tasks.md

### Markdown to Mind Map Generator - UI Framework
- **Decision**: Tailwind CSS + shadcn/ui instead of custom CSS
- **Rationale**: Production-ready components with excellent accessibility (WCAG 2.1 AA), utility-first CSS reduces custom styling, consistent design system, fully customizable
- **Date**: 2024-12-19
- **Impact**: All UI components use shadcn/ui (Button, Input, Select, DropdownMenu, Toggle, Toast, etc.); styling uses Tailwind utility classes; reduces custom CSS work by ~80%
- **Documentation**: .kiro/specs/markdown-to-mindmap-generator/design.md, tasks.md

### Markdown to Mind Map Generator - Architecture
- **Decision**: Fork Markmap library rather than wrap it
- **Rationale**: Allows deep customization of layout algorithms and rendering pipeline; provides full control over feature implementation
- **Date**: 2024-12-19
- **Impact**: All core functionality built on D3.js + TypeScript foundation from Markmap
- **Documentation**: .kiro/specs/markdown-to-mindmap-generator/design.md

### Markdown to Mind Map Generator - State Management
- **Decision**: Command pattern for all state-changing operations
- **Rationale**: Enables undo/redo functionality (50 operations); provides clean separation of concerns; makes state changes explicit and testable
- **Date**: 2024-12-19
- **Impact**: All operations (load, save, layout change, collapse/expand, pan, zoom) implemented as commands
- **Documentation**: .kiro/specs/markdown-to-mindmap-generator/design.md

### Markdown to Mind Map Generator - Performance Strategy
- **Decision**: Lazy rendering with viewport culling
- **Rationale**: Maintain 60fps for mind maps with 1000+ nodes; only render visible nodes (reduces DOM from 1000+ to ~50-100)
- **Date**: 2024-12-19
- **Impact**: Custom rendering pipeline that checks viewport bounds before rendering nodes
- **Documentation**: .kiro/specs/markdown-to-mindmap-generator/design.md

### Markdown to Mind Map Generator - Testing Approach
- **Decision**: Dual testing with unit tests + property-based tests
- **Rationale**: Unit tests catch specific bugs; property tests verify universal correctness; together provide comprehensive coverage
- **Date**: 2024-12-19
- **Impact**: Using fast-check library for property-based testing; minimum 100 iterations per property test
- **Documentation**: .kiro/specs/markdown-to-mindmap-generator/design.md

### Markdown to Mind Map Generator - Platform Portability
- **Decision**: Platform abstraction layer with adapter pattern
- **Rationale**: Enable deployment as both web application and VS Code extension; maximize code reuse (90% shared core); clean separation of platform-specific APIs
- **Date**: 2024-12-19
- **Impact**: Core logic (parser, layout, state, commands) is 100% platform-agnostic; platform adapters handle storage, file system, and rendering differences
- **Documentation**: .kiro/specs/markdown-to-mindmap-generator/design.md

## Active Features

### Markdown to Mind Map Generator (Spec Complete - Ready for Implementation)
- Status: Requirements, design, and tasks complete; ready for implementation
- Location: .kiro/specs/markdown-to-mindmap-generator/
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
- Using requirements-first workflow for markdown-to-mindmap-generator
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

### [2024-12-19T22:50:00Z] Updated Technology Stack to Next.js + shadcn/Tailwind
- Changed build tool from Vite to Next.js 14+ with App Router
- Changed CSS framework from custom to Tailwind CSS + shadcn/ui
- Updated design.md: Technology Stack, Project Structure, Build Configuration sections
- Updated tasks.md: Task 1 (Project Setup), Tasks 15, 18, 24, 25, 26, 46 (UI components and build)
- Updated external dependencies to include Next.js, React, Tailwind, shadcn/ui, Radix UI
- Decision: Next.js provides better DX, built-in optimizations, and server-side capabilities
- Rationale: shadcn/ui + Tailwind provides production-ready components with WCAG 2.1 AA accessibility; reduces custom CSS work by ~80%
- Impact: Project structure now uses Next.js App Router (app/ directory); all UI components use shadcn/ui; styling uses Tailwind utilities
- Files: .kiro/specs/markdown-to-mindmap-generator/design.md, tasks.md, .artifacts/memory.md
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
- Files: .kiro/specs/markdown-to-mindmap-generator/tasks.md (Tasks 1, 15, 18 updated)
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
- Files: .kiro/specs/markdown-to-mindmap-generator/tasks.md
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
- Files: .kiro/specs/markdown-to-mindmap-generator/design.md
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
- Files: .kiro/specs/markdown-to-mindmap-generator/design.md
- Next: User review and feedback, then proceed to task creation phase
- Key Insights:
  - Round-trip properties are essential (parse/serialize, JSON, save/load, undo/redo)
  - Performance requires lazy rendering + viewport culling + debouncing
  - Command pattern enables clean undo/redo implementation
  - Property-based testing with fast-check provides strong correctness guarantees


### [2024-12-19T23:15:00Z] Completed Task 1.1 - Next.js Project Initialization
- Initialized Next.js 16+ project with TypeScript and strict configuration
- Created core configuration files:
  - `package.json`: Dependencies for Next.js, React, D3.js, Tailwind, shadcn/ui, Jest, fast-check
  - `tsconfig.json`: Strict TypeScript configuration with all strict flags enabled
  - `next.config.js`: Next.js configuration with webpack optimization for D3.js
  - `tailwind.config.ts`: Tailwind CSS with custom theme for mind map visualization
  - `postcss.config.js`: PostCSS with Tailwind and Autoprefixer
  - `.eslintrc.json`: ESLint configuration with TypeScript support
  - `.prettierrc.json`: Prettier configuration for code formatting
  - `.gitignore`: Git ignore patterns for Node.js and IDE files
  - `jest.config.js`: Jest configuration with TypeScript support and path aliases
  - `jest.setup.js`: Jest setup with testing library and browser API mocks
- Created Next.js App Router structure:
  - `src/app/layout.tsx`: Root layout with metadata and global setup
  - `src/app/globals.css`: Global styles with Tailwind directives and CSS variables
  - `src/app/page.tsx`: Home page placeholder
- Created utility functions:
  - `src/lib/utils.ts`: Common utilities (cn, debounce, throttle, generateId, etc.)
- Created comprehensive README.md with setup instructions, architecture overview, and roadmap
- Project structure ready for Phase 1 core development
- Files created: 15 configuration and setup files
- Next: Task 1.2 - Configure Next.js for web build target with App Router
- Status: Ready for npm install and development


### [2024-03-24T00:00:00Z] Task 1.1 Complete - Next.js Project Initialization
- Successfully initialized Next.js 16+ project with TypeScript strict mode
- Created all core configuration files:
  - `package.json`: 56 dependencies configured (Next.js, React, D3.js, Tailwind, shadcn/ui, Jest, fast-check)
  - `tsconfig.json`: Strict TypeScript configuration with all strict flags enabled
  - `next.config.js`: Next.js configuration with webpack optimization for D3.js
  - `tailwind.config.ts`: Tailwind CSS with custom theme for mind map visualization
  - `postcss.config.js`: PostCSS with Tailwind and Autoprefixer
  - `.eslintrc.json`: ESLint configuration with TypeScript support
  - `.prettierrc.json`: Prettier configuration for code formatting
  - `.gitignore`: Git ignore patterns for Node.js and IDE files
  - `jest.config.js`: Jest configuration with TypeScript support and path aliases
  - `jest.setup.js`: Jest setup with testing library and browser API mocks
- Created Next.js App Router structure:
  - `src/app/layout.tsx`: Root layout with metadata and global setup
  - `src/app/globals.css`: Global styles with Tailwind directives and CSS variables
  - `src/app/page.tsx`: Home page placeholder
- Created utility functions:
  - `src/lib/utils.ts`: Common utilities (cn, debounce, throttle, generateId, etc.)
- Created comprehensive README.md with setup instructions, architecture overview, and roadmap
- All configuration files validated with no linting or formatting issues
- Project structure ready for Phase 1 core development
- Next: Task 1.2 - Configure Next.js for web build target with App Router
- Status: ✅ Complete - Ready for npm install and development

### [2024-03-24T00:15:00Z] Completed Task 1.2 - Configure Next.js for Web Build Target with App Router
- Enhanced next.config.js with comprehensive web build configuration
- Added App Router explicit configuration (appDir: true)
- Configured standalone output for optimized production builds
- Added image optimization with AVIF and WebP formats
- Enhanced webpack configuration with D3.js module optimization
- Added experimental optimizePackageImports for better tree-shaking
- Configured compression and security headers for production
- Added cache control headers for static assets (1 year), images (30 days)
- Enabled TypeScript strict checking during build (fail on errors)
- Enabled ESLint checking during build (fail on errors)
- Added environment variable NEXT_PUBLIC_BUILD_TARGET: 'web'
- Configured Node.js module fallbacks for browser (fs, path, crypto, stream, util)
- Added Referrer-Policy and Permissions-Policy security headers
- Files: next.config.js (enhanced with 15+ configuration sections)
- Status: ✅ Complete - Next.js fully configured for web build target
- Next: Task 1.3 - Set up Tailwind CSS with Next.js integration


### [2024-03-24T00:30:00Z] Completed Task 1.2 - Enhanced Next.js Web Build Configuration
- Enhanced next.config.js with comprehensive web build configuration
- Added App Router explicit configuration (appDir: true)
- Configured standalone output for optimized production builds
- Added image optimization with AVIF and WebP formats
- Enhanced webpack configuration with D3.js module optimization
- Added experimental optimizePackageImports for better tree-shaking
- Configured compression and security headers for production
- Added cache control headers for static assets (1 year), images (30 days)
- Enabled TypeScript strict checking during build (fail on errors)
- Enabled ESLint checking during build (fail on errors)
- Added environment variable NEXT_PUBLIC_BUILD_TARGET: 'web'
- Configured Node.js module fallbacks for browser (fs, path, crypto, stream, util)
- Added Referrer-Policy and Permissions-Policy security headers
- All configuration validated successfully with Node.js
- Files: next.config.js (enhanced with 15+ configuration sections)
- Status: ✅ Complete - Next.js fully configured for web build target
- Next: Task 1.3 - Set up Tailwind CSS with Next.js integration
