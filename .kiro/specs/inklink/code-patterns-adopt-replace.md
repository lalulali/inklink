# Code Patterns to Adopt vs Replace

This document identifies which patterns to adopt from the Markmap reference implementation and which to replace with custom implementations.

## Summary

| Category | Adopt from Markmap | Replace with Custom |
|----------|-------------------|---------------------|
| Parser | - | ✓ Custom indentation-based |
| Layout Engine | Concepts only | ✓ Custom two-sided & directional |
| D3.js Rendering | ✓ Full adoption | - |
| State Management | - | ✓ Command pattern |
| Color Application | ✓ Full adoption | - |
| Pan/Zoom | ✓ Full adoption | - |
| File Operations | - | ✓ Platform adapters |
| Search | - | ✓ Custom implementation |
| Keyboard Shortcuts | - | ✓ Custom implementation |
| Auto-Save | - | ✓ Custom implementation |

## Patterns to Adopt

### 1. D3.js Data Binding (Enter/Update/Exit)

**Adopt**: Full adoption with minor customizations

Markmap's D3 data binding pattern is well-suited for our needs:

```typescript
// ADOPTED - From markmap-view/src/view.ts
const mmG = this.g
  .selectAll<SVGGElement, INode>(childSelector<SVGGElement>(SELECTOR_NODE))
  .data(nodes, (d) => d.state.key);

const mmGEnter = mmG.enter().append('g')...
const mmGExit = mmG.exit()...
const mmGMerge = mmG.merge(mmGEnter)...
```

**Customization**: Use our TreeNode interface instead of Markmap's INode

### 2. SVG Container Structure

**Adopt**: Full adoption

```typescript
// ADOPTED - From markmap-view
this.svg = select(svg);
this.styleNode = this.svg.append('style');
this.g = this.svg.append('g');
this.g.append('g').attr('class', 'markmap-highlight');
```

**Customization**: Add additional groups for our features (minimap indicator, search highlights)

### 3. Link/Edge Rendering with d3.linkHorizontal

**Adopt**: Full adoption

```typescript
// ADOPTED - From markmap-view
import { linkHorizontal } from 'd3';
const linkShape = linkHorizontal();
// Use for curved horizontal connections between nodes
```

### 4. D3 Zoom Behavior

**Adopt**: Full adoption

```typescript
// ADOPTED - From markmap-view
import { zoom, zoomIdentity, zoomTransform } from 'd3';

this.zoom = zoom<SVGElement, unknown>()
  .scaleExtent([0.1, 4.0])
  .on('zoom', this.handleZoom);

d3.select(this.svg).call(this.zoom);
```

**Customization**: Add our edge detection and visual feedback

### 5. Color Application Patterns

**Adopt**: Full adoption with custom palette

```typescript
// ADOPTED - From markmap-view with custom palette
import { scaleOrdinal } from 'd3';

// Custom palette (more visually harmonious than schemeCategory10)
const colorPalette = [
  '#4e79a7', '#f28e2b', '#e15759', '#76b7b2', '#59a14f',
  '#edc948', '#b07aa1', '#ff9da7', '#9c755f', '#bab0ac'
];

const colorFn = scaleOrdinal(colorPalette);
derivedOptions.color = (node) => colorFn(node.state.path);
```

**Customization**: 
- Use custom palette for visual harmony
- Add WCAG AA contrast checking
- Support color freeze level

### 6. ForeignObject for Node Content

**Adopt**: Full adoption

```typescript
// ADOPTED - From markmap-view
mmFoEnter
  .append('foreignObject')
  .attr('x', paddingX)
  .attr('y', 0)
  .append<HTMLDivElement>('xhtml:div')
  .append<HTMLDivElement>('xhtml:div')
  .html((d) => d.content)
  .attr('xmlns', 'http://www.w3.org/1999/xhtml');
```

### 7. Transition Patterns

**Adopt**: Full adoption

```typescript
// ADOPTED - From markmap-view
transition<T>(sel: d3.Selection<T>): d3.Transition<T> {
  return sel.transition().duration(this.options.duration);
}

// Usage
this.transition(mmGMerge)
  .attr('transform', (d) => `translate(${d.state.rect.x},${d.state.rect.y})`);
```

### 8. Tree Data Structure Concepts

**Adopt**: Core concepts, replace implementation

```typescript
// ADOPT CONCEPTS - From Markmap tree structure
interface TreeNode {
  id: string;
  content: string;
  depth: number;
  children: TreeNode[];
  parent: TreeNode | null;
  collapsed: boolean;
  color: string;
  metadata: NodeMetadata;
}

// REPLACE: Our implementation adds:
// - Explicit parent reference (Markmap doesn't have this)
// - Immutable update methods (for undo/redo)
// - Separate metadata interface
// - Stored color (Markmap computes via function)
```

## Patterns to Replace

### 1. Parser (Complete Replacement)

**Markmap**: Uses markdown-it with plugins
**Our Implementation**: Custom indentation-based parser

```typescript
// REPLACE - Custom implementation
class IndentationParser implements MarkdownParser {
  parse(markdown: string): TreeNode {
    // Stack-based tree construction from indentation
    // Support both spaces and tabs
    // Validate indentation consistency
  }
  
  serialize(root: TreeNode): string {
    // Convert tree back to markdown with proper indentation
  }
}
```

**Rationale**: 
- Direct control over parsing logic
- Simpler for indentation-based markdown
- No markdown-it dependency
- Predictable behavior for our use case

### 2. Layout Engine (Complete Replacement)

**Markmap**: Uses d3-flextree (single layout)
**Our Implementation**: 5 custom layout algorithms

```typescript
// REPLACE - Custom implementations
interface LayoutAlgorithm {
  calculateLayout(root: TreeNode, viewport: Viewport): Map<string, Position>;
  getBounds(root: TreeNode): BoundingBox;
}

class TwoSidedLayout implements LayoutAlgorithm { /* balanced left/right */ }
class LeftToRightLayout implements LayoutAlgorithm { /* all right */ }
class RightToLeftLayout implements LayoutAlgorithm { /* all left */ }
class TopToBottomLayout implements LayoutAlgorithm { /* all down */ }
class BottomToTopLayout implements LayoutAlgorithm { /* all up */ }
```

**Rationale**:
- Multiple layout directions (Markmap has only one)
- Balanced distribution for two-sided layout
- Custom spacing and collision detection
- No d3-flextree dependency

### 3. State Management (New Addition)

**Markmap**: Minimal state, no undo/redo
**Our Implementation**: Command pattern with full undo/redo

```typescript
// REPLACE - New implementation (not in Markmap)
interface Command {
  execute(state: ApplicationState): ApplicationState;
  undo(state: ApplicationState): ApplicationState;
  description: string;
}

class CommandManager {
  private undoStack: Command[] = [];
  private redoStack: Command[] = [];
  private readonly MAX_STACK = 50;
  
  execute(command: Command): void { /* ... */ }
  undo(): Command | undefined { /* ... */ }
  redo(): Command | undefined { /* ... */ }
}
```

**Rationale**:
- Professional UX with state history
- Required by Requirements 6 and 12
- Enables undo for all state changes

### 4. File Operations (New Addition)

**Markmap**: Browser-only, no persistence
**Our Implementation**: Platform adapters

```typescript
// REPLACE - New implementation (not in Markmap)
interface FileSystemAdapter {
  openFile(): Promise<{ content: string; path: string; handle?: any }>;
  saveFile(content: string, path?: string, handle?: any): Promise<void>;
  getRecentFiles(): Promise<string[]>;
  addRecentFile(path: string): Promise<void>;
}

interface StorageAdapter {
  saveAutoSave(record: AutoSaveRecord): Promise<void>;
  loadAutoSave(): Promise<AutoSaveRecord | null>;
  clearAutoSave(): Promise<void>;
}
```

**Rationale**:
- Required by Requirements 8, 14, 15
- File System Access API with fallbacks
- IndexedDB for auto-save
- Platform abstraction for VS Code extension

### 5. Search Functionality (New Addition)

**Markmap**: No search
**Our Implementation**: Full-text search

```typescript
// REPLACE - New implementation (not in Markmap)
class SearchEngine {
  searchNodes(tree: TreeNode, query: string, caseSensitive: boolean): TreeNode[];
  highlightMatches(results: TreeNode[]): void;
  navigateToResult(index: number): void;
  expandAncestors(node: TreeNode): void;
}
```

**Rationale**:
- Required by Requirement 13
- Essential for large mind maps
- Case-sensitive/insensitive options
- Result navigation and highlighting

### 6. Keyboard Shortcuts (New Addition)

**Markmap**: Basic interactions only
**Our Implementation**: Comprehensive shortcuts

```typescript
// REPLACE - New implementation (not in Markmap)
class KeyboardHandler {
  private shortcuts: Map<string, () => void> = new Map([
    ['KeyS', () => this.save()],           // Ctrl/Cmd+S
    ['KeyO', () => this.open()],           // Ctrl/Cmd+O
    ['KeyZ', () => this.undo()],           // Ctrl/Cmd+Z
    ['KeyF', () => this.fitToScreen()],    // F key
    // ... 20+ more shortcuts
  ]);
}
```

**Rationale**:
- Required by Requirement 11
- Power user productivity
- Platform-specific modifiers (Ctrl vs Cmd)

### 7. Auto-Save and Recovery (New Addition)

**Markmap**: No auto-save
**Our Implementation**: Periodic auto-save with recovery

```typescript
// REPLACE - New implementation (not in Markmap)
class AutoSaveManager {
  private interval: number = 30000; // 30 seconds
  private timer: NodeJS.Timeout | null = null;
  
  start(): void { /* schedule periodic saves */ }
  stop(): void { /* cancel timer */ }
  async recover(): Promise<AutoSaveRecord | null> { /* ... */ }
}
```

**Rationale**:
- Required by Requirement 14
- Prevent data loss
- Crash recovery capability

### 8. Minimap (New Addition)

**Markmap**: No minimap
**Our Implementation**: Thumbnail overview

```typescript
// REPLACE - New implementation (not in Markmap)
class MinimapRenderer {
  render(thumbnail: TreeNode): void;
  updateViewportIndicator(rect: BoundingBox): void;
  handleClick(position: { x: number; y: number }): void;
}
```

**Rationale**:
- Required by Requirement 7
- Navigate large mind maps
- Show current viewport location

## Integration Strategy

### What We Keep from Markmap

1. **D3.js integration patterns** - Selection, data binding, transitions
2. **SVG rendering approach** - Container structure, element hierarchy
3. **Zoom behavior** - D3 zoom with custom filters
4. **Color application** - Path-based coloring with ordinal scales
5. **Link rendering** - Curved paths with d3.linkHorizontal
6. **ForeignObject** - HTML content in SVG nodes

### What We Replace

1. **Parser** - Custom indentation-based implementation
2. **Layout** - Five custom layout algorithms
3. **State** - Command pattern for undo/redo
4. **Files** - Platform adapters for web/VS Code
5. **Search** - Full-text search with navigation
6. **Shortcuts** - Comprehensive keyboard handling
7. **Auto-save** - IndexedDB-based persistence
8. **Minimap** - Thumbnail with viewport indicator

### Not Using Markmap As

- ❌ npm dependency
- ❌ Direct code copy
- ❌ Forked repository

### Using Markmap As

- ✓ Reference implementation
- ✓ Pattern source
- ✓ Learning resource
- ✓ Inspiration for D3.js patterns

## Attribution

This project uses Markmap (https://github.com/markmap/markmap) as a reference implementation for D3.js patterns. The parser, layout engine, state management, and other core features are custom implementations designed to meet our specific requirements. Markmap is used for learning purposes only, not as a dependency.

## Files to Reference

From Markmap repository:
- `markmap-view/src/view.ts` - D3 rendering patterns
- `markmap-view/src/util.ts` - Color derivation
- `markmap-view/src/constants.ts` - Default options
- `markmap-lib/src/index.ts` - Tree structure concepts
- `markmap-common/src/types/` - Type definitions (for reference)

Our custom files:
- `src/core/parser/` - Custom indentation parser
- `src/core/layout/` - Custom layout algorithms
- `src/core/state/` - Command pattern implementation
- `src/platform/web/` - Web platform adapters
- `src/components/` - UI components