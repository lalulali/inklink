# Implementation Tasks: Markdown to Mind Map Generator

## Overview

This document outlines the implementation tasks for building the Markdown to Mind Map Generator. The system is designed with platform portability in mind, supporting both web application and VS Code extension deployment through a shared core architecture.

## Task Organization

Tasks are organized into phases:

1. **Phase 1: Core Foundation** - Platform-agnostic core logic
2. **Phase 2: Web Platform** - Web-specific implementation
3. **Phase 3: Testing Infrastructure** - Property-based and unit tests
4. **Phase 4: Advanced Features** - Polish and optimization
5. **Phase 5: VS Code Extension** - Extension-specific implementation (optional)

## Phase 1: Core Foundation (Platform-Agnostic)

### Task 0: Markmap Study and Analysis

**Requirements**: Foundation for understanding reference implementation
**Design References**: Markmap Fork Strategy

- [X] 0.1 Clone Markmap repository (https://github.com/markmap/markmap)
- [X] 0.2 Study markmap-lib package structure and architecture
- [X] 0.3 Study markmap-view D3.js rendering implementation
- [X] 0.4 Analyze flextree layout algorithm approach
- [X] 0.5 Document D3.js patterns used for SVG rendering
- [X] 0.6 Document tree data structure patterns
- [X] 0.7 Document pan/zoom interaction patterns
- [X] 0.8 Document color application to branches
- [X] 0.9 Identify code patterns to adopt vs replace
- [X] 0.10 Create reference documentation for team

### Task 1: Project Setup and Build Configuration

**Requirements**: Foundation for all other tasks
**Design References**: Technology Stack, Project Structure

- [X] 1.1 Initialize Next.js 16+ project with TypeScript and strict configuration
- [X] 1.2 Configure Next.js for web build target with App Router
- [X] 1.3 Set up Tailwind CSS with Next.js integration
- [X] 1.4 Install and configure shadcn/ui component library
- [X] 1.5 Set up ESLint and Prettier with TypeScript rules
- [X] 1.6 Create project directory structure (core/, platform/, ui/, app/)
- [X] 1.7 Configure Jest for unit testing with Next.js
- [X] 1.8 Install and configure fast-check for property-based testing
- [X] 1.9 Set up Git repository with .gitignore
- [X] 1.10 Create package.json with all dependencies (Next.js, shadcn, Tailwind, D3.js)
- [X] 1.11 Add Markmap attribution to README and LICENSE files
- [X] 1.12 Document that Markmap is used as reference, not dependency

### Task 2: Core Data Structures and Types

**Requirements**: Req 1, 6
**Design References**: TreeNode, ApplicationState, Command interfaces

- [X] 2.1 Define TreeNode interface with all properties
- [X] 2.2 Define NodeMetadata interface
- [X] 2.3 Define ApplicationState interface
- [X] 2.4 Define Transform interface
- [X] 2.5 Define LayoutDirection type
- [X] 2.6 Define Command interface for undo/redo
- [X] 2.7 Define ValidationResult interface
- [X] 2.8 Define Position, BoundingBox, Viewport interfaces
- [X] 2.9 Create type guards for runtime type checking
- [X] 2.10 Export all types from core/types/index.ts

### Task 3: Markdown Parser Implementation

**Requirements**: Req 1, 5
**Design References**: MarkdownParser interface, IndentationParser class
**Properties**: 1, 3, 5, 7, 8

- [X] 3.1 Implement indentation detection (spaces vs tabs) - src/core/parser/indentation.ts
- [X] 3.2 Implement tree builder with stack-based construction
- [X] 3.3 Implement parse() method with error handling
- [X] 3.4 Implement serialize() method for tree-to-markdown conversion
- [X] 3.5 Implement validate() method for input validation
- [X] 3.6 Handle empty input and whitespace-only input
- [X] 3.7 Handle special characters preservation
- [X] 3.8 Handle mixed indentation with normalization
- [X] 3.9 Support unlimited nesting depth
- [X] 3.10 Create custom ParseError class with line/column info

### Task 4: Layout Engine - Two-Sided Algorithm

**Requirements**: Req 2
**Design References**: LayoutAlgorithm interface, TwoSidedLayout class
**Properties**: 10, 11, 12, 13, 14, 15

- [X] 4.1 Implement LayoutAlgorithm interface
- [X] 4.2 Implement calculateSubtreeSizes() for node counting
- [X] 4.3 Implement partitionChildren() for balanced distribution
- [X] 4.4 Implement layoutSubtree() for recursive positioning
- [X] 4.5 Implement collision detection algorithm
- [X] 4.6 Implement consistent spacing calculations
- [X] 4.7 Implement getBounds() for bounding box calculation
- [X] 4.8 Handle edge cases (single node, no children)
- [X] 4.9 Optimize for performance with memoization
- [X] 4.10 Add configuration for node spacing and level spacing

### Task 5: Layout Engine - Directional Algorithms

**Requirements**: Req 9
**Design References**: Directional layout implementations
**Properties**: 33

- [X] 5.1 Implement LeftToRightLayout class
- [X] 5.2 Implement RightToLeftLayout class
- [X] 5.3 Implement TopToBottomLayout class
- [X] 5.4 Implement BottomToTopLayout class
- [X] 5.5 Ensure all layouts maintain no-overlap property
- [X] 5.6 Ensure all layouts maintain consistent spacing
- [X] 5.7 Create layout factory for dynamic switching
- [X] 5.8 Implement smooth transition between layouts
- [X] 5.9 Test layout switching with various tree structures
- [X] 5.10 Document layout algorithm differences

### Task 6: State Management System

**Requirements**: Req 6, 12
**Design References**: StateManager, CommandManager classes
**Properties**: 38, 39

- [X] 6.1 Implement StateManager with observer pattern
- [X] 6.2 Implement state immutability with object spreading
- [X] 6.3 Implement state snapshot creation for undo/redo
- [X] 6.4 Implement CommandManager with undo/redo stacks
- [X] 6.5 Implement Command interface execute() and undo() methods
- [X] 6.6 Create LoadFileCommand implementation
- [X] 6.7 Create ChangeLayoutCommand implementation
- [X] 6.8 Create CollapseExpandCommand implementation
- [X] 6.9 Create TransformCommand for pan/zoom
- [X] 6.10 Implement undo stack size limit (50 operations)
- [X] 6.11 Implement redo stack clearing on new command
- [X] 6.12 Add command history debugging support

### Task 7: Transform Manager

**Requirements**: Req 7
**Design References**: TransformManager class
**Properties**: 26, 27, 28, 29, 30

- [X] 7.1 Implement pan transformation calculations
- [X] 7.2 Implement zoom transformation calculations
- [X] 7.3 Implement zoom center preservation logic
- [X] 7.4 Implement zoom bounds constraints (10%-400%)
- [X] 7.5 Implement zoom-to-fit calculation
- [X] 7.6 Implement smooth animation with requestAnimationFrame
- [X] 7.7 Implement viewport bounds calculation
- [X] 7.8 Handle edge detection for pan boundaries
- [X] 7.9 Optimize transform calculations for performance
- [X] 7.10 Add transform state validation

### Task 8: Search Engine

**Requirements**: Req 13
**Design References**: Search algorithm
**Properties**: 40, 41, 42

- [X] 8.1 Implement searchNodes() with case-sensitive option
- [X] 8.2 Implement depth-first traversal for search
- [X] 8.3 Implement search result highlighting logic
- [X] 8.4 Implement navigateToSearchResult() with ancestor expansion
- [X] 8.5 Implement viewport centering on search result
- [X] 8.6 Implement next/previous result navigation
- [X] 8.7 Implement real-time search with debouncing
- [X] 8.8 Implement search result count tracking
- [X] 8.9 Handle empty search results gracefully
- [X] 8.10 Optimize search performance for large trees

### Task 9: Color Management

**Requirements**: Req 3
**Design References**: Color assignment algorithm
**Properties**: 16, 17, 18, 19

- [X] 9.1 Define predefined color palette with visual harmony
- [X] 9.2 Implement random color assignment for root children
- [X] 9.3 Implement color inheritance for descendants
- [X] 9.4 Implement WCAG AA contrast checking (4.5:1 ratio)
- [X] 9.5 Implement color differentiation for siblings
- [X] 9.6 Handle color palette exhaustion gracefully
- [X] 9.7 Implement color randomization on regeneration
- [X] 9.8 Add color configuration options
- [X] 9.9 Test color contrast with various backgrounds
- [X] 9.10 Document color palette choices

## Phase 2: Web Platform Implementation

### Task 10: Platform Abstraction Layer - Interfaces

**Requirements**: Foundation for platform portability
**Design References**: Platform Adapter Implementations

- [X] 10.1 Define StorageAdapter interface
- [X] 10.2 Define FileSystemAdapter interface
- [X] 10.3 Define RendererAdapter interface
- [X] 10.4 Define AutoSaveRecord interface
- [ ] 10.5 Define UserPreferences interface
- [ ] 10.6 Define ExportFormat type
- [ ] 10.7 Define NodeChange interface for renderer updates
- [ ] 10.8 Document adapter interface contracts
- [ ] 10.9 Create adapter factory pattern
- [ ] 10.10 Add adapter interface validation

### Task 11: Web Storage Adapter

**Requirements**: Req 14
**Design References**: WebStorageAdapter class
**Properties**: 23

- [ ] 11.1 Implement IndexedDB initialization
- [ ] 11.2 Implement saveAutoSave() with IndexedDB
- [ ] 11.3 Implement loadAutoSave() with IndexedDB
- [ ] 11.4 Implement clearAutoSave() with IndexedDB
- [ ] 11.5 Implement savePreferences() with LocalStorage
- [ ] 11.6 Implement loadPreferences() with LocalStorage
- [ ] 11.7 Handle IndexedDB quota exceeded errors
- [ ] 11.8 Implement database migration strategy
- [ ] 11.9 Add error handling for storage failures
- [ ] 11.10 Test storage adapter with large datasets

### Task 12: Web File System Adapter

**Requirements**: Req 8, 15
**Design References**: WebFileSystemAdapter class
**Properties**: 23, 24, 25

- [ ] 12.1 Implement openFile() with File System Access API
- [ ] 12.2 Implement fallback file picker with input element
- [ ] 12.3 Implement saveFile() with File System Access API
- [ ] 12.4 Implement fallback download mechanism
- [ ] 12.5 Implement getRecentFiles() with LocalStorage
- [ ] 12.6 Implement addRecentFile() with deduplication
- [ ] 12.7 Implement file handle caching for quick re-save
- [ ] 12.8 Implement drag-and-drop file handling
- [ ] 12.9 Implement file path validation
- [ ] 12.10 Handle file permission errors gracefully

### Task 13: D3.js Renderer Implementation

**Requirements**: Req 2, 3, 10
**Design References**: D3Renderer class, Renderer interface, Markmap rendering patterns

- [ ] 13.1 Initialize D3.js SVG container (reference: markmap-view patterns)
- [ ] 13.2 Implement renderLinks() with curved connections (inspired by Markmap)
- [ ] 13.3 Implement renderNodes() with rectangles and text (custom implementation)
- [ ] 13.4 Apply branch colors to nodes and links (pattern from Markmap)
- [ ] 13.5 Implement node click handlers for expand/collapse
- [ ] 13.6 Implement collapsible indicator icons
- [ ] 13.7 Implement update() with D3 data join (enter/update/exit pattern from Markmap)
- [ ] 13.8 Implement smooth transitions for animations (D3 transition patterns)
- [ ] 13.9 Implement clear() to remove all rendered elements
- [ ] 13.10 Optimize rendering performance with batching
- [ ] 13.11 Document which patterns came from Markmap study

### Task 14: Lazy Rendering System

**Requirements**: Req 16
**Design References**: LazyRenderer, ViewportCuller classes
**Properties**: 43

- [ ] 14.1 Implement ViewportCuller with buffer zone
- [ ] 14.2 Implement viewport bounds calculation
- [ ] 14.3 Implement node visibility checking
- [ ] 14.4 Implement traverseAndCheck() for tree traversal
- [ ] 14.5 Implement visible node set management
- [ ] 14.6 Integrate lazy rendering with D3 renderer
- [ ] 14.7 Implement dynamic loading/unloading of nodes
- [ ] 14.8 Test performance with 1000+ node trees
- [ ] 14.9 Optimize culling algorithm for speed
- [ ] 14.10 Add performance monitoring and metrics

### Task 15: UI Components - Toolbar

**Requirements**: Req 4, 8, 9, 10, 11
**Design References**: Toolbar Component

- [ ] 15.1 Create toolbar component using shadcn/ui Button components
- [ ] 15.2 Implement file operations buttons (open, save, save as) with shadcn/ui
- [ ] 15.3 Implement export dropdown with shadcn/ui DropdownMenu
- [ ] 15.4 Implement layout direction selector (5 options) with shadcn/ui Select
- [ ] 15.5 Implement expand/collapse all buttons with shadcn/ui Button
- [ ] 15.6 Implement reset controls (zoom, pan, all) with shadcn/ui Button
- [ ] 15.7 Display file status indicator (saved/unsaved/saving) with Tailwind badges
- [ ] 15.8 Display current file path with Tailwind text styling
- [ ] 15.9 Implement keyboard shortcut hints on hover with Tailwind tooltips
- [ ] 15.10 Style toolbar with Tailwind CSS and shadcn/ui theme system

### Task 16: UI Components - Canvas

**Requirements**: Req 7, 10
**Design References**: Canvas Component

- [ ] 16.1 Create SVG canvas container
- [ ] 16.2 Implement mouse drag for panning
- [ ] 16.3 Implement mouse wheel for zooming
- [ ] 16.4 Implement touch gestures for pan and zoom
- [ ] 16.5 Implement space+drag for panning
- [ ] 16.6 Apply transform matrix to SVG group
- [ ] 16.7 Implement edge detection and visual feedback
- [ ] 16.8 Integrate lazy rendering system
- [ ] 16.9 Handle window resize events
- [ ] 16.10 Optimize canvas performance for smooth interactions

### Task 17: UI Components - Minimap

**Requirements**: Req 7
**Design References**: Minimap Component
**Properties**: 31, 32

- [ ] 17.1 Create minimap container with fixed position
- [ ] 17.2 Render thumbnail of entire mind map
- [ ] 17.3 Display viewport indicator rectangle
- [ ] 17.4 Implement click-to-navigate functionality
- [ ] 17.5 Update viewport indicator on pan/zoom
- [ ] 17.6 Implement show/hide toggle
- [ ] 17.7 Auto-hide for small mind maps (<100 nodes)
- [ ] 17.8 Scale minimap appropriately for large trees
- [ ] 17.9 Style minimap with semi-transparent overlay
- [ ] 17.10 Optimize minimap rendering performance

### Task 18: UI Components - Search Panel

**Requirements**: Req 13
**Design References**: Search Panel Component

- [ ] 18.1 Create search panel with shadcn/ui Input component
- [ ] 18.2 Implement real-time search with debouncing using shadcn/ui Input
- [ ] 18.3 Display search result count (e.g., "3 of 15") with Tailwind text
- [ ] 18.4 Implement next/previous navigation buttons with shadcn/ui Button
- [ ] 18.5 Implement case-sensitive toggle with shadcn/ui Toggle
- [ ] 18.6 Implement clear search button with shadcn/ui Button
- [ ] 18.7 Highlight matching nodes in visualization with Tailwind classes
- [ ] 18.8 Display "No results found" message with Tailwind styling
- [ ] 18.9 Implement Ctrl/Cmd+F to open search panel
- [ ] 18.10 Implement Escape to close search panel with Tailwind animations

### Task 19: Keyboard Handler System

**Requirements**: Req 11, 20
**Design References**: Keyboard Handler

- [ ] 19.1 Create keyboard event listener at application level
- [ ] 19.2 Implement key combination detection (Ctrl/Cmd modifiers)
- [ ] 19.3 Map Ctrl/Cmd+S to save
- [ ] 19.4 Map Ctrl/Cmd+O to open
- [ ] 19.5 Map Ctrl/Cmd+E to export
- [ ] 19.6 Map Ctrl/Cmd+Z to undo
- [ ] 19.7 Map Ctrl/Cmd+Shift+Z to redo
- [ ] 19.8 Map F key to fit to screen
- [ ] 19.9 Map R key to reset view
- [ ] 19.10 Map E key to expand all
- [ ] 19.11 Map C key to collapse all
- [ ] 19.12 Map 1-5 keys to layout directions
- [ ] 19.13 Map Ctrl/Cmd+F to search
- [ ] 19.14 Map ? key to show shortcut reference
- [ ] 19.15 Prevent browser default actions for mapped keys
- [ ] 19.16 Implement keyboard shortcut reference modal
- [ ] 19.17 Support platform-specific modifiers (Ctrl vs Cmd)
- [ ] 19.18 Add keyboard navigation for accessibility

### Task 20: Export Manager

**Requirements**: Req 4, 18
**Design References**: Export Manager
**Properties**: 20, 21, 22

- [ ] 20.1 Implement HTML export with embedded styles
- [ ] 20.2 Implement SVG export from D3 rendering
- [ ] 20.3 Implement PNG export via canvas conversion
- [ ] 20.4 Implement background color selection (transparent/white)
- [ ] 20.5 Ensure minimum resolution of 1920x1080 for rasters
- [ ] 20.6 Implement export progress indicator
- [ ] 20.7 Implement export cancellation
- [ ] 20.8 Implement export validation before download
- [ ] 20.9 Remember last used export settings
- [ ] 20.10 Handle export errors with retry mechanism
- [ ] 20.11 Display success notification on completion
- [ ] 20.12 Optimize export performance for large mind maps

### Task 21: File Manager

**Requirements**: Req 8, 15
**Design References**: File Manager
**Properties**: 23, 24, 25

- [ ] 21.1 Implement file loading with adapter
- [ ] 21.2 Implement file saving with adapter
- [ ] 21.3 Implement "Save As" functionality
- [ ] 21.4 Implement recent files list management
- [ ] 21.5 Implement drag-and-drop file handling
- [ ] 21.6 Implement unsaved changes detection
- [ ] 21.7 Prompt user before closing with unsaved changes
- [ ] 21.8 Display current file path in UI
- [ ] 21.9 Handle file operation errors gracefully
- [ ] 21.10 Validate file paths before operations

### Task 22: Auto-Save Manager

**Requirements**: Req 14
**Design References**: AutoSaveManager class

- [ ] 22.1 Implement auto-save scheduling with debouncing
- [ ] 22.2 Implement configurable auto-save interval (default 30s)
- [ ] 22.3 Implement auto-save enable/disable toggle
- [ ] 22.4 Create AutoSaveRecord with state snapshot
- [ ] 22.5 Save auto-save records via storage adapter
- [ ] 22.6 Implement crash recovery detection
- [ ] 22.7 Offer recovery on application restart
- [ ] 22.8 Clear recovery data after successful save
- [ ] 22.9 Display save status indicator (saved/unsaved/saving)
- [ ] 22.10 Ensure auto-save doesn't block user interactions

### Task 23: Error Handling System

**Requirements**: Req 5, 17
**Design References**: Error types and recovery strategies
**Properties**: 46, 47, 48

- [ ] 23.1 Create custom error classes (ParseError, FileSystemError, etc.)
- [ ] 23.2 Implement error boundary for component errors
- [ ] 23.3 Implement graceful degradation on errors
- [ ] 23.4 Implement retry mechanism with exponential backoff
- [ ] 23.5 Implement error logging system
- [ ] 23.6 Convert technical errors to user-friendly messages
- [ ] 23.7 Display error notifications with dismiss option
- [ ] 23.8 Preserve application state on error
- [ ] 23.9 Implement error reporting mechanism
- [ ] 23.10 Test error handling for all failure modes

### Task 24: Notification System

**Requirements**: Req 19
**Design References**: Visual feedback requirements

- [ ] 24.1 Create notification component using shadcn/ui Toast
- [ ] 24.2 Implement success notifications (auto-dismiss after 3s) with shadcn/ui
- [ ] 24.3 Implement error notifications (manual dismiss) with shadcn/ui
- [ ] 24.4 Implement warning notifications with shadcn/ui Toast
- [ ] 24.5 Implement info notifications with shadcn/ui Toast
- [ ] 24.6 Display notifications non-intrusively with Tailwind positioning
- [ ] 24.7 Implement notification queue for multiple messages
- [ ] 24.8 Add notification animation with Tailwind transitions
- [ ] 24.9 Style notifications with Tailwind CSS and shadcn/ui theme
- [ ] 24.10 Test notification accessibility with shadcn/ui components

### Task 25: Status Bar

**Requirements**: Req 19
**Design References**: Status bar requirements

- [ ] 25.1 Create status bar component at bottom using Tailwind flexbox
- [ ] 25.2 Display current file name with shadcn/ui Text styling
- [ ] 25.3 Display save status (saved/unsaved/saving) with Tailwind badges
- [ ] 25.4 Display node count with Tailwind text styling
- [ ] 25.5 Display current layout direction with Tailwind text
- [ ] 25.6 Display zoom level percentage with Tailwind text
- [ ] 25.7 Update status bar reactively on state changes
- [ ] 25.8 Style status bar with Tailwind subtle background
- [ ] 25.9 Make status bar items clickable with shadcn/ui Button
- [ ] 25.10 Test status bar responsiveness with Tailwind breakpoints

### Task 26: Main Application Integration

**Requirements**: All requirements
**Design References**: Application architecture

- [ ] 26.1 Create main application entry point (app/page.tsx)
- [ ] 26.2 Set up Next.js App Router with layout.tsx
- [ ] 26.3 Configure Tailwind CSS with globals.css
- [ ] 26.4 Initialize platform adapters (web implementations)
- [ ] 26.5 Initialize state manager and command manager
- [ ] 26.6 Initialize all UI components with shadcn/ui
- [ ] 26.7 Wire up event handlers and data flow
- [ ] 26.8 Implement application lifecycle (mount/unmount)
- [ ] 26.9 Implement resource cleanup on unmount
- [ ] 26.10 Test complete application workflow with Next.js dev server

## Phase 3: Testing Infrastructure

### Task 27: Property-Based Test Generators

**Requirements**: Testing foundation
**Design References**: Test generators

- [ ] 27.1 Create markdown arbitrary generator
- [ ] 27.2 Create tree node arbitrary generator
- [ ] 27.3 Create application state arbitrary generator
- [ ] 27.4 Create transform arbitrary generator
- [ ] 27.5 Create layout direction arbitrary generator
- [ ] 27.6 Configure fast-check with 100 iterations minimum
- [ ] 27.7 Implement shrinking strategies for failing cases
- [ ] 27.8 Test generators produce valid inputs
- [ ] 27.9 Document generator constraints
- [ ] 27.10 Create helper functions for test assertions

### Task 28: Parser Property Tests

**Requirements**: Req 1, 5, 6
**Design References**: Properties 1-9

- [ ] 28.1 Property 1: Parse-serialize round-trip
- [ ] 28.2 Property 2: JSON serialization round-trip
- [ ] 28.3 Property 3: Correct tree structure from indentation
- [ ] 28.4 Property 4: Unlimited nesting support
- [ ] 28.5 Property 5: Invalid indentation error handling
- [ ] 28.6 Property 6: Whitespace-only input rejection
- [ ] 28.7 Property 7: Special character preservation
- [ ] 28.8 Property 8: Indentation type support
- [ ] 28.9 Property 9: Large document support
- [ ] 28.10 Tag all tests with property numbers

### Task 29: Layout Property Tests

**Requirements**: Req 2, 9
**Design References**: Properties 10-15, 33

- [ ] 29.1 Property 10: Root node centering
- [ ] 29.2 Property 11: Two-sided distribution
- [ ] 29.3 Property 12: Balanced layout
- [ ] 29.4 Property 13: Consistent level spacing
- [ ] 29.5 Property 14: No node overlap
- [ ] 29.6 Property 15: Layout recalculation on change
- [ ] 29.7 Property 33: Layout direction switching
- [ ] 29.8 Test all five layout directions
- [ ] 29.9 Test with various tree structures
- [ ] 29.10 Verify performance constraints

### Task 30: Color and Styling Property Tests

**Requirements**: Req 3
**Design References**: Properties 16-19

- [ ] 30.1 Property 16: Branch color assignment
- [ ] 30.2 Property 17: Color contrast requirement
- [ ] 30.3 Property 18: Branch color consistency
- [ ] 30.4 Property 19: Color randomization
- [ ] 30.5 Test WCAG AA compliance (4.5:1 ratio)
- [ ] 30.6 Test color palette exhaustion
- [ ] 30.7 Test color differentiation for siblings
- [ ] 30.8 Verify visual harmony of palette
- [ ] 30.9 Test with various tree sizes
- [ ] 30.10 Document color testing methodology

### Task 31: Export Property Tests

**Requirements**: Req 4
**Design References**: Properties 20-22

- [ ] 31.1 Property 20: Valid export generation
- [ ] 31.2 Property 21: Export resolution requirement
- [ ] 31.3 Property 22: Export error handling
- [ ] 31.4 Test HTML export validity
- [ ] 31.5 Test SVG export validity
- [ ] 31.6 Test PNG export with transparent background
- [ ] 31.7 Test PNG export with white background
- [ ] 31.8 Verify minimum resolution (1920x1080)
- [ ] 31.9 Test export with various tree sizes
- [ ] 31.10 Test export error scenarios

### Task 32: State Management Property Tests

**Requirements**: Req 6, 8, 12
**Design References**: Properties 23-25, 38-39

- [ ] 32.1 Property 23: Save-load round-trip
- [ ] 32.2 Property 24: Recent files list management
- [ ] 32.3 Property 25: File path validation
- [ ] 32.4 Property 38: Undo-redo round-trip
- [ ] 32.5 Property 39: Undo stack capacity
- [ ] 32.6 Test state immutability
- [ ] 32.7 Test command execution and reversal
- [ ] 32.8 Test redo stack clearing
- [ ] 32.9 Test state preservation on error
- [ ] 32.10 Verify all state transitions

### Task 33: Transform and Navigation Property Tests

**Requirements**: Req 7, 10
**Design References**: Properties 26-32, 34-37

- [ ] 33.1 Property 26: Pan transform update
- [ ] 33.2 Property 27: Zoom transform update
- [ ] 33.3 Property 28: Zoom center preservation
- [ ] 33.4 Property 29: Zoom bounds constraint
- [ ] 33.5 Property 30: Zoom-to-fit calculation
- [ ] 33.6 Property 31: Minimap viewport indicator
- [ ] 33.7 Property 32: Minimap navigation
- [ ] 33.8 Property 34: Expand all visibility
- [ ] 33.9 Property 35: Collapse all visibility
- [ ] 33.10 Property 36: Node toggle independence
- [ ] 33.11 Property 37: Collapsible indicator presence
- [ ] 33.12 Test transform calculations accuracy
- [ ] 33.13 Test viewport bounds handling

### Task 34: Search Property Tests

**Requirements**: Req 13
**Design References**: Properties 40-42

- [ ] 34.1 Property 40: Search result matching
- [ ] 34.2 Property 41: Search result navigation
- [ ] 34.3 Property 42: Search result count accuracy
- [ ] 34.4 Test case-sensitive search
- [ ] 34.5 Test case-insensitive search
- [ ] 34.6 Test search with special characters
- [ ] 34.7 Test search with empty query
- [ ] 34.8 Test search result highlighting
- [ ] 34.9 Test ancestor expansion on navigation
- [ ] 34.10 Verify viewport centering on results

### Task 35: Performance Property Tests

**Requirements**: Req 16
**Design References**: Properties 43-45

- [ ] 35.1 Property 43: Rendering frame rate (60fps)
- [ ] 35.2 Property 44: Layout calculation time (<1s)
- [ ] 35.3 Property 45: Search response time (<500ms)
- [ ] 35.4 Test with 1000 node trees
- [ ] 35.5 Test with 500 node trees
- [ ] 35.6 Measure frame times during pan/zoom
- [ ] 35.7 Measure layout calculation duration
- [ ] 35.8 Measure search operation duration
- [ ] 35.9 Verify lazy rendering effectiveness
- [ ] 35.10 Profile memory usage with large trees

### Task 36: Error Handling Property Tests

**Requirements**: Req 17
**Design References**: Properties 46-48

- [ ] 36.1 Property 46: Error message clarity
- [ ] 36.2 Property 47: Graceful degradation
- [ ] 36.3 Property 48: State preservation on error
- [ ] 36.4 Test parse error messages
- [ ] 36.5 Test file system error messages
- [ ] 36.6 Test export error messages
- [ ] 36.7 Test validation error messages
- [ ] 36.8 Verify error recovery mechanisms
- [ ] 36.9 Test state rollback on failure
- [ ] 36.10 Verify no data loss on errors

### Task 37: Unit Tests - Parser

**Requirements**: Req 1, 5
**Design References**: Parser implementation

- [ ] 37.1 Test empty input handling
- [ ] 37.2 Test single node parsing
- [ ] 37.3 Test deeply nested structures
- [ ] 37.4 Test mixed indentation normalization
- [ ] 37.5 Test special character handling
- [ ] 37.6 Test indentation detection (spaces vs tabs)
- [ ] 37.7 Test error messages for invalid input
- [ ] 37.8 Test serialization accuracy
- [ ] 37.9 Test validation function
- [ ] 37.10 Test edge cases and boundary conditions

### Task 38: Unit Tests - Layout Engine

**Requirements**: Req 2, 9
**Design References**: Layout implementations

- [ ] 38.1 Test two-sided layout with various trees
- [ ] 38.2 Test left-to-right layout
- [ ] 38.3 Test right-to-left layout
- [ ] 38.4 Test top-to-bottom layout
- [ ] 38.5 Test bottom-to-top layout
- [ ] 38.6 Test collision detection
- [ ] 38.7 Test spacing calculations
- [ ] 38.8 Test bounds calculation
- [ ] 38.9 Test layout switching
- [ ] 38.10 Test performance with large trees

### Task 39: Unit Tests - State Management

**Requirements**: Req 6, 12
**Design References**: State and command managers

- [ ] 39.1 Test state manager initialization
- [ ] 39.2 Test state updates and notifications
- [ ] 39.3 Test command execution
- [ ] 39.4 Test undo operation
- [ ] 39.5 Test redo operation
- [ ] 39.6 Test undo stack size limit
- [ ] 39.7 Test redo stack clearing
- [ ] 39.8 Test command history
- [ ] 39.9 Test state immutability
- [ ] 39.10 Test all command implementations

### Task 40: Unit Tests - UI Components

**Requirements**: Req 7, 10, 11, 13
**Design References**: UI component implementations

- [ ] 40.1 Test toolbar button interactions
- [ ] 40.2 Test canvas pan and zoom
- [ ] 40.3 Test minimap rendering and navigation
- [ ] 40.4 Test search panel functionality
- [ ] 40.5 Test keyboard handler key mapping
- [ ] 40.6 Test notification display and dismissal
- [ ] 40.7 Test status bar updates
- [ ] 40.8 Test component lifecycle
- [ ] 40.9 Test event handler cleanup
- [ ] 40.10 Test accessibility features

### Task 41: Integration Tests

**Requirements**: All requirements
**Design References**: Complete workflows

- [ ] 41.1 Test complete file load workflow
- [ ] 41.2 Test complete file save workflow
- [ ] 41.3 Test complete export workflow (all formats)
- [ ] 41.4 Test complete search workflow
- [ ] 41.5 Test complete undo/redo workflow
- [ ] 41.6 Test layout switching workflow
- [ ] 41.7 Test expand/collapse workflow
- [ ] 41.8 Test auto-save and recovery workflow
- [ ] 41.9 Test error handling workflows
- [ ] 41.10 Test end-to-end user scenarios

## Phase 4: Advanced Features and Polish

### Task 42: Performance Optimization

**Requirements**: Req 16
**Design References**: Performance optimization strategies
**Properties**: 43, 44, 45

- [ ] 42.1 Implement memoization for layout calculations
- [ ] 42.2 Implement debouncing for expensive operations
- [ ] 42.3 Optimize D3 rendering with data join
- [ ] 42.4 Implement progressive loading for large documents
- [ ] 42.5 Profile and optimize hot code paths
- [ ] 42.6 Reduce memory allocations in tight loops
- [ ] 42.7 Optimize viewport culling algorithm
- [ ] 42.8 Implement requestAnimationFrame for animations
- [ ] 42.9 Test performance with 1000+ node trees
- [ ] 42.10 Document performance benchmarks

### Task 43: Accessibility Enhancements

**Requirements**: Req 20
**Design References**: Accessibility requirements

- [ ] 43.1 Implement Tab navigation between nodes
- [ ] 43.2 Implement Arrow key navigation
- [ ] 43.3 Implement Enter key for expand/collapse
- [ ] 43.4 Add ARIA labels to all interactive elements
- [ ] 43.5 Add screen reader support for node content
- [ ] 43.6 Implement high contrast mode
- [ ] 43.7 Ensure visible focus indicators
- [ ] 43.8 Test keyboard-only navigation
- [ ] 43.9 Test with screen readers
- [ ] 43.10 Verify WCAG 2.1 Level AA compliance

### Task 44: Browser Compatibility

**Requirements**: Req 21
**Design References**: Platform support requirements

- [ ] 44.1 Test on Chrome 90+
- [ ] 44.2 Test on Firefox 88+
- [ ] 44.3 Test on Safari 14+
- [ ] 44.4 Test on Edge 90+
- [ ] 44.5 Implement File System Access API fallbacks
- [ ] 44.6 Test IndexedDB across browsers
- [ ] 44.7 Display warning for unsupported browsers
- [ ] 44.8 Handle platform-specific keyboard shortcuts
- [ ] 44.9 Test on Windows, macOS, Linux
- [ ] 44.10 Document browser compatibility matrix

### Task 45: Documentation

**Requirements**: All requirements
**Design References**: Complete system

- [ ] 45.1 Write comprehensive README with setup instructions
- [ ] 45.2 Document all keyboard shortcuts
- [ ] 45.3 Document file format and frontmatter options
- [ ] 45.4 Create user guide with screenshots
- [ ] 45.5 Document architecture and design decisions
- [ ] 45.6 Create API documentation for core modules
- [ ] 45.7 Document platform adapter interfaces
- [ ] 45.8 Create troubleshooting guide
- [ ] 45.9 Document browser compatibility
- [ ] 45.10 Create contribution guidelines

### Task 46: Build and Deployment

**Requirements**: Foundation for distribution
**Design References**: Build configuration

- [ ] 46.1 Configure Next.js production build with optimizations
- [ ] 46.2 Optimize bundle size with Next.js tree-shaking
- [ ] 46.3 Configure asset optimization (minification, compression)
- [ ] 46.4 Set up source maps for debugging
- [ ] 46.5 Create deployment scripts for Next.js
- [ ] 46.6 Test production build locally with `next build && next start`
- [ ] 46.7 Set up static file hosting configuration for Next.js
- [ ] 46.8 Configure CSP headers for security
- [ ] 46.9 Create release checklist
- [ ] 46.10 Document deployment process for Next.js

## Phase 5: VS Code Extension (Optional)

### Task 47: VS Code Extension Setup

**Requirements**: Platform portability
**Design References**: VS Code extension architecture

- [x] 47.1 Create VS Code extension manifest (package.json)
- [x] 47.2 Configure extension activation events
- [x] 47.3 Set up separate Vite config for webview build
- [x] 47.4 Create extension entry point (extension.ts)
- [x] 47.5 Configure TypeScript for Node.js environment
- [ ] 47.6 Set up extension development workflow
- [ ] 47.7 Configure extension packaging with vsce
- [ ] 47.8 Create extension icon and branding
- [ ] 47.9 Write extension README
- [ ] 47.10 Set up extension testing environment

### Task 48: VS Code Platform Adapters

**Requirements**: Platform portability
**Design References**: VSCodeStorageAdapter, VSCodeFileSystemAdapter

- [x] 48.1 Implement VSCodeStorageAdapter with workspace state
- [x] 48.2 Implement VSCodeStorageAdapter with global state
- [x] 48.3 Implement VSCodeFileSystemAdapter with VS Code FS API
- [x] 48.4 Implement file picker with showOpenDialog
- [x] 48.5 Implement file save with showSaveDialog
- [ ] 48.6 Implement recent files with global state
- [ ] 48.7 Handle VS Code file system errors
- [ ] 48.8 Test adapters with VS Code APIs
- [x] 48.9 Implement adapter factory for VS Code
- [ ] 48.10 Document VS Code adapter differences

### Task 49: VS Code Extension Host

**Requirements**: Platform portability
**Design References**: Extension host responsibilities

- [x] 49.1 Register VS Code commands (mindmap.open, mindmap.export, etc.)
- [x] 49.2 Create webview panel management
- [x] 49.3 Implement message passing protocol
- [x] 49.4 Handle file system operations in extension host
- [x] 49.5 Manage extension state and preferences
- [x] 49.6 Implement command handlers
- [x] 49.7 Handle webview lifecycle (create, dispose)
- [x] 49.8 Implement error handling in extension host
- [x] 49.9 Add extension activation/deactivation logic
- [ ] 49.10 Test extension host functionality

### Task 50: VS Code Webview Integration

**Requirements**: Platform portability
**Design References**: Webview responsibilities

- [x] 50.1 Create webview HTML entry point
- [x] 50.2 Bundle shared core logic for webview
- [x] 50.3 Implement message passing from webview
- [x] 50.4 Handle file content from extension host
- [x] 50.5 Send save requests to extension host
- [ ] 50.6 Send export requests to extension host
- [x] 50.7 Configure CSP for webview security
- [x] 50.8 Handle webview resource loading
- [ ] 50.9 Test webview rendering
- [ ] 50.10 Optimize webview bundle size

### Task 51: VS Code Extension Testing

**Requirements**: Platform portability
**Design References**: VS Code extension testing

- [ ] 51.1 Set up VS Code extension test environment
- [ ] 51.2 Test command registration and execution
- [ ] 51.3 Test webview creation and disposal
- [ ] 51.4 Test message passing between host and webview
- [ ] 51.5 Test file operations with VS Code APIs
- [ ] 51.6 Test state persistence
- [ ] 51.7 Test extension activation/deactivation
- [ ] 51.8 Test with various VS Code versions
- [ ] 51.9 Test on different platforms (Windows, macOS, Linux)
- [ ] 51.10 Create extension test suite

### Task 52: VS Code Extension Publishing

**Requirements**: Platform portability
**Design References**: VS Code Marketplace

- [ ] 52.1 Create publisher account on VS Code Marketplace
- [ ] 52.2 Configure extension metadata (categories, keywords)
- [ ] 52.3 Create extension screenshots and demo
- [ ] 52.4 Write detailed extension description
- [ ] 52.5 Set up changelog for extension
- [ ] 52.6 Package extension with vsce
- [ ] 52.7 Test packaged extension locally
- [ ] 52.8 Publish to VS Code Marketplace
- [ ] 52.9 Set up automated publishing pipeline
- [ ] 52.10 Monitor extension analytics and feedback

## Task Summary

**Total Tasks**: 53 major tasks with 532 sub-tasks

**Phase Breakdown**:

- Phase 0 (Markmap Study): 1 task, 10 sub-tasks
- Phase 1 (Core Foundation): 9 tasks, 92 sub-tasks
- Phase 2 (Web Platform): 17 tasks, 171 sub-tasks
- Phase 3 (Testing): 15 tasks, 150 sub-tasks
- Phase 4 (Polish): 5 tasks, 50 sub-tasks
- Phase 5 (VS Code Extension): 6 tasks, 60 sub-tasks

**Estimated Timeline**:

- Phase 0: 3-5 days (Markmap study)
- Phase 1: 3-4 weeks
- Phase 2: 4-5 weeks
- Phase 3: 3-4 weeks
- Phase 4: 2-3 weeks
- Phase 5: 2-3 weeks (optional)

**Total Estimated Time**: 1 week + 14-19 weeks for web application, +2-3 weeks for VS Code extension

## Dependencies and Prerequisites

### Task Dependencies

**Critical Path**:

1. Task 1 (Project Setup) → All other tasks
2. Task 2 (Data Structures) → Tasks 3-9, 27
3. Task 3 (Parser) → Tasks 4, 13, 26, 28
4. Task 4-5 (Layout) → Tasks 13, 26, 29
5. Task 6 (State Management) → Tasks 21, 22, 26, 32
6. Task 10 (Platform Interfaces) → Tasks 11-12, 47-48
7. Tasks 11-25 (Web Implementation) → Task 26
8. Task 26 (Integration) → Tasks 41, 46
9. Tasks 27-36 (Property Tests) → Continuous validation
10. Tasks 47-52 (VS Code Extension) → After Task 26

**Parallel Work Opportunities**:

- Tasks 3-9 (Core modules) can be developed in parallel after Task 2
- Tasks 11-12 (Platform adapters) can be developed in parallel after Task 10
- Tasks 15-20 (UI components) can be developed in parallel after Tasks 13-14
- Tasks 28-36 (Property tests) can be written alongside implementation
- Tasks 37-40 (Unit tests) can be written alongside implementation

### External Dependencies

**Core Libraries**:

- TypeScript 5.x
- D3.js v7
- Next.js 14+
- React 18+
- Jest 29.x
- fast-check 3.x

**Web Platform**:

- Tailwind CSS 3.x
- shadcn/ui (component library)
- Radix UI (accessibility primitives)
- Browser File System Access API (with fallback)
- IndexedDB API
- LocalStorage API
- Canvas API

**VS Code Platform** (optional):

- VS Code Extension API
- @types/vscode
- vsce (packaging tool)

### Development Environment

**Required**:

- Node.js 18+ and npm/yarn
- Modern browser (Chrome 90+, Firefox 88+, Safari 14+, Edge 90+)
- Git for version control
- Code editor with TypeScript support

**Optional**:

- VS Code for extension development
- Browser DevTools for debugging
- Performance profiling tools

## Testing Strategy

### Property-Based Testing

All property tests must:

- Use fast-check 3.x library
- Run minimum 100 iterations per test
- Include comment tag: `// Feature: inklink, Property {number}: {description}`
- Reference specific design properties (1-48)
- Test universal behaviors across all valid inputs

### Unit Testing

All unit tests must:

- Test specific examples and edge cases
- Cover error conditions and boundary values
- Mock external dependencies (file system, storage)
- Achieve >80% code coverage
- Run quickly (<5 seconds per test file)

### Integration Testing

Integration tests must:

- Test complete user workflows
- Verify component interactions
- Test with realistic data
- Cover happy paths and error scenarios
- Run in isolated test environment

### Performance Testing

Performance tests must:

- Measure frame rates during pan/zoom
- Measure layout calculation times
- Measure search operation times
- Test with large datasets (1000+ nodes)
- Verify performance targets are met

## Risk Management

### High-Risk Areas

1. **Performance with Large Trees**

   - Risk: Rendering slowdown with 1000+ nodes
   - Mitigation: Lazy rendering, viewport culling, performance testing
   - Contingency: Reduce node limit, add progressive loading
2. **Browser Compatibility**

   - Risk: File System Access API not available in all browsers
   - Mitigation: Implement fallback mechanisms
   - Contingency: Document browser requirements clearly
3. **State Management Complexity**

   - Risk: Undo/redo bugs with complex state
   - Mitigation: Immutable state, comprehensive testing
   - Contingency: Simplify undo scope if needed
4. **Export Reliability**

   - Risk: Export failures with large mind maps
   - Mitigation: Progress indicators, validation, retry logic
   - Contingency: Reduce export resolution, add size warnings
5. **Platform Portability**

   - Risk: Tight coupling between web and core logic
   - Mitigation: Platform abstraction layer, adapter pattern
   - Contingency: Maintain separate codebases if needed

## Success Criteria

### Functional Completeness

- [ ] All 21 requirements fully implemented
- [ ] All 48 correctness properties validated
- [ ] All keyboard shortcuts working
- [ ] All export formats functional
- [ ] All layout directions working
- [ ] File save/load working reliably
- [ ] Search functionality complete
- [ ] Undo/redo working for all operations
- [ ] Auto-save and recovery working
- [ ] Error handling comprehensive

### Quality Metrics

- [ ] 
- [ ] All property tests passing (100 iterations each)
- [ ] All unit tests passing
- [ ] All integration tests passing
- [ ] Zero critical bugs
- [ ] Performance targets met (60fps, <1s layout, <500ms search)
- [ ] Accessibility requirements met (WCAG 2.1 Level AA)
- [ ] Browser compatibility verified
- [ ] Documentation complete
- [ ] Code review completed

### User Experience

- [ ] Smooth pan and zoom interactions
- [ ] Responsive UI with no lag
- [ ] Clear visual feedback for all operations
- [ ] Intuitive keyboard shortcuts
- [ ] Helpful error messages
- [ ] Professional visual design
- [ ] Consistent behavior across features
- [ ] No data loss scenarios
- [ ] Fast load times
- [ ] Reliable exports

### Platform Portability (Optional)

- [ ] Core logic 100% platform-agnostic
- [ ] Platform adapters cleanly separated
- [ ] VS Code extension functional
- [ ] Shared core working in both platforms
- [ ] No code duplication between platforms
- [ ] Both platforms pass all tests
- [ ] Documentation covers both platforms
- [ ] Build process supports both targets

## Next Steps

After completing tasks.md:

1. **Review and Approval**: User reviews and approves the implementation plan
2. **Begin Implementation**: Start with Phase 1, Task 1 (Project Setup)
3. **Iterative Development**: Complete tasks in order, testing continuously
4. **Regular Check-ins**: Review progress and adjust plan as needed
5. **Quality Gates**: Ensure each phase meets quality criteria before proceeding
6. **Documentation**: Keep documentation updated throughout development
7. **Testing**: Run property tests and unit tests continuously
8. **Deployment**: Deploy web application after Phase 4
9. **VS Code Extension**: Optionally proceed to Phase 5 for extension

The spec is now complete and ready for implementation!
