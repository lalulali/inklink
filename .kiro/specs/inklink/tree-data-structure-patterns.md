# Tree Data Structure Patterns

This document catalogs the tree data structure patterns used in the Markdown to Mind Map Generator, including interfaces, construction algorithms, and traversal methods.

## 1. Core TreeNode Interface

The fundamental data structure representing a single node in the mind map hierarchy.

```typescript
/**
 * Represents a single node in the mind map tree structure
 * Corresponds to one line in the markdown document
 */
interface TreeNode {
  id: string;                    // Unique identifier (UUID or path-based)
  content: string;               // Text content from markdown line
  depth: number;                 // Indentation level (0 = root)
  children: TreeNode[];          // Child nodes array
  parent: TreeNode | null;       // Parent node reference
  collapsed: boolean;            // Visibility state of children
  color: string;                 // Branch color (inherited from root child)
  metadata: NodeMetadata;        // Additional rendering information
}
```

### Key Properties

| Property | Type | Description |
|----------|------|-------------|
| `id` | `string` | Unique identifier for DOM keying and state tracking |
| `content` | `string` | The actual text content displayed in the node |
| `depth` | `number` | Indentation level (0 = root, 1 = first level, etc.) |
| `children` | `TreeNode[]` | Ordered array of child nodes |
| `parent` | `TreeNode \| null` | Reference to parent (null for root) |
| `collapsed` | `boolean` | Whether children are hidden |
| `color` | `string` | Hex color code for branch styling |
| `metadata` | `NodeMetadata` | Rendering and layout data |

## 2. NodeMetadata Interface

Additional metadata used for rendering and layout calculations.

```typescript
/**
 * Additional metadata for rendering and interaction
 */
interface NodeMetadata {
  x: number;                     // Calculated x position
  y: number;                     // Calculated y position
  width: number;                 // Rendered width (measured from DOM)
  height: number;                // Rendered height (measured from DOM)
  visible: boolean;              // Whether node is in viewport
  highlighted: boolean;          // Search highlight state
}
```

### Metadata Usage

- **x, y**: Set by layout engine after position calculation
- **width, height**: Measured from rendered DOM elements (foreignObject)
- **visible**: Used by lazy rendering to skip off-screen nodes
- **highlighted**: Toggled by search functionality

## 3. Tree Construction Patterns

### Stack-Based Construction Algorithm

The parser uses a stack-based approach to build the tree from indented markdown:

```typescript
class IndentationParser implements MarkdownParser {
  /**
   * Build tree from markdown lines using indentation levels
   * 
   * Algorithm:
   * 1. Process each line, detecting indentation
   * 2. Use stack to track current parent at each depth
   * 3. Pop stack when indentation decreases
   * 4. Push to stack when indentation increases
   */
  private buildTree(lines: string[], indentType: 'spaces' | 'tabs'): TreeNode {
    const root: TreeNode = {
      id: 'root',
      content: 'Root',
      depth: -1,
      children: [],
      parent: null,
      collapsed: false,
      color: '#000000',
      metadata: { x: 0, y: 0, width: 0, height: 0, visible: true, highlighted: false }
    };

    const stack: TreeNode[] = [root];

    for (const line of lines) {
      const trimmedLine = line.trim();
      if (!trimmedLine) continue;

      // Calculate indentation level
      const indentLevel = this.getIndentLevel(line, indentType);
      
      // Create new node
      const node: TreeNode = {
        id: this.generateId(),
        content: trimmedLine,
        depth: indentLevel,
        children: [],
        parent: null,
        collapsed: false,
        color: '',
        metadata: { x: 0, y: 0, width: 0, height: 0, visible: true, highlighted: false }
      };

      // Find correct parent by popping stack
      while (stack.length > 1 && stack[stack.length - 1].depth >= indentLevel) {
        stack.pop();
      }

      // Add to parent
      const parent = stack[stack.length - 1];
      node.parent = parent;
      node.color = this.deriveColor(parent, node);
      parent.children.push(node);

      // Push to stack for potential children
      stack.push(node);
    }

    return root;
  }

  private getIndentLevel(line: string, indentType: 'spaces' | 'tabs'): number {
    if (indentType === 'tabs') {
      // Count tabs
      const match = line.match(/^\t+/);
      return match ? match[0].length : 0;
    } else {
      // Count spaces (normalize to 2 or 4 spaces)
      const match = line.match(/^(  +)/);
      if (!match) return 0;
      return Math.floor(match[1].length / 2); // Normalize to 2-space units
    }
  }
}
```

### Color Derivation Pattern

Colors are derived from root-level children and inherited by descendants:

```typescript
private deriveColor(parent: TreeNode, node: TreeNode): string {
  // Root children get random colors
  if (parent.depth === -1) {
    return this.generateRandomColor();
  }
  
  // Descendants inherit parent's color
  return parent.color;
}
```

## 4. Tree Traversal Patterns

### Depth-First Traversal

```typescript
/**
 * Depth-first traversal with pre-order processing
 */
function traverseDF<T>(node: TreeNode, callback: (node: TreeNode) => T): T[] {
  const results: T[] = [];
  
  function visit(n: TreeNode): void {
    results.push(callback(n));
    for (const child of n.children) {
      visit(child);
    }
  }
  
  visit(node);
  return results;
}

/**
 * Get all descendants as flat array
 */
function getDescendants(node: TreeNode): TreeNode[] {
  const descendants: TreeNode[] = [];
  
  function collect(n: TreeNode): void {
    descendants.push(...n.children);
    n.children.forEach(collect);
  }
  
  collect(node);
  return descendants;
}

/**
 * Get path from root to specific node
 */
function getPathToNode(node: TreeNode): TreeNode[] {
  const path: TreeNode[] = [];
  let current: TreeNode | null = node;
  
  while (current) {
    path.unshift(current);
    current = current.parent;
  }
  
  return path;
}
```

### Breadth-First Traversal

```typescript
/**
 * Level-order traversal (useful for layout)
 */
function traverseBF(node: TreeNode, callback: (node: TreeNode, depth: number) => void): void {
  const queue: { node: TreeNode; depth: number }[] = [{ node, depth: 0 }];
  
  while (queue.length > 0) {
    const { node: current, depth } = queue.shift()!;
    callback(current, depth);
    
    for (const child of current.children) {
      queue.push({ node: child, depth: depth + 1 });
    }
  }
}
```

### Filter and Search Patterns

```typescript
/**
 * Find node by ID
 */
function findById(root: TreeNode, id: string): TreeNode | null {
  if (root.id === id) return root;
  
  for (const child of root.children) {
    const found = findById(child, id);
    if (found) return found;
  }
  
  return null;
}

/**
 * Find all nodes matching predicate
 */
function filterNodes(root: TreeNode, predicate: (node: TreeNode) => boolean): TreeNode[] {
  const results: TreeNode[] = [];
  
  function visit(node: TreeNode): void {
    if (predicate(node)) {
      results.push(node);
    }
    node.children.forEach(visit);
  }
  
  visit(root);
  return results;
}

/**
 * Count total nodes in tree
 */
function countNodes(root: TreeNode): number {
  let count = 1; // Include root
  for (const child of root.children) {
    count += countNodes(child);
  }
  return count;
}
```

## 5. Tree Mutation Patterns

### Immutable Update Pattern

All state changes create new tree instances:

```typescript
/**
 * Toggle collapsed state (returns new tree)
 */
function toggleCollapsed(root: TreeNode, nodeId: string): TreeNode {
  // Deep clone the tree
  const newRoot = cloneTree(root);
  
  // Find and toggle the node
  const node = findById(newRoot, nodeId);
  if (node) {
    node.collapsed = !node.collapsed;
  }
  
  return newRoot;
}

/**
 * Deep clone tree structure
 */
function cloneTree(node: TreeNode): TreeNode {
  return {
    ...node,
    children: node.children.map(cloneTree),
    parent: null // Will be fixed after clone
  };
}

/**
 * Add child to node
 */
function addChild(root: TreeNode, parentId: string, newContent: string): TreeNode {
  const newRoot = cloneTree(root);
  const parent = findById(newRoot, parentId);
  
  if (parent) {
    const child: TreeNode = {
      id: generateId(),
      content: newContent,
      depth: parent.depth + 1,
      children: [],
      parent,
      collapsed: false,
      color: parent.color,
      metadata: { x: 0, y: 0, width: 0, height: 0, visible: true, highlighted: false }
    };
    parent.children.push(child);
  }
  
  return newRoot;
}
```

## 6. Serialization Patterns

### Tree to JSON

```typescript
/**
 * Serialize tree to JSON (for auto-save)
 */
interface SerializedNode {
  id: string;
  content: string;
  depth: number;
  collapsed: boolean;
  color: string;
  children: SerializedNode[];
}

function serializeTree(node: TreeNode): SerializedNode {
  return {
    id: node.id,
    content: node.content,
    depth: node.depth,
    collapsed: node.collapsed,
    color: node.color,
    children: node.children.map(serializeTree)
  };
}

/**
 * Deserialize JSON back to tree
 */
function deserializeTree(data: SerializedNode, parent: TreeNode | null = null): TreeNode {
  const node: TreeNode = {
    id: data.id,
    content: data.content,
    depth: data.depth,
    collapsed: data.collapsed,
    color: data.color,
    children: [],
    parent,
    metadata: { x: 0, y: 0, width: 0, height: 0, visible: true, highlighted: false }
  };
  
  node.children = data.children.map(child => deserializeTree(child, node));
  
  return node;
}
```

### Tree to Markdown

```typescript
/**
 * Convert tree back to markdown (round-trip)
 */
function serializeToMarkdown(root: TreeNode): string {
  const lines: string[] = [];
  
  function visit(node: TreeNode): void {
    // Skip root in output
    for (const child of node.children) {
      const indent = '  '.repeat(child.depth);
      lines.push(`${indent}${child.content}`);
      visit(child);
    }
  }
  
  visit(root);
  return lines.join('\n');
}
```

## 7. Comparison with Markmap Reference

The Markmap reference implementation uses a similar but simplified tree structure:

```typescript
// Markmap's internal node structure (simplified)
interface MarkmapNode {
  content: string;
  depth: number;
  children: MarkmapNode[];
  state: {
    key: string;
    path: string;
    rect: { x: number; y: number; width: number; height: number };
    size: [number, number];
    fold: boolean;
  };
  payload?: {
    fold: boolean;
  };
}
```

### Key Differences

| Aspect | Our Implementation | Markmap |
|--------|-------------------|---------|
| ID generation | Explicit `id` field | Derived from path |
| Parent reference | Explicit `parent` | Not stored |
| Metadata | Separate `NodeMetadata` | Embedded in `state` |
| Color | Stored on node | Computed via color function |
| Immutability | Immutable updates | Mutable state |

### Why We Use Different Patterns

1. **Explicit parent reference**: Enables efficient path calculation and ancestor expansion
2. **Immutable updates**: Required for undo/redo command pattern
3. **Separate metadata**: Clean separation between data and rendering state
4. **Stored color**: Enables consistent branch coloring without recomputation

## 8. Tree Statistics and Validation

```typescript
interface TreeStats {
  totalNodes: number;
  maxDepth: number;
  leafCount: number;
  branchCount: number;
  averageChildrenPerNode: number;
}

function calculateTreeStats(root: TreeNode): TreeStats {
  let totalNodes = 0;
  let maxDepth = 0;
  let leafCount = 0;
  let branchCount = 0;
  
  function visit(node: TreeNode): void {
    totalNodes++;
    maxDepth = Math.max(maxDepth, node.depth);
    
    if (node.children.length === 0) {
      leafCount++;
    } else {
      branchCount++;
    }
    
    node.children.forEach(visit);
  }
  
  visit(root);
  
  return {
    totalNodes,
    maxDepth,
    leafCount,
    branchCount,
    averageChildrenPerNode: branchCount > 0 ? totalNodes / branchCount : 0
  };
}

/**
 * Validate tree structure integrity
 */
function validateTree(root: TreeNode): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  function visit(node: TreeNode): void {
    // Check parent reference
    if (node.parent && !node.parent.children.includes(node)) {
      errors.push(`Node ${node.id}: parent reference mismatch`);
    }
    
    // Check depth consistency
    if (node.parent && node.depth !== node.parent.depth + 1) {
      errors.push(`Node ${node.id}: invalid depth ${node.depth} (parent depth: ${node.parent.depth})`);
    }
    
    // Check color inheritance
    if (node.depth > 0 && node.color !== node.parent?.color) {
      errors.push(`Node ${node.id}: color should match parent`);
    }
    
    node.children.forEach(visit);
  }
  
  visit(root);
  
  return { valid: errors.length === 0, errors };
}
```

## 9. Performance Considerations

### Lazy Tree Construction

For very large documents, consider lazy construction:

```typescript
/**
 * Lazy tree node - children loaded on demand
 */
interface LazyTreeNode {
  id: string;
  content: string;
  depth: number;
  children: LazyTreeNode[] | (() => LazyTreeNode[]);
  parent: LazyTreeNode | null;
  collapsed: boolean;
  color: string;
  metadata: NodeMetadata;
  _loaded: boolean;
}

function getChildren(node: LazyTreeNode): TreeNode[] {
  if (typeof node.children === 'function' && !node._loaded) {
    node.children = node.children();
    node._loaded = true;
  }
  return node.children as TreeNode[];
}
```

### Node Caching

For frequently accessed nodes:

```typescript
class TreeIndex {
  private byId: Map<string, TreeNode> = new Map();
  private byPath: Map<string, TreeNode> = new Map();
  
  constructor(root: TreeNode) {
    this.buildIndex(root, '');
  }
  
  private buildIndex(node: TreeNode, path: string): void {
    const nodePath = path ? `${path}/${node.content}` : node.content;
    this.byId.set(node.id, node);
    this.byPath.set(nodePath, node);
    
    node.children.forEach(child => this.buildIndex(child, nodePath));
  }
  
  findById(id: string): TreeNode | undefined {
    return this.byId.get(id);
  }
}
```

## 10. Summary

The tree data structure is central to the mind map generator:

- **TreeNode**: Core interface with id, content, depth, children, parent, color, and metadata
- **Construction**: Stack-based algorithm for efficient parsing from indented markdown
- **Traversal**: Depth-first and breadth-first patterns for various operations
- **Mutation**: Immutable update pattern for undo/redo support
- **Serialization**: JSON for persistence, markdown for round-trip
- **Validation**: Integrity checking and statistics calculation

This design enables:
- Efficient tree operations (O(n) traversal)
- Undo/redo via immutable updates
- Lazy rendering via visible flag
- Search via filter patterns
- Color consistency via inheritance