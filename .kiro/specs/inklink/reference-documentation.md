# Reference Documentation: Markdown to Mind Map Generator

This document provides a comprehensive reference for the development team, consolidating all patterns and decisions from the Markmap study phase.

## Project Overview

The Markdown to Mind Map Generator transforms markdown documents into interactive mind maps. Built as a conceptual fork of Markmap, it extends the base functionality with professional features including file persistence, multiple layout algorithms, and comprehensive keyboard shortcuts.

**Reference Implementation**: https://github.com/markmap/markmap

**License**: Markmap is MIT licensed (permissive)

## Architecture Summary

```
┌─────────────────────────────────────────────────────────────┐
│                    User Interface Layer                      │
│  (Toolbar, Canvas, Minimap, Search Panel, Keyboard Handler) │
└─────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────────────────────────────────────┐
│                    Application Layer                         │
│     (State Manager, Command Manager, File Manager,          │
│      Export Manager, Auto-Save Manager, Search Engine)      │
└─────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────────────────────────────────────┐
│                  Core Engine Layer (Platform Agnostic)       │
│  (Markdown Parser, Layout Engine, Tree Data Structures,     │
│   Transform Manager, Color Management)                       │
└─────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────────────────────────────────────┐
│                Platform Abstraction Layer                    │
│    (Storage Adapter, File System Adapter, Renderer Adapter) │
└─────────────────────────────────────────────────────────────┘
```

## What We Learned from Markmap

### D3.js Rendering Patterns

**Full Adoption** - These patterns are adopted directly from Markmap:

1. **SVG Container Structure**
   ```typescript
   this.svg = select(svg);
   this.styleNode = this.svg.append('style');
   this.g = this.svg.append('g');
   this.g.append('g').attr('class', 'markmap-highlight');
   ```

2. **Data Binding (Enter/Update/Exit)**
   ```typescript
   const mmG = this.g
     .selectAll<SVGGElement, INode>('g.markmap-node')
     .data(nodes, (d) => d.state.key);
   
   const mmGEnter = mmG.enter().append('g')...
   const mmGExit = mmG.exit()...
   const mmGMerge = mmG.merge(mmGEnter)...
   ```

3. **Link Rendering with d3.linkHorizontal**
   ```typescript
   import { linkHorizontal } from 'd3';
   const linkShape = linkHorizontal();
   // Curved horizontal connections between nodes
   ```

4. **D3 Zoom Behavior**
   ```typescript
   import { zoom, zoomIdentity, zoomTransform } from 'd3';
   this.zoom = zoom<SVGElement, unknown>()
     .scaleExtent([0.1, 4.0])
     .on('zoom', this.handleZoom);
   ```

5. **Color Application**
   ```typescript
   import { scaleOrdinal } from 'd3';
   const colorFn = scaleOrdinal(colorPalette);
   color = (node) => colorFn(node.state.path);
   ```

6. **ForeignObject for Node Content**
   ```typescript
   mmFoEnter
     .append('foreignObject')
     .attr('x', paddingX)
     .append<HTMLDivElement>('xhtml:div')
     .html((d) => d.content)
     .attr('xmlns', 'http://www.w3.org/1999/xhtml');
   ```

7. **Transition Patterns**
   ```typescript
   transition<T>(sel: d3.Selection<T>): d3.Transition<T> {
     return sel.transition().duration(this.options.duration);
   }
   ```

### What We Replace

| Component | Markmap | Our Implementation |
|-----------|---------|-------------------|
| Parser | markdown-it with plugins | Custom indentation-based parser |
| Layout | d3-flextree (single layout) | 5 custom layout algorithms |
| State | Minimal, no undo/redo | Command pattern with full undo/redo |
| Files | Browser-only, no persistence | Platform adapters |
| Search | None | Full-text search with navigation |
| Shortcuts | Basic only | Comprehensive keyboard handling |
| Auto-save | None | IndexedDB-based with recovery |
| Minimap | None | Thumbnail with viewport indicator |

## Core Data Structures

### TreeNode Interface

```typescript
interface TreeNode {
  id: string;                    // Unique identifier
  content: string;               // Text content from markdown
  depth: number;                 // Indentation level (0 = root)
  children: TreeNode[];          // Child nodes
  parent: TreeNode | null;       // Parent node reference
  collapsed: boolean;            // Visibility state
  color: string;                 // Branch color
  metadata: NodeMetadata;        // Rendering information
}

interface NodeMetadata {
  x: number;                     // Calculated x position
  y: number;                     // Calculated y position
  width: number;                 // Rendered width
  height: number;                // Rendered height
  visible: boolean;              // In viewport
  highlighted: boolean;          // Search highlight
}
```

### Type Guards for Runtime Validation

The application includes comprehensive type guards for runtime validation of all core data structures. These guards ensure data integrity and prevent type-related runtime errors.

```typescript
// Type guard imports
import type {
  TreeNode,
  NodeMetadata,
  ApplicationState,
  Transform,
  Viewport,
  Position,
  BoundingBox,
  FileHandle,
  Notification,
  ValidationResult,
  ValidationError,
  Command,
  LayoutDirection,
  ExportFormat,
  AutoSaveRecord,
  UserPreferences,
  NodeChange,
  SearchResult,
} from './index';

// Core type guards
export function isTreeNode(value: unknown): value is TreeNode
export function isNodeMetadata(value: unknown): value is NodeMetadata
export function isApplicationState(value: unknown): value is ApplicationState
export function isTransform(value: unknown): value is Transform
export function isViewport(value: unknown): value is Viewport
export function isPosition(value: unknown): value is Position
export function isBoundingBox(value: unknown): value is BoundingBox
export function isFileHandle(value: unknown): value is FileHandle
export function isNotification(value: unknown): value is Notification
export function isValidationResult(value: unknown): value is ValidationResult
export function isValidationError(value: unknown): value is ValidationError
export function isCommand<T>(value: unknown): value is Command<T>
export function isLayoutDirection(value: unknown): value is LayoutDirection
export function isExportFormat(value: unknown): value is ExportFormat
export function isAutoSaveRecord(value: unknown): value is AutoSaveRecord
export function isUserPreferences(value: unknown): value is UserPreferences
export function isNodeChange(value: unknown): value is NodeChange
export function isSearchResult(value: unknown): value is SearchResult

// Utility type guards
export function isObject(value: unknown): value is Record<string, unknown>
export function isStringArray(value: unknown): value is string[]
export function isNumberArray(value: unknown): value is number[]

// Tree validation
export function validateTree(root: unknown): ValidationResult
```

### Tree Validation

The `validateTree` function performs comprehensive validation of tree structures:

```typescript
interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationError[];
}

function validateTree(root: unknown): ValidationResult {
  // Validates:
  // 1. Root is a valid TreeNode
  // 2. No circular references (using visited set)
  // 3. Maximum nesting depth (100 levels)
  return { valid, errors, warnings };
}
```

### ApplicationState Interface

```typescript
interface ApplicationState {
  tree: TreeNode | null;
  markdown: string;
  currentFile: FileHandle | null;
  filePath: string | null;
  isDirty: boolean;
  layoutDirection: LayoutDirection;
  transform: Transform;
  selectedNode: string | null;
  searchQuery: string;
  // ... additional state
}

interface Transform {
  x: number;                     // Pan offset X
  y: number;                     // Pan offset Y
  scale: number;                 // Zoom level (0.1 to 4.0)
}

type LayoutDirection = 
  | 'two-sided'
  | 'left-to-right'
  | 'right-to-left'
  | 'top-to-bottom'
  | 'bottom-to-top';
```

## Layout Algorithms

### Two-Sided Layout (Default)

Distributes children evenly between left and right sides of the root node.

```typescript
class TwoSidedLayout implements LayoutAlgorithm {
  calculateLayout(root: TreeNode, viewport: Viewport): Map<string, Position> {
    // 1. Place root at center
    // 2. Partition children: even indices → left, odd indices → right
    // 3. Recursively layout each branch
    // 4. Detect and resolve collisions
  }
}
```

### Directional Layouts

Four additional layouts for different orientations:
- **Left-to-Right**: All branches extend rightward
- **Right-to-Left**: All branches extend leftward
- **Top-to-Bottom**: All branches extend downward
- **Bottom-to-Top**: All branches extend upward

## Parser Implementation

### Indentation-Based Parsing

```typescript
class IndentationParser implements MarkdownParser {
  parse(markdown: string): TreeNode {
    const lines = markdown.split('\n').filter(line => line.trim());
    const indentType = this.detectIndentation(lines);
    return this.buildTree(lines, indentType);
  }

  private buildTree(lines: string[], indentType: 'spaces' | 'tabs'): TreeNode {
    const root = createRootNode();
    const stack: TreeNode[] = [root];

    for (const line of lines) {
      const indentLevel = this.getIndentLevel(line, indentType);
      const node = createNode(line.trim(), indentLevel);

      // Pop stack to find correct parent
      while (stack.length > 1 && stack[stack.length - 1].depth >= indentLevel) {
        stack.pop();
      }

      const parent = stack[stack.length - 1];
      node.parent = parent;
      node.color = deriveColor(parent, node);
      parent.children.push(node);
      stack.push(node);
    }

    return root;
  }
}
```

### Indentation Detection Module

The `src/core/parser/indentation.ts` module provides utilities for detecting, validating, and normalizing indentation in markdown content.

#### Type Definitions

```typescript
/**
 * Supported indentation types
 */
export type IndentationType = 'spaces' | 'tabs';

/**
 * Result of indentation detection
 */
export interface IndentationResult {
  type: IndentationType;
  indentSize: number;
  firstIndentedLine: number;
}
```

#### Core Functions

**detectIndentation()** - Detects the indentation type used in markdown content

```typescript
/**
 * Detects the indentation type used in markdown content
 * @param markdown - Raw markdown text
 * @returns IndentationResult with type, size, and line info
 * @throws IndentationError if no indented lines are found
 */
export function detectIndentation(markdown: string): IndentationResult
```

**validateIndentation()** - Validates that all indentation in the document is consistent

```typescript
/**
 * Validates that all indentation in the document is consistent
 * @param markdown - Raw markdown text
 * @param expectedType - Expected indentation type
 * @returns IndentationValidationResult with any inconsistencies found
 */
export function validateIndentation(
  markdown: string,
  expectedType: IndentationType
): IndentationValidationResult
```

**normalizeIndentation()** - Normalizes indentation to the expected type

```typescript
/**
 * Normalizes indentation to the target type
 * @param markdown - Raw markdown text
 * @param targetType - Target indentation type
 * @param indentSize - Number of spaces or tabs per level (default: 2)
 * @returns Markdown with normalized indentation
 */
export function normalizeIndentation(
  markdown: string,
  targetType: IndentationType,
  indentSize: number = 2
): string
```

**calculateIndentLevel()** - Calculates the indentation level of a line

```typescript
/**
 * Calculates the indentation level of a line
 * @param line - A single line of markdown
 * @param indentType - The detected indentation type
 * @param indentSize - The indent size for spaces
 * @returns Number of indentation levels (0 for root)
 */
export function calculateIndentLevel(
  line: string,
  indentType: IndentationType,
  indentSize: number
): number
```

#### Error Handling

```typescript
/**
 * Error class for indentation-related errors
 */
export class IndentationError extends Error {
  line: number;
  constructor(message: string, line: number);
}

/**
 * Represents an indentation inconsistency
 */
export interface IndentationInconsistency {
  line: number;
  found: 'spaces' | 'tabs';
  expected: 'spaces' | 'tabs';
  message: string;
}

/**
 * Result of indentation validation
 */
export interface IndentationValidationResult {
  valid: boolean;
  inconsistencies: IndentationInconsistency[];
}
```

#### Usage Example

```typescript
import {
  detectIndentation,
  validateIndentation,
  normalizeIndentation,
  calculateIndentLevel,
} from './indentation';

// Detect indentation in markdown
const markdown = `
# Root
  ## Child 1
    ### Grandchild
  ## Child 2
`;

const result = detectIndentation(markdown);
// { type: 'spaces', indentSize: 2, firstIndentedLine: 1 }

// Validate consistency
const validation = validateIndentation(markdown, 'spaces');
// { valid: true, inconsistencies: [] }

// Normalize to tabs
const normalized = normalizeIndentation(markdown, 'tabs');
// Converts 2-space indentation to tabs

// Calculate indent level for a line
const level = calculateIndentLevel('    text', 'spaces', 2);
// Returns: 2
```

## Command Pattern for Undo/Redo

```typescript
interface Command {
  execute(state: ApplicationState): ApplicationState;
  undo(state: ApplicationState): ApplicationState;
  description: string;
}

class CommandManager {
  private undoStack: Command[] = [];
  private redoStack: Command[] = [];
  private readonly MAX_STACK = 50;

  execute(command: Command): void {
    this.undoStack.push(command);
    if (this.undoStack.length > this.MAX_STACK) {
      this.undoStack.shift();
    }
    this.redoStack = []; // Clear redo on new command
  }

  undo(): Command | undefined {
    const command = this.undoStack.pop();
    if (command) {
      this.redoStack.push(command);
    }
    return command;
  }

  redo(): Command | undefined {
    const command = this.redoStack.pop();
    if (command) {
      this.undoStack.push(command);
    }
    return command;
  }
}
```

## Platform Adapters

### Storage Adapter Interface

```typescript
interface StorageAdapter {
  saveAutoSave(record: AutoSaveRecord): Promise<void>;
  loadAutoSave(): Promise<AutoSaveRecord | null>;
  clearAutoSave(): Promise<void>;
  savePreferences(prefs: UserPreferences): Promise<void>;
  loadPreferences(): Promise<UserPreferences>;
}
```

### File System Adapter Interface

```typescript
interface FileSystemAdapter {
  openFile(): Promise<{ content: string; path: string; handle?: any }>;
  saveFile(content: string, path?: string, handle?: any): Promise<void>;
  getRecentFiles(): Promise<string[]>;
  addRecentFile(path: string): Promise<void>;
}
```

## Color Palette

Custom palette for visual harmony (replaces schemeCategory10):

```typescript
const colorPalette = [
  '#4e79a7', // Blue
  '#f28e2b', // Orange
  '#e15759', // Red
  '#76b7b2', // Teal
  '#59a14f', // Green
  '#edc948', // Yellow
  '#b07aa1', // Purple
  '#ff9da7', // Pink
  '#9c755f', // Brown
  '#bab0ac', // Gray
];
```

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| Ctrl/Cmd+S | Save |
| Ctrl/Cmd+O | Open |
| Ctrl/Cmd+E | Export |
| Ctrl/Cmd+Z | Undo |
| Ctrl/Cmd+Shift+Z | Redo |
| Ctrl/Cmd+F | Search |
| F | Fit to screen |
| R | Reset view |
| E | Expand all |
| C | Collapse all |
| 1-5 | Switch layout |
| Space+drag | Pan |
| Ctrl+scroll | Zoom |

## Pan/Zoom Implementation

### Zoom Constraints
- Minimum: 10% (0.1 scale)
- Maximum: 400% (4.0 scale)
- Default: 100% (1.0 scale)

### Edge Detection
Visual feedback when panning beyond mind map boundaries.

### Smooth Animations
All transitions use 300ms duration with ease-out-cubic easing.

## SVG Structure

```
<svg class="markmap">
  <style>{globalCSS + customCSS}</style>
  <g transform="{zoomTransform}">
    <g class="markmap-highlight">
      <rect />  <!-- Search highlight -->
    </g>
    {links.map((link) => (
      <path class="markmap-link" d={linkShape} stroke={color} />
    ))}
    {nodes.map((node) => (
      <g class="markmap-node" transform="translate(x, y)">
        <line class="markmap-line" stroke={color} />
        <circle class="markmap-circle" stroke={color} />
        <foreignObject>
          <div>{content}</div>
        </foreignObject>
      </g>
    ))}
  </g>
</svg>
```

## Performance Targets

| Metric | Target |
|--------|--------|
| Rendering | 60fps for 1000 nodes |
| Layout calculation | <1s for 500 nodes |
| Search | <500ms for 1000 nodes |
| File load | <2s for 5000 lines |

## File Organization

```
src/
├── core/                      # Platform-agnostic core
│   ├── parser/               # Markdown parser
│   ├── layout/               # Layout algorithms
│   ├── state/                # State & command managers
│   ├── transform/            # Pan/zoom calculations
│   ├── search/               # Search engine
│   └── types/                # TypeScript interfaces
│
├── platform/                  # Platform abstraction
│   ├── adapters/             # Adapter interfaces
│   ├── web/                  # Web implementations
│   └── vscode/               # VS Code implementations
│
├── components/                # UI components
│   ├── toolbar.tsx
│   ├── canvas.tsx
│   ├── minimap.tsx
│   └── search-panel.tsx
│
└── app/                       # Next.js App Router
    ├── layout.tsx
    └── page.tsx
```

## Testing Strategy

- **Property-Based Testing**: fast-check for correctness properties
- **Unit Tests**: Jest for individual components
- **Integration Tests**: Complete workflow testing

### Key Properties to Test

1. Parse-serialize round-trip
2. Layout no-overlap
3. Color branch consistency
4. Undo-redo round-trip
5. Export validity

## Dependencies

```json
{
  "dependencies": {
    "next": ">=16.0.0",
    "react": ">=18.0.0",
    "d3": "^7.0.0",
    "tailwindcss": "^3.4.0",
    "class-variance-authority": "^0.7.0",
    "clsx": "^2.1.0",
    "tailwind-merge": "^2.2.0",
    "lucide-react": "^0.300.0",
    "radix-ui": "^1.0.0"
  },
  "devDependencies": {
    "typescript": "^5.0.0",
    "@types/d3": "^7.0.0",
    "jest": "^29.0.0",
    "fast-check": "^3.0.0",
    "eslint": "^8.0.0",
    "prettier": "^3.0.0"
  }
}
```

## Attribution

This project uses Markmap (https://github.com/markmap/markmap) as a reference implementation. The parser, layout engine, state management, and other core features are custom implementations. Markmap is used for learning purposes only, not as a dependency.

## Related Documentation

- [Code Patterns to Adopt vs Replace](./code-patterns-adopt-replace.md)
- [D3.js Patterns](./d3-js-patterns.md)
- [Tree Data Structure Patterns](./tree-data-structure-patterns.md)
- [Pan/Zoom Interaction Patterns](./pan-zoom-interaction-patterns.md)
- [Color Application Patterns](./color-application-patterns.md)

## Error Handling Patterns

### Custom Error Classes

```typescript
class ParseError extends Error {
  constructor(
    message: string,
    public line: number,
    public column: number,
    public context: string
  ) {
    super(`Parse error at line ${line}, column ${column}: ${message}`);
    this.name = 'ParseError';
  }
}

class FileSystemError extends Error {
  constructor(
    message: string,
    public operation: 'read' | 'write' | 'open' | 'save',
    public path?: string,
    public cause?: Error
  ) {
    super(`File system error during ${operation}: ${message}`);
    this.name = 'FileSystemError';
  }
}

class ExportError extends Error {
  constructor(
    message: string,
    public format: ExportFormat,
    public cause?: Error
  ) {
    super(`Export error (${format}): ${message}`);
    this.name = 'ExportError';
  }
}
```

### Error Recovery Strategies

| Error Type | Recovery Strategy |
|------------|------------------|
| Parse error | Show line/column, allow editing |
| File not found | Offer to create new file |
| Permission denied | Suggest alternative location |
| Export timeout | Show progress, allow cancel |
| Storage full | Suggest clearing auto-saves |

## Export Formats

### HTML Export

```typescript
interface HTMLExportOptions {
  includeStyles: boolean;        // Embed CSS in output
  includeInteractivity: boolean; // Enable pan/zoom in export
  theme: 'light' | 'dark' | 'auto';
  title?: string;                // Document title
}
```

The HTML export embeds a self-contained SVG with all necessary styles and D3.js for interactivity.

### SVG Export

```typescript
interface SVGExportOptions {
  includeStyles: boolean;        // Embed CSS in defs
  includeMetadata: boolean;      // Include viewBox, dimensions
  precision: number;             // Decimal places for coordinates
}
```

SVG exports are vector-based and scalable to any resolution.

### PNG Export

```typescript
interface PNGExportOptions {
  background: 'transparent' | 'white';
  scale: number;                 // 1 = 72dpi, 2 = 144dpi, etc.
  width?: number;                // Explicit width (overrides scale)
  height?: number;               // Explicit height
  minimumResolution: {           // Enforce 1920x1080 minimum
    width: 1920;
    height: 1080;
  };
}
```

PNG exports use canvas API for rasterization with configurable background.

## Search Implementation

### Search Algorithm

```typescript
class SearchEngine {
  /**
   * Search nodes matching query
   * @param tree - Root node to search
   * @param query - Search text
   * @param caseSensitive - Whether to match case
   * @returns Array of matching nodes
   */
  searchNodes(
    tree: TreeNode,
    query: string,
    caseSensitive: boolean = false
  ): TreeNode[] {
    const results: TreeNode[] = [];
    const searchText = caseSensitive ? query : query.toLowerCase();

    const traverse = (node: TreeNode): void => {
      const content = caseSensitive 
        ? node.content 
        : node.content.toLowerCase();
      
      if (content.includes(searchText)) {
        results.push(node);
      }
      node.children.forEach(traverse);
    };

    traverse(tree);
    return results;
  }

  /**
   * Expand all ancestors to make node visible
   */
  expandAncestors(node: TreeNode): void {
    let current = node.parent;
    while (current) {
      current.collapsed = false;
      current = current.parent;
    }
  }
}
```

### Search Navigation

```typescript
interface SearchNavigation {
  currentIndex: number;
  totalResults: number;
  
  next(): void;
  previous(): void;
  goTo(index: number): void;
  
  // Center viewport on current result
  centerOnResult(node: TreeNode): void;
}
```

## Auto-Save Implementation

### Auto-Save Record

```typescript
interface AutoSaveRecord {
  id: string;
  timestamp: Date;
  markdown: string;
  state: {
    layoutDirection: LayoutDirection;
    transform: Transform;
    collapsedNodes: string[];  // IDs of collapsed nodes
  };
  filePath: string | null;
}
```

### Recovery Flow

```
Application Start
       │
       ▼
┌──────────────────┐
│ Check for        │
│ auto-save record │
└────────┬─────────┘
         │
    ┌────┴────┐
    │ Record  │ No
    │ exists? │
    └────┬────┘
         │ Yes
         ▼
┌──────────────────┐
│ Prompt user:     │
│ "Recover from    │
│  auto-save?"     │
└────────┬─────────┘
         │
    ┌────┴────┐
    │ User    │
    │ chooses │
    └────┬────┘
         │
    ┌────┼────┐
    ▼    ▼    ▼
 Yes   No   Dismiss
  │     │      │
  ▼     ▼      ▼
Load   Clear  Start
state  data   fresh
```

### Storage Strategy

| Data Type | Storage | Reason |
|-----------|---------|--------|
| Auto-save | IndexedDB | Larger capacity, structured |
| Preferences | LocalStorage | Small, simple key-value |
| Recent files | LocalStorage | Small list, quick access |

## Configuration Options

### Application Options

```typescript
interface ApplicationOptions {
  // Parser options
  parser: {
    indentType: 'spaces' | 'tabs' | 'auto';
    indentSize: number;           // 2 or 4 for spaces
    maxLineLength: number;        // Validation
  };

  // Layout options
  layout: {
    defaultDirection: LayoutDirection;
    nodeSpacing: number;          // Horizontal between nodes
    levelSpacing: number;         // Vertical between levels
  };

  // Rendering options
  rendering: {
    animationDuration: number;    // ms
    enableTransitions: boolean;
    lazyRenderThreshold: number;  // Nodes to trigger lazy rendering
  };

  // Auto-save options
  autoSave: {
    enabled: boolean;
    interval: number;             // ms (default: 30000)
    maxRecords: number;           // Keep last N auto-saves
  };

  // Export options
  export: {
    defaultFormat: ExportFormat;
    defaultBackground: 'transparent' | 'white';
    defaultScale: number;
  };
}

const defaultOptions: ApplicationOptions = {
  parser: {
    indentType: 'auto',
    indentSize: 2,
    maxLineLength: 10000,
  },
  layout: {
    defaultDirection: 'two-sided',
    nodeSpacing: 20,
    levelSpacing: 150,
  },
  rendering: {
    animationDuration: 300,
    enableTransitions: true,
    lazyRenderThreshold: 100,
  },
  autoSave: {
    enabled: true,
    interval: 30000,
    maxRecords: 5,
  },
  export: {
    defaultFormat: 'svg',
    defaultBackground: 'transparent',
    defaultScale: 2,
  },
};
```

## State Transitions

### Application State Machine

```
┌─────────────┐
│   INITIAL   │
└──────┬──────┘
       │ Load file / New
       ▼
┌─────────────┐     ┌─────────────┐
│   LOADED    │────▶│   EDITING   │
│  (clean)    │     │  (dirty)    │
└─────────────┘     └──────┬──────┘
       ▲                   │
       │     ┌─────────────┘
       │     │ Save
       │     ▼
       │  ┌─────────────┐
       └──│   LOADED   │
          │  (clean)    │
          └─────────────┘
```

### State Change Triggers

| Action | State Change | Side Effects |
|--------|-------------|--------------|
| Open file | → EDITING | Clear undo stack |
| Edit content | → EDITING | Mark dirty |
| Save | → LOADED | Clear dirty flag |
| Undo/Redo | → EDITING | May mark dirty |
| Change layout | → EDITING | Mark dirty |
| Toggle collapse | No flag | Layout recalculation |

## Event System

### Application Events

```typescript
type ApplicationEvent =
  | { type: 'file:loaded'; path: string }
  | { type: 'file:saved'; path: string }
  | { type: 'file:error'; error: FileSystemError }
  | { type: 'state:changed'; previous: ApplicationState; current: ApplicationState }
  | { type: 'layout:calculated'; positions: Map<string, Position> }
  | { type: 'render:complete'; nodeCount: number }
  | { type: 'search:results'; count: number }
  | { type: 'export:start'; format: ExportFormat }
  | { type: 'export:complete'; format: ExportFormat; size: number }
  | { type: 'export:error'; format: ExportFormat; error: ExportError }
  | { type: 'autosave:triggered' }
  | { type: 'autosave:complete' }
  | { type: 'error'; error: Error };

class EventEmitter {
  on<T extends ApplicationEvent>(
    event: T['type'],
    handler: (event: T) => void
  ): () => void;

  emit<T extends ApplicationEvent>(event: T): void;
}
```

## Browser Compatibility

### Supported Browsers

| Browser | Minimum Version | Notes |
|---------|----------------|-------|
| Chrome | 90 | Full support |
| Firefox | 88 | Full support |
| Safari | 14 | Full support |
| Edge | 90 | Full support |

### Feature Detection

```typescript
const featureSupport = {
  fileSystemAccess: 'showOpenFilePicker' in window,
  indexedDB: 'indexedDB' in window,
  webWorkers: 'Worker' in window,
  clipboard: 'ClipboardItem' in window,
};
```

### Fallback Strategies

| Feature | Primary | Fallback |
|---------|---------|----------|
| File open | File System Access API | `<input type="file">` |
| File save | File System Access API | Download attribute |
| Storage | IndexedDB | LocalStorage (limited) |

## Development Workflow

### Getting Started

```bash
# Clone and install
git clone <repo>
cd inklink
npm install

# Start development server
npm run dev

# Run tests
npm test

# Build for production
npm run build
```

### Code Style

- **TypeScript**: Strict mode enabled
- **Formatting**: Prettier with 2-space indent
- **Linting**: ESLint with TypeScript rules
- **Commits**: Conventional commits (feat:, fix:, docs:)

### Project Structure Evolution

As implementation progresses, the structure will evolve:

```
Phase 1: Core Foundation
src/
├── core/
│   ├── types/
│   ├── parser/
│   └── layout/

Phase 2: Web Platform
src/
├── core/           (from Phase 1)
├── platform/
│   └── web/
├── components/
└── app/

Phase 3: VS Code Extension (optional)
src/
├── core/           (shared)
├── platform/
│   ├── web/        (from Phase 2)
│   └── vscode/
└── vscode/
```

## API Reference Summary

### Core Modules

| Module | Exports | Purpose |
|--------|---------|---------|
| `core/parser` | `IndentationParser`, `ParseError`, `detectIndentation`, `validateIndentation`, `normalizeIndentation`, `calculateIndentLevel`, `IndentationError`, `IndentationType`, `IndentationResult`, `IndentationValidationResult` | Markdown → Tree |
| `core/layout` | `TwoSidedLayout`, `DirectionalLayouts` | Tree → Positions |
| `core/state` | `StateManager`, `CommandManager` | State & undo/redo |
| `core/transform` | `TransformManager` | Pan/zoom calculations |
| `core/search` | `SearchEngine` | Text search |
| `core/types` | All interfaces | TypeScript definitions |

### Platform Adapters

| Adapter | Interface | Web Implementation |
|---------|-----------|-------------------|
| Storage | `StorageAdapter` | IndexedDB + LocalStorage |
| FileSystem | `FileSystemAdapter` | File System Access API |
| Renderer | `RendererAdapter` | D3.js to SVG |

### UI Components

| Component | Purpose |
|-----------|---------|
| `Toolbar` | Action buttons, layout selector |
| `Canvas` | SVG rendering surface |
| `Minimap` | Overview navigation |
| `SearchPanel` | Search input and results |
| `StatusBar` | File info, zoom level |
| `Notification` | Toast messages |

---

*Last Updated: 2026-03-25*
*Part of: Markdown to Mind Map Generator Specification*