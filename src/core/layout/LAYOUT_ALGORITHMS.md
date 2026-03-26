# Mind Map Layout Algorithms Documentation

Inklink implements five distinct layout algorithms to help users visualize their markdown-based hierarchies. Each algorithm shares a high-performance, O(n) recursive positioning engine.

## 1. Shared Foundation

All algorithms leverage the **`BaseLayout`** abstract class, which provides:
- **Leaf-Node Proportional Centering**: Each branch is allocated vertical space based on the number of leaf nodes in its subtree, ensuring that subtrees never overlap and primary branches are visually centered regardless of their depth or complexity.
- **Memoization**: Subtree sizes and dimensions are cached during each layout pass, preventing redundant traversals.
- **Bounding Box Calculation**: Supports the "Fit to Screen" and minimap rendering by computing exact global extents.
- **Collision Detection Support**: While our proportional centering logic natively avoids most overlaps, the system includes a collision detection utility to resolve conflicts in edge cases where branch widths might exceed default spacing.

---

## 2. Horizontal Layouts

These layouts grow primarily along the X-axis and are ideal for standard tree-like mind maps.

### Two-Sided Balanced (Default)
- **Goal**: Minimize total height and create a balanced "balanced" appearance.
- **Method**: The root's children are partitioned into "Left" and "Right" groups using a **Greedy Optimization Strategy**. This minimizes the difference in node counts between the two sides.
- **Growth**: Branches grow outwards from the center in both directions.

### Left-to-Right
- **Goal**: Create a classic "outlining" experience, useful for timelines or hierarchical lists.
- **Growth**: Every branch grows strictly to the right. The root is placed on the horizontal left of its descendants.

### Right-to-Left
- **Goal**: Reverses the standard L-R layout, often used in locales with RTL script orientations or for specific brainstorm mirroring.
- **Growth**: Every branch grows strictly to the left.

---

## 3. Vertical Layouts

Ideal for organizational charts, top-down hierarchies, or flow-based planning.

### Top-to-Bottom
- **Goal**: Traditional org-chart style.
- **Growth**: The X-axis handles branch balancing (width centering), while the Y-axis increases for every depth level.

### Bottom-to-Top
- **Goal**: "Ideation Root" or "Bottom-Up" logic.
- **Growth**: Equivalent to T-B, but the Y-axis decreases for each new depth level.

---

## 4. Spacing Rules (Fixed Minimums)

To maintain high visual quality, the following constraints are strictly enforced:
- **Sibling Gap**: Minimum of **20px** between siblings.
- **Parent-Child Gap**: Minimum of **80px** (default 160px for clarity).
- **Depth Consistency**: Same-depth siblings share consistent spacing relative to their subtree heights.
