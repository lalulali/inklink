# D3.js Patterns in Markmap Reference Implementation

This document catalogs the D3.js v7 patterns observed in the Markmap reference implementation for SVG mind map rendering.

## 1. SVG Container Setup and Initialization

### Selection and Creation
```typescript
// Create D3 selection from existing SVG element
this.svg = (svg as ID3SVGElement).datum
  ? (svg as ID3SVGElement)
  : select(svg as string);

// Append a style element for CSS
this.styleNode = this.svg.append('style');

// Create main group for all content
this.g = this.svg.append('g');

// Create highlight group inside main group
this.g.append('g').attr('class', 'markmap-highlight');
```

### Key Patterns
- Use `d3.select()` to wrap existing DOM elements
- Append `<style>` element for dynamic CSS injection
- Use nested `<g>` elements for logical grouping (main content, highlight layer)
- Store selections as class properties for later use

## 2. Data Binding Patterns (Enter/Update/Exit)

Markmap uses the D3 join pattern extensively for efficient DOM updates:

### Node Rendering Pattern
```typescript
// Select all nodes with a specific selector
const mmG = this.g
  .selectAll<SVGGElement, INode>(childSelector<SVGGElement>(SELECTOR_NODE))
  .data(nodes, (d) => d.state.key);

// ENTER: Create new elements for new data
const mmGEnter = mmG
  .enter()
  .append('g')
  .attr('data-depth', (d) => d.state.depth)
  .attr('data-path', (d) => d.state.path);

// EXIT: Remove elements for removed data
const mmGExit = mmG.exit<INode>().each((d) => {
  setOriginNode(nodeMap[parentMap[d.state.id]]);
});

// MERGE: Update both new and existing elements
const mmGMerge = mmG
  .merge(mmGEnter)
  .attr('class', (d) =>
    ['markmap-node', d.payload?.fold && 'markmap-fold']
      .filter(Boolean)
      .join(' '),
  );
```

### Key Patterns
- Use `.data(data, keyFunction)` with a unique key for proper tracking
- Separate enter, update, and exit operations
- Use `.merge()` to handle both new and existing elements
- Use `.each()` for per-element computations
- Use data attributes (`data-depth`, `data-path`) for CSS targeting

## 3. Node Rendering Patterns

### Node Group Structure
Each node is rendered as a `<g>` element containing:
- `<line>` - Horizontal line below content
- `<circle>` - Connector circle for expandable nodes
- `<foreignObject>` - HTML content wrapper

```typescript
// Line element (decorative underline)
const mmLine = mmGMerge
  .selectAll<SVGLineElement, INode>(childSelector<SVGLineElement>('line'))
  .data((d) => [d], (d) => d.state.key);

// Circle element (expand/collapse indicator)
const mmCircle = mmGMerge
  .selectAll<SVGCircleElement, INode>(
    childSelector<SVGCircleElement>('circle')
  )
  .data(
    (d) => (d.children?.length ? [d] : []),  // Only show if has children
    (d) => d.state.key,
  );

// ForeignObject for HTML content
const mmFo = mmGMerge
  .selectAll<SVGForeignObjectElement, INode>(
    childSelector<SVGForeignObjectElement>('foreignObject')
  )
  .data((d) => [d], (d) => d.state.key);
```

### ForeignObject Pattern
```typescript
mmFoEnter
  .append('foreignObject')
  .attr('class', 'markmap-foreign')
  .attr('x', paddingX)
  .attr('y', 0)
  .style('opacity', 0)
  .on('mousedown', stopPropagation)
  .on('dblclick', stopPropagation);

// Nested divs for proper sizing
mmFoEnter
  .append<HTMLDivElement>('xhtml:div')  // Outer with maxWidth
  .append<HTMLDivElement>('xhtml:div')  // Inner with inline-block
  .html((d) => d.content)
  .attr('xmlns', 'http://www.w3.org/1999/xhtml');
```

## 4. Link/Edge Rendering Patterns

### Using d3.linkHorizontal
```typescript
import { linkHorizontal } from 'd3';

const linkShape = linkHorizontal();

// Create links data: flat array of source-target pairs
const links = nodes.flatMap((node) =>
  node.payload?.fold
    ? []
    : node.children.map((child) => ({ source: node, target: child })),
);

// Render paths
const mmPath = this.g
  .selectAll<SVGPathElement, { source: INode; target: INode }>(
    childSelector<SVGPathElement>(SELECTOR_LINK)
  )
  .data(links, (d) => d.target.state.key);

const mmPathEnter = mmPath
  .enter()
  .insert('path', 'g')  // Insert before nodes
  .attr('class', 'markmap-link')
  .attr('d', (d) => {
    const originRect = getOriginSourceRect(d.target);
    const pathOrigin: [number, number] = [
      originRect.x + originRect.width,
      originRect.y + originRect.height,
    ];
    return linkShape({ source: pathOrigin, target: pathOrigin });
  });

// Update path positions
this.transition(mmPathMerge)
  .attr('d', (d) => {
    const source: [number, number] = [
      d.source.state.rect.x + d.source.state.rect.width,
      d.source.state.rect.y + d.source.state.rect.height + lineWidth(d.source) / 2,
    ];
    const target: [number, number] = [
      d.target.state.rect.x,
      d.target.state.rect.y + d.target.state.rect.height + lineWidth(d.target) / 2,
    ];
    return linkShape({ source, target });
  });
```

### Key Patterns
- Use `d3.linkHorizontal()` for curved horizontal paths
- Flatten tree data into source-target pairs
- Insert paths before node groups (`insert('path', 'g')`) for proper layering
- Use transitions for smooth path animations

## 5. Pan/Zoom Integration with D3

### Zoom Behavior Setup
```typescript
import { zoom, zoomIdentity, zoomTransform } from 'd3';

this.zoom = zoom<SVGElement, INode>()
  .filter((event) => {
    if (this.options.scrollForPan) {
      // Pan with wheels, zoom with ctrl+wheels
      if (event.type === 'wheel') return event.ctrlKey && !event.button;
    }
    return (!event.ctrlKey || event.type === 'wheel') && !event.button;
  })
  .on('zoom', this.handleZoom);

// Apply zoom to SVG
if (this.options.zoom) {
  this.svg.call(this.zoom);
}

// Zoom handler
handleZoom = (e: any) => {
  const { transform } = e;
  this.g.attr('transform', transform);
};
```

### Pan with Wheel
```typescript
handlePan = (e: WheelEvent) => {
  e.preventDefault();
  const transform = zoomTransform(this.svg.node()!);
  const newTransform = transform.translate(
    -e.deltaX / transform.k,
    -e.deltaY / transform.k,
  );
  this.svg.call(this.zoom.transform, newTransform);
};
```

### Fit to View
```typescript
async fit(maxScale = this.options.maxInitialScale): Promise<void> {
  const svgNode = this.svg.node()!;
  const { width: offsetWidth, height: offsetHeight } =
    svgNode.getBoundingClientRect();
  const { fitRatio } = this.options;
  const { x1, y1, x2, y2 } = this.state.rect;
  const naturalWidth = x2 - x1;
  const naturalHeight = y2 - y1;
  
  const scale = Math.min(
    (offsetWidth / naturalWidth) * fitRatio,
    (offsetHeight / naturalHeight) * fitRatio,
    maxScale,
  );
  
  const initialZoom = zoomIdentity
    .translate(
      (offsetWidth - naturalWidth * scale) / 2 - x1 * scale,
      (offsetHeight - naturalHeight * scale) / 2 - y1 * scale,
    )
    .scale(scale);
    
  return this.transition(this.svg)
    .call(this.zoom.transform, initialZoom)
    .end()
    .catch(noop);
}
```

### Ensure Node Visible
```typescript
async ensureVisible(node: INode, padding?: Partial<IPadding>) {
  const itemData = this.findElement(node)?.data;
  if (!itemData) return;
  
  const svgNode = this.svg.node()!;
  const transform = zoomTransform(svgNode);
  
  // Calculate required translation to make node visible
  // ... (calculation logic)
  
  if (dx || dy) {
    const newTransform = transform.translate(dx, dy);
    return this.transition(this.svg)
      .call(this.zoom.transform, newTransform)
      .end()
      .catch(noop);
  }
}
```

## 6. Color Application to Branches

### Color Function Pattern
```typescript
import { scaleOrdinal, schemeCategory10 } from 'd3';

const defaultColorFn = scaleOrdinal(schemeCategory10);

// Default color function
color: (node: INode): string => defaultColorFn(`${node.state?.path || ''}`),

// Line width factory (depth-based)
const lineWidthFactory = (baseWidth = 1, deltaWidth: number = 3, k: number = 2) =>
  (node: INode) => baseWidth + deltaWidth / k ** node.state.depth;
```

### Applying Colors
```typescript
// Apply color to lines
mmLineMerge
  .attr('stroke', (d) => color(d))
  .attr('stroke-width', lineWidth);

// Apply color to circles
mmCircleMerge
  .attr('stroke', (d) => color(d))
  .attr('fill', (d) =>
    d.payload?.fold && d.children
      ? color(d)
      : 'var(--markmap-circle-open-bg)',
  );

// Apply color to paths
mmPathMerge
  .attr('stroke', (d) => color(d.target))
  .attr('stroke-width', (d) => lineWidth(d.target));
```

### Key Patterns
- Use ordinal scale with color schemes for automatic color distribution
- Use node path as color key for consistent branch coloring
- Use CSS custom properties for theming (`var(--markmap-circle-open-bg)`)
- Line width decreases with depth using exponential decay

## 7. Transition and Animation Patterns

### Transition Helper
```typescript
transition<T extends d3.BaseType, U, P extends d3.BaseType, Q>(
  sel: d3.Selection<T, U, P, Q>,
): d3.Transition<T, U, P, Q> {
  const { duration } = this.options;
  return sel.transition().duration(duration);
}
```

### Animation Sequence
```typescript
// 1. Animate highlight rect
this.transition(highlightNodes)
  .attr('x', (d) => d.x)
  .attr('y', (d) => d.y)
  .attr('width', (d) => d.width)
  .attr('height', (d) => d.height);

// 2. Animate entering nodes (from origin position)
mmGEnter.attr('transform', (d) => {
  const originRect = getOriginSourceRect(d);
  return `translate(${originRect.x + originRect.width - d.state.rect.width},${
    originRect.y + originRect.height - d.state.rect.height
  })`;
});

// 3. Animate exiting nodes (to target position)
this.transition(mmGExit)
  .attr('transform', (d) => {
    const targetRect = getOriginTargetRect(d);
    return `translate(${targetRect.x + targetRect.width - d.state.rect.width},${
      targetRect.y + targetRect.height - d.state.rect.height
    })`;
  })
  .remove();

// 4. Animate merged nodes to final position
this.transition(mmGMerge).attr(
  'transform',
  (d) => `translate(${d.state.rect.x},${d.state.rect.y})`,
);

// 5. Animate lines
this.transition(mmLineMerge)
  .attr('x1', -1)
  .attr('x2', (d) => d.state.rect.width + 2)
  .attr('stroke', (d) => color(d))
  .attr('stroke-width', lineWidth);

// 6. Animate circles
this.transition(mmCircleMerge).attr('r', 6).attr('stroke-width', '1.5');

// 7. Animate foreignObject
this.transition(mmFoMerge)
  .attr('width', (d) => Math.max(0, d.state.rect.width - paddingX * 2))
  .attr('height', (d) => d.state.rect.height)
  .style('opacity', 1);

// 8. Animate paths
this.transition(mmPathMerge)
  .attr('stroke', (d) => color(d.target))
  .attr('stroke-width', (d) => lineWidth(d.target))
  .attr('d', (d) => linkShape({ source, target }));
```

### Key Patterns
- Use consistent duration from options
- Chain transitions for sequential animations
- Use `requestAnimationFrame` before layout calculations
- Animate exit elements to target positions before removing
- Use `.end()` to wait for transition completion in async functions

## 8. Layout Algorithm (d3-flextree)

### Tree Layout Setup
```typescript
import { flextree } from 'd3-flextree';

private _relayout() {
  // First, measure all foreignObject elements
  this.g
    .selectAll<SVGGElement, INode>(childSelector<SVGGElement>(SELECTOR_NODE))
    .selectAll<SVGForeignObjectElement, INode>(
      childSelector<SVGForeignObjectElement>('foreignObject')
    )
    .each(function (d) {
      const el = this.firstChild?.firstChild as HTMLDivElement;
      const newSize: [number, number] = [el.scrollWidth, el.scrollHeight];
      d.state.size = newSize;
    });

  // Create layout
  const layout = flextree<INode>({})
    .children((d) => {
      if (!d.payload?.fold) return d.children;
    })
    .nodeSize((node) => {
      const [width, height] = node.data.state.size;
      return [height, width + (width ? paddingX * 2 : 0) + spacingHorizontal];
    })
    .spacing((a, b) => {
      return (
        (a.parent === b.parent ? spacingVertical : spacingVertical * 2) +
        lineWidth(a.data)
      );
    });

  // Apply layout
  const tree = layout.hierarchy(this.state.data);
  layout(tree);
  
  // Extract positions
  const fnodes = tree.descendants();
  fnodes.forEach((fnode) => {
    const node = fnode.data;
    node.state.rect = {
      x: fnode.y,
      y: fnode.x - fnode.xSize / 2,
      width: fnode.ySize - spacingHorizontal,
      height: fnode.xSize,
    };
  });

  // Calculate bounding box
  this.state.rect = {
    x1: min(fnodes, (fnode) => fnode.data.state.rect.x) || 0,
    y1: min(fnodes, (fnode) => fnode.data.state.rect.y) || 0,
    x2: max(fnodes, (fnode) => fnode.data.state.rect.x + fnode.data.state.rect.width) || 0,
    y2: max(fnodes, (fnode) => fnode.data.state.rect.y + fnode.data.state.rect.height) || 0,
  };
}
```

## 9. SVG Structure Summary

```
<svg class="markmap">
  <style>{globalCSS + customCSS}</style>
  <g transform="{zoomTransform}">
    <g class="markmap-highlight">
      <rect />  <!-- Highlight rectangle -->
    </g>
    {links.map((link) => (
      <path
        class="markmap-link"
        d={linkShape(link)}
        stroke={color}
        stroke-width={lineWidth}
        data-depth={depth}
        data-path={path}
      />
    ))}
    {nodes.map((node) => (
      <g
        class="markmap-node"
        transform="translate(x, y)"
        data-depth={depth}
        data-path={path}>
        <line
          x1={-1}
          x2={width + 2}
          y1={height + lineWidth/2}
          y2={height + lineWidth/2}
          stroke={color}
          stroke-width={lineWidth}
        />
        <circle
          cx={width}
          cy={height + lineWidth/2}
          r={6}
          stroke={color}
          fill={isFolded ? color : 'transparent'}
        />
        <foreignObject
          class="markmap-foreign"
          x={paddingX}
          y={0}
          width={width - paddingX*2}
          height={height}>
          <div xmlns="http://www.w3.org/1999/xhtml">
            <div>{content}</div>
          </div>
        </foreignObject>
      </g>
    ))}
  </g>
</svg>
```

## 10. Key Implementation Notes

1. **Unique Keys**: Always provide a key function to `.data()` for proper element tracking
2. **Layering**: Links are inserted before nodes for correct visual layering
3. **ForeignObject**: Requires nested divs and explicit xmlns for HTML content
4. **ResizeObserver**: Used to detect content size changes in foreignObject
5. **State Management**: Node state (rect, size, depth) is computed and stored on the data objects
6. **Transitions**: Use consistent duration and chain operations for smooth animations
7. **Zoom Transform**: Applied to the main group `<g>`, not the SVG itself
8. **Color Consistency**: Same path-based color function ensures consistent branch colors

## References

- [D3.js v7 Documentation](https://d3js.org/d3)
- [d3-flextree](https://github.com/kpym/d3-flextree)
- [Markmap ADR: Structure of SVG](./adr/structure-of-svg.md)