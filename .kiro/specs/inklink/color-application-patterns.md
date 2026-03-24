# Color Application to Branches - Markmap Patterns

This document describes the patterns used in Markmap for applying colors to mind map branches, learned from studying the reference implementation.

## Overview

Markmap uses D3.js color scales to assign colors to branches. The color is determined by the node's "path" - a dot-separated string representing the hierarchical position from the root.

## Key Patterns

### 1. Color Function Signature

```typescript
// Color function type from markmap-view/src/types.ts
color: (node: INode) => string;
```

The color function receives a node and returns an SVG color string.

### 2. Default Color Scale

Markmap uses D3's `scaleOrdinal` with `schemeCategory10` as the default color palette:

```typescript
// From markmap-view/src/constants.ts
import { scaleOrdinal, schemeCategory10 } from 'd3';

export const defaultColorFn = scaleOrdinal(schemeCategory10);
```

### 3. Path-Based Color Assignment

Colors are assigned based on the node's path (breadcrumb from root):

```typescript
// From markmap-view/src/util.ts
const colorFn = scaleOrdinal(color);
derivedOptions.color = (node: INode) => colorFn(`${node.state.path}`);
```

The path is a dot-separated string like `"root.child1.child2"` - this ensures all nodes in the same branch get the same color.

### 4. Color Freeze Level

Markmap supports a `colorFreezeLevel` option that prevents colors from changing beyond a certain depth:

```typescript
// From markmap-view/src/util.ts
if (colorFreezeLevel) {
  const color = derivedOptions.color || defaultOptions.color;
  derivedOptions.color = (node: INode) => {
    node = {
      ...node,
      state: {
        ...node.state,
        // Truncate path to first N segments
        path: node.state.path.split('.').slice(0, colorFreezeLevel).join('.'),
      },
    };
    return color(node);
  };
}
```

This is useful for ensuring visual consistency in deeply nested trees.

### 5. Single Color Option

When only one color is provided, all branches use that color:

```typescript
// From markmap-view/src/util.ts
if (color?.length === 1) {
  const solidColor = color[0];
  derivedOptions.color = () => solidColor;
}
```

### 6. SVG Element Color Application

Colors are applied to multiple SVG elements:

```typescript
// From markmap-view/src/view.ts

// Link lines (stroke)
.mm-line
  .attr('stroke', (d) => color(d))
  .attr('stroke-width', lineWidth);

// Node circles (stroke and fill)
.mm-circle
  .attr('stroke', (d) => color(d))
  .attr('fill', (d) => d.payload?.fold && d.children ? color(d) : 'transparent');

// Connection paths (stroke)
.mm-path
  .attr('stroke', (d) => color(d.target))
  .attr('stroke-width', (d) => lineWidth(d.target));
```

## Implementation Recommendations

### For Our Custom Implementation

1. **Use D3 scaleOrdinal with custom palette** - Define a visually harmonious palette (not just schemeCategory10)

2. **Path-based coloring** - Use the node's full path from root to ensure branch consistency

3. **Apply colors to multiple elements**:
   - Node rectangles/circles (fill or stroke)
   - Connection lines/paths (stroke)
   - Optional: text color for contrast

4. **Support color freeze level** - Allow users to freeze colors at a certain depth

5. **Support single color mode** - Allow monochromatic mind maps

6. **Consider WCAG contrast** - Ensure text is readable against branch colors

### Suggested Custom Palette

Instead of schemeCategory10, consider a more visually harmonious palette:

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

## Files Referenced

- `markmap-reference/packages/markmap-view/src/constants.ts` - Default color function
- `markmap-reference/packages/markmap-view/src/util.ts` - Color derivation logic
- `markmap-reference/packages/markmap-view/src/types.ts` - Type definitions
- `markmap-reference/packages/markmap-view/src/view.ts` - Color application in rendering